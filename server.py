"""소개팅 매칭 로직 — 파이썬 백엔드

화면(index.html 등)을 그대로 서빙하고, 매칭 이유·대화 질문만 AI로 만들어 준다.
AI는 .env의 LLM 값으로 고른다.
  LLM=claude  → Claude API (ANTHROPIC_API_KEY 필요, 사용량만큼 과금)
  LLM=ollama  → 내 PC의 Ollama 모델 (무료, Modelfile로 만든 sogaeting-ai)
API 키는 브라우저에 두지 않고 이 서버의 .env 파일에서만 읽는다.

실행:  python server.py   →  http://localhost:8766
"""
import json
import os
import threading
import urllib.error
import urllib.request
from pathlib import Path

import anthropic
from flask import Flask, abort, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parent
PUBLIC = {"index.html", "friend.html", "common.js", "common.css"}   # 브라우저에 보여줄 파일만 (server.py, .env는 제외)


def load_env():
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
LLM = os.environ.get("LLM", "claude").lower()
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "sogaeting-ai")
MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-5-5")
# 거절(refusal) 시 서버가 다른 모델로 자동 재시도 — 이 기능을 지원하는 모델에서만 켠다
FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
HAS_KEY = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
client = anthropic.Anthropic(timeout=60.0) if HAS_KEY else None

SYSTEM = """너는 소개팅 주선자야. 소개팅 앱 '이유있는 설렘'에서 사용자가 정한 이상형 기준의 점수 결과를 보고, 따뜻하고 구체적인 한국어로 말해.
- 점수표에 있는 사실(겹치는 관심사, MBTI, 성향, 나이 차 등)만 근거로 써. 없는 정보를 지어내지 마.
- 외모·연봉·종교를 깎아내리는 표현은 쓰지 마.
- 반말 말고 부드러운 존댓말로."""

app = Flask(__name__)


@app.get("/")
def home():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:name>")
def static_file(name):
    if name not in PUBLIC:
        abort(404)
    return send_from_directory(ROOT, name)


def ollama_up():
    try:
        with urllib.request.urlopen(OLLAMA_URL + "/api/tags", timeout=2) as r:
            names = [m["name"] for m in json.load(r).get("models", [])]
        return OLLAMA_MODEL in names or OLLAMA_MODEL + ":latest" in names
    except (urllib.error.URLError, OSError, ValueError):
        return False


@app.get("/api/status")
def status():
    if LLM == "ollama":
        return jsonify(ai=ollama_up(), provider="ollama", model=OLLAMA_MODEL)
    return jsonify(ai=HAS_KEY, provider="claude", model=MODEL)


def ask_ollama(prompt, schema):
    """내 PC의 Ollama 모델에게 JSON 스키마대로 답을 받아 dict로 돌려준다."""
    body = json.dumps({
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],   # 역할·규칙은 Modelfile의 SYSTEM에 들어 있다
        "format": schema,
        "stream": False,
        "keep_alive": "30m",   # 한 번 올린 모델을 30분간 메모리에 두어 다음 답이 빨라진다
    }).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL + "/api/chat", data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:   # CPU로 돌면 느려서 넉넉하게
            return json.loads(json.load(r)["message"]["content"])
    except urllib.error.HTTPError as e:
        raise ValueError(f"Ollama 오류 ({e.code}) — 'ollama create {OLLAMA_MODEL} -f Modelfile'을 했는지 확인해 주세요")
    except (urllib.error.URLError, TimeoutError):
        raise ValueError("Ollama에 연결할 수 없어요. Ollama 앱이 켜져 있는지 확인해 주세요")


def warm_up():
    body = json.dumps({"model": OLLAMA_MODEL, "keep_alive": "30m"}).encode("utf-8")
    try:
        urllib.request.urlopen(urllib.request.Request(OLLAMA_URL + "/api/generate", data=body), timeout=120).read()
        print("Ollama 모델을 미리 올려 뒀어요")
    except (urllib.error.URLError, OSError):
        pass


def ask_json(prompt, schema):
    """Claude에게 JSON 스키마대로 답을 받아 dict로 돌려준다."""
    if LLM == "ollama":
        return ask_ollama(prompt, schema)
    extra = {}
    if MODEL in FALLBACK_MODELS:
        extra = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
    resp = client.beta.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM,
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": schema}},
        messages=[{"role": "user", "content": prompt}],
        **extra,
    )
    if resp.stop_reason == "refusal":
        raise ValueError("AI가 이 요청에 답하지 않았어요")
    text = next((b.text for b in resp.content if b.type == "text"), "")
    return json.loads(text)


def run(fn):
    if LLM != "ollama" and not client:
        return jsonify(error="서버에 ANTHROPIC_API_KEY가 없어요. .env 파일을 확인해 주세요."), 503
    try:
        return jsonify(fn(request.get_json(force=True)))
    except anthropic.AuthenticationError:
        return jsonify(error="API 키가 올바르지 않아요"), 401
    except anthropic.RateLimitError:
        return jsonify(error="요청이 너무 많아요. 잠시 후 다시 시도해 주세요"), 429
    except anthropic.APIStatusError as e:
        return jsonify(error=f"Claude API 오류 ({e.status_code})"), 502
    except anthropic.APIConnectionError:
        return jsonify(error="Claude API에 연결할 수 없어요"), 502
    except ValueError as e:
        return jsonify(error=str(e)), 502


@app.post("/api/explain")
def explain():
    def go(d):
        prompt = f"""아래는 내 매칭 로직이 고른 상대와 그 점수표야. 이 사람이 왜 나와 잘 맞는지 설명해 줘.

[나] {json.dumps(d.get("me"), ensure_ascii=False)}
[상대 ({d.get("rank", 1)}위)] {json.dumps(d.get("partner"), ensure_ascii=False)}
[내가 상대를 보는 점수표] {json.dumps(d.get("items"), ensure_ascii=False)}
[상대가 나를 보는 점수표] {json.dumps(d.get("their"), ensure_ascii=False)}
[서로 맞는 정도] {d.get("mutual")}%
[2위와 비교] {json.dumps(d.get("second"), ensure_ascii=False)}

summary: 한두 문장 요약. points: 잘 맞는 이유 3개(각 한 문장). caution: 서로 다를 수 있는 점 한 문장."""
        return ask_json(prompt, {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "points": {"type": "array", "items": {"type": "string"}},
                "caution": {"type": "string"},
            },
            "required": ["summary", "points", "caution"],
            "additionalProperties": False,
        })
    return run(go)


@app.post("/api/intro")
def intro():
    """오늘의 소개 카드: 잘 맞는 쪽은 '왜 잘 맞는지', 안 맞는 쪽은 '왜 안 맞는지 + 그래도 통할 점'"""
    def go(d):
        best = d.get("kind") != "worst"
        task = ("이 사람이 왜 나와 잘 맞는지 소개해 줘. intro: 2~3문장으로 설레게. plus: 첫 데이트로 어울릴 만한 것 한 문장."
                if best else
                "내 로직에서 이 사람의 점수가 왜 낮은지 부드럽게 설명해 줘. intro: 2~3문장, 상대를 깎아내리지 말고. plus: 그래도 통할 수 있는 점 한 문장.")
        prompt = f"""소개팅 앱의 '오늘의 소개' 카드에 넣을 주선자 멘트를 써 줘. {task}

[나] {json.dumps(d.get("me"), ensure_ascii=False)}
[상대 (내 로직 {d.get("rank")}위)] {json.dumps(d.get("partner"), ensure_ascii=False)}
[내가 상대를 보는 점수표] {json.dumps(d.get("items"), ensure_ascii=False)}
[상대가 나를 보는 점수표] {json.dumps(d.get("their"), ensure_ascii=False)}
[서로 맞는 정도] {d.get("mutual")}%"""
        return ask_json(prompt, {
            "type": "object",
            "properties": {"intro": {"type": "string"}, "plus": {"type": "string"}},
            "required": ["intro", "plus"],
            "additionalProperties": False,
        })
    return run(go)


@app.post("/api/icebreakers")
def icebreakers():
    def go(d):
        prompt = f"""매칭이 성사됐어. 내가 상대에게 보낼 첫 메시지 3개를 추천해 줘.
겹치는 관심사·성향·MBTI·자기소개를 활용하고, 부담 없고 대답하기 쉬운 질문으로. 각 메시지는 40자 안팎.

[나] {json.dumps(d.get("me"), ensure_ascii=False)}
[상대] {json.dumps(d.get("partner"), ensure_ascii=False)}"""
        return ask_json(prompt, {
            "type": "object",
            "properties": {"questions": {"type": "array", "items": {"type": "string"}}},
            "required": ["questions"],
            "additionalProperties": False,
        })
    return run(go)


if __name__ == "__main__":
    if LLM == "ollama":
        ready = ollama_up()
        print(f"AI: Ollama {OLLAMA_MODEL} ({OLLAMA_URL}) · {'준비됨' if ready else '연결 안 됨 — Ollama 앱과 모델 등록 확인'}")
        if ready:   # 첫 요청이 느리지 않게 서버가 켜질 때 모델을 미리 메모리에 올려 둔다
            threading.Thread(target=warm_up, daemon=True).start()
    else:
        print(f"AI: Claude {MODEL} · API 키: {'있음' if HAS_KEY else '없음 (.env에 ANTHROPIC_API_KEY 넣기)'}")
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 8766)), debug=False)
