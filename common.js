// 메인 화면(index.html)과 친구 등록 창(friend.html)이 같이 쓰는 코드
const OPT = {
  gender: ['남', '여'],
  region: ['서울', '경기', '인천', '부산', '대구', '대전', '광주'],
  religion: ['무교', '기독교', '천주교', '불교'],
  drink: ['안 마심', '가끔', '자주'],
  style: ['귀여운', '청순한', '시크한', '댄디한', '듬직한', '지적인', '활발한'],
  interests: ['운동', '등산', '여행', '영화', '음악', '독서', '게임', '요리', '카페', '사진', '반려동물', '맛집'],
  mbti: ['모름', 'ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ']
};

// 성향 질문: A/B 중 하나를 고른다. axis = 어느 성향을 재는 질문인지
const QUESTIONS = [
  { axis: 'energy', q: '주말 저녁, 더 끌리는 건?', a: '친구들과 약속', b: '집에서 혼자 쉬기' },
  { axis: 'energy', q: '소개팅 첫 만남에서 나는?', a: '먼저 말을 거는 편', b: '상대 얘기를 듣는 편' },
  { axis: 'plan', q: '여행 갈 때 나는?', a: '일정표를 미리 짠다', b: '가서 정한다' },
  { axis: 'plan', q: '데이트 장소는?', a: '미리 찾아서 예약', b: '그날 끌리는 곳' },
  { axis: 'contact', q: '연인과의 연락은?', a: '틈틈이 자주', b: '필요할 때만' },
  { axis: 'contact', q: '답장 속도는?', a: '바로바로', b: '여유 될 때' },
  { axis: 'conflict', q: '서운한 일이 생기면?', a: '바로 말한다', b: '생각을 정리하고 말한다' },
  { axis: 'conflict', q: '다툰 날은?', a: '그날 꼭 푼다', b: '시간을 두고 푼다' },
  { axis: 'sn', q: '대화할 때 더 재밌는 건?', a: '실제로 있었던 일', b: '상상·만약에 얘기' },
  { axis: 'tf', q: '친구가 고민 상담을 하면?', a: '해결책부터 말한다', b: '공감부터 해준다' }
];
// 연애 성향 4가지 (질문 2개씩, A를 고른 개수 0~2로 위치를 정한다)
const AXES = [
  { key: 'energy', name: '에너지', a: '외향', b: '내향' },
  { key: 'plan', name: '계획', a: '계획형', b: '즉흥형' },
  { key: 'contact', name: '연락', a: '연락 자주', b: '연락 적당히' },
  { key: 'conflict', name: '갈등 해결', a: '바로 대화', b: '시간 필요' }
];
const ansOf = (p, i) => { const c = (p.answers || '')[i]; return c === 'A' || c === 'B' ? c : null; };
function axisVal(p, key) {
  const idx = QUESTIONS.map((q, i) => q.axis === key ? i : -1).filter(i => i >= 0);
  if (idx.some(i => !ansOf(p, i))) return null;
  return idx.filter(i => ansOf(p, i) === 'A').length;
}
const axisLabel = (ax, v) => v === null ? '미응답' : v === 2 ? ax.a : v === 0 ? ax.b : '반반';
// MBTI: 직접 고른 값이 있으면 그것, '모름'이면 성향 질문으로 추정
function mbtiOf(p) {
  if (p.mbti && p.mbti !== '모름') return { type: p.mbti, est: false };
  const e = axisVal(p, 'energy'), j = axisVal(p, 'plan'), s = ansOf(p, 8), t = ansOf(p, 9);
  if (e === null || j === null || !s || !t) return null;
  const pick = (v, first, A, B) => v === 2 ? A : v === 0 ? B : (first === 'A' ? A : B);
  return { type: pick(e, ansOf(p, 0), 'E', 'I') + (s === 'A' ? 'S' : 'N') + (t === 'A' ? 'T' : 'F') + pick(j, ansOf(p, 2), 'J', 'P'), est: true };
}
// MBTI 궁합표 — 국내 커뮤니티에서 널리 공유되는 16×16 색깔 궁합표를 숫자로 옮김
// 5 천생연분(파랑) · 4 좋음(초록) · 3 괜찮음(연두) · 2 별로(노랑) · 1 최악(빨강)
const MBTI_ORDER = ['INFP','ENFP','INFJ','ENFJ','INTJ','ENTJ','INTP','ENTP','ISFP','ESFP','ISTP','ESTP','ISFJ','ESFJ','ISTJ','ESTJ'];
const MBTI_CHART = [
  '4445454411111111', // INFP
  '4454544411111111', // ENFP
  '4544444511111111', // INFJ
  '5444444451111111', // ENFJ
  '4544444533332222', // INTJ
  '5444445433333333', // ENTJ
  '4444454433332225', // INTP
  '4454544433332222', // ENTP
  '1115333322223535', // ISFP
  '1111333322225353', // ESFP
  '1111333322223535', // ISTP
  '1111333322225353', // ESTP
  '1111232235354444', // ISFJ
  '1111232253534444', // ESFJ
  '1111232235354444', // ISTJ
  '1111235253534444'  // ESTJ
];
const MBTI_LEVELS = { 5: { name: '천생연분', rate: 1, color: '#4f8cff' }, 4: { name: '좋음', rate: .75, color: '#3fb97a' },
  3: { name: '괜찮음', rate: .5, color: '#a8c94a' }, 2: { name: '별로', rate: .25, color: '#e5b93c' }, 1: { name: '최악', rate: 0, color: '#e5534b' } };
const mbtiLevel = (a, b) => +MBTI_CHART[MBTI_ORDER.indexOf(a)][MBTI_ORDER.indexOf(b)];

const mbtiText = p => { const m = mbtiOf(p); return m ? m.type + (m.est ? '(추정)' : '') : 'MBTI ?'; };
const traitText = p => AXES.map(ax => axisLabel(ax, axisVal(p, ax.key))).join(' · ');

// 가상 프로필 24명: 이름, 성별, 나이, 키, 지역, 종교, 흡연, 음주, 외모, 연봉(만원), 관심사, 소개
const SAMPLE = [
  ['김서연','여',25,163,'서울','무교',0,'가끔','귀여운',3500,'여행,영화,카페,사진','주말엔 카페 투어해요'],
  ['이지은','여',27,160,'서울','기독교',0,'안 마심','청순한',4200,'독서,카페,음악','책 추천 주고받아요'],
  ['박민지','여',24,167,'경기','무교',0,'자주','활발한',3000,'운동,맛집,여행','맛집 리스트 300개 보유'],
  ['최유나','여',29,158,'서울','불교',0,'가끔','지적인',5500,'독서,영화,요리','요리해주는 걸 좋아해요'],
  ['정하은','여',23,165,'인천','무교',1,'자주','시크한',2800,'게임,음악,맛집','롤 골드입니다'],
  ['강수빈','여',26,170,'서울','천주교',0,'가끔','청순한',4000,'여행,영화,카페','영화 보고 카페 가는 코스 좋아요'],
  ['조예린','여',31,162,'부산','무교',0,'가끔','지적인',6000,'여행,독서','바다 보러 자주 가요'],
  ['윤채원','여',22,156,'대구','무교',0,'안 마심','귀여운',2500,'반려동물,카페,사진','고양이 두 마리 집사'],
  ['장다현','여',28,168,'경기','기독교',0,'가끔','귀여운',3800,'영화,등산,맛집,여행','주말 등산 메이트 구해요'],
  ['임소희','여',25,172,'서울','무교',0,'자주','시크한',4500,'운동,여행','필라테스 3년차'],
  ['한가은','여',34,164,'서울','무교',0,'가끔','지적인',7000,'요리,여행,영화','와인 좋아해요'],
  ['오나연','여',27,161,'대전','불교',0,'가끔','청순한',3300,'사진,여행,카페','필름카메라로 찍어드려요'],
  ['서지아','여',26,159,'광주','무교',1,'가끔','활발한',3100,'영화,게임','공포영화 마니아'],
  ['신혜원','여',24,166,'서울','무교',0,'가끔','귀여운',3200,'영화,카페,반려동물','강아지 산책 같이 해요'],
  ['김도윤','남',27,178,'서울','무교',0,'가끔','댄디한',4500,'여행,영화,운동','여행 계획 짜는 게 취미'],
  ['이준호','남',29,182,'경기','기독교',1,'자주','듬직한',5200,'운동,등산','헬스 5년차'],
  ['박시우','남',25,174,'서울','무교',0,'가끔','지적인',3600,'독서,카페','조용한 카페 좋아해요'],
  ['최현우','남',31,180,'부산','불교',0,'자주','듬직한',6000,'게임,맛집','부산 맛집 가이드 가능'],
  ['정우진','남',26,176,'인천','천주교',0,'안 마심','댄디한',4000,'음악,사진,여행','기타 칩니다'],
  ['강민재','남',28,185,'서울','무교',1,'가끔','시크한',5000,'운동,맛집','농구 동호회'],
  ['조성민','남',24,172,'대구','무교',0,'가끔','활발한',2900,'게임,영화','마블 전편 정주행'],
  ['윤태현','남',30,179,'서울','기독교',0,'가끔','댄디한',5800,'등산,여행,요리','파스타 잘 만들어요'],
  ['장건우','남',33,177,'대전','무교',0,'자주','듬직한',6500,'요리,맛집','캠핑 요리 담당'],
  ['임재원','남',23,171,'광주','무교',0,'안 마심','귀여운',2600,'반려동물,게임','강아지랑 같이 살아요']
].map((a, i) => ({ id: 'p' + (i + 1), name: a[0], gender: a[1], age: a[2], height: a[3], region: a[4], religion: a[5],
  smoke: !!a[6], drink: a[7], style: a[8], income: a[9], interests: a[10].split(','), intro: a[11] }));

// 가상 프로필의 MBTI와 성향 질문 답 (10개, 위 QUESTIONS 순서)
[['ENFP','AABBAAAABB'],['INFJ','BBAABABABB'],['ESTP','AABBAAAAAA'],['INTJ','BBAABBBBBA'],['ISTP','BBBBBBBBAA'],
 ['ENFJ','AAAAAAABBB'],['INFP','BBBBABBBBB'],['ISFJ','BBAAAABBAB'],['ESFJ','AAAAAAAAAB'],['ESTJ','AAAABBAAAA'],
 ['ENTJ','AAAABBAABA'],['모름','BABAABBBBB'],['ENTP','AABBBBAABA'],['모름','ABAAAAABBB'],['ENFJ','AAAAABABBB'],
 ['ESTJ','AAAABBAAAA'],['INTP','BBBBBBBBBA'],['ISTP','BBBBBBABAA'],['INFP','BBBAABBBBB'],['ESTP','AABBBAAAAA'],
 ['ENFP','AABBAAAABB'],['ESFJ','AAAAAAAAAB'],['ISTJ','BBAABBBBAA'],['ISFP','BBBBAABBAB']
].forEach(([m, a], i) => { SAMPLE[i].mbti = m; SAMPLE[i].answers = a; });

// 가상 프로필의 '상대 쪽 이상형' (쌍방 매칭용): 여자는 동갑~연상, 남자는 연하~동갑을 조금 더 선호, 비흡연자는 흡연자 싫어함
SAMPLE.forEach(p => {
  p.prefAgeMin = p.gender === '여' ? p.age - 1 : p.age - 6;
  p.prefAgeMax = p.gender === '여' ? p.age + 6 : p.age + 1;
  p.prefNoSmoker = !p.smoke;
});

// 주선자가 추천 한마디를 남긴 가상 프로필 몇 명
[[5, '지민', '웃음 많고 배려심 깊은 친구예요. 영화 취향 진짜 잘 맞을 듯!'], [11, '현우', '사진 찍어주는 거 좋아해서 데이트 사진은 걱정 없어요'],
 [8, '소연', '등산 같이 가면 리드 잘해주는 든든한 친구'], [18, '태민', '조용한데 기타 치면 반전 매력 있어요']
].forEach(([i, mm, rec]) => { SAMPLE[i].matchmaker = mm; SAMPLE[i].recommend = rec; });

// 매칭 성사 후 보여줄 대화 시작 질문 (힌지의 프롬프트 아이디어)
const ICE = { 운동: '요즘 하는 운동 있어요? 같이 해볼래요?', 등산: '지금까지 가본 산 중에 제일 좋았던 곳은?', 여행: '다녀온 여행지 중 다시 가고 싶은 곳은?',
  영화: '인생 영화 하나만 꼽는다면?', 음악: '요즘 제일 많이 듣는 노래는?', 독서: '최근에 읽고 좋았던 책 추천해줄래요?', 게임: '요즘 하는 게임 있어요?',
  요리: '제일 자신 있는 요리는 뭐예요?', 카페: '아끼는 카페 하나만 알려줄래요?', 사진: '최근에 찍은 사진 중 마음에 드는 거 있어요?',
  반려동물: '키우는 아이 사진 보여줄 수 있어요?', 맛집: '최근 가본 맛집 중 최고는 어디였어요?' };

function defaults() {
  return {
    me: { name: '나', gender: '남', age: 26, height: 175, region: '서울', religion: '무교', smoke: false, drink: '가끔',
          style: '댄디한', income: 4000, interests: ['여행', '영화', '카페'], intro: '같이 영화 보러 가요',
          mbti: '모름', answers: 'AAAAABABBB' },
    S: { wantGender: '여', ageMin: 22, ageMax: 30, minHeight: 0, noSmoker: true, sameReligionOnly: false,
         prefHMin: 155, prefHMax: 170, prefStyles: ['귀여운', '청순한'], prefIncome: 3000,
         axisMode: { energy: 'same', plan: 'same', contact: 'same', conflict: 'same' },
         rankBy: 'mutual', matchCut: 60,
         w: { interest: 10, interestMax: 3, ageClose: 15, ageMid: 8, height: 15, style: 10, region: 10, religion: 10, drink: 5, income: 5,
              mbti: 20, rec: 5, ax_energy: 5, ax_plan: 5, ax_contact: 5, ax_conflict: 5 } },
    profiles: JSON.parse(JSON.stringify(SAMPLE)),
    likes: {}   // { 프로필id: 'like' | 'pass' }
  };
}

const KEY = 'sogaeting-matching-v5';
let st = null;
try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
if (!st || !st.profiles || !st.me || !st.S) st = defaults();
st.likes = st.likes || {};
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
// 다른 창에서 저장한 최신 상태를 다시 읽는다
function reload() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.profiles && s.me && s.S) { st = s; st.likes = st.likes || {}; } } catch (e) {} }

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- ① 프로필 폼 ---------- */
function formHTML(px) {
  const sel = (k, list) => `<select id="${px}-${k}">${list.map(o => `<option>${o}</option>`).join('')}</select>`;
  return `<div class="fs fs-basic"><div class="fields">
    <label>이름<input id="${px}-name" maxlength="10"></label>
    <label>성별${sel('gender', OPT.gender)}</label>
    <label>나이<input type="number" id="${px}-age" min="19" max="70"></label>
    <label>키(cm)<input type="number" id="${px}-height" min="130" max="220"></label>
    <label>지역${sel('region', OPT.region)}</label>
    <label>종교${sel('religion', OPT.religion)}</label>
    <label>흡연<select id="${px}-smoke"><option value="0">비흡연</option><option value="1">흡연</option></select></label>
    <label>음주${sel('drink', OPT.drink)}</label>
    <label>외모 스타일${sel('style', OPT.style)}</label>
    <label>연봉(만원)<input type="number" id="${px}-income" step="100" min="0"></label>
    <label>MBTI <span class="small">(모르면 '모름' → 질문으로 추정)</span>${sel('mbti', OPT.mbti)}</label>
  </div></div>
  <div class="fs fs-like"><div class="lbl">관심사</div>
  <div class="chips" id="${px}-interests">${OPT.interests.map(i => `<label class="chip"><input type="checkbox" value="${i}"><span>${i}</span></label>`).join('')}</div>
  <label class="full">한줄 소개<input id="${px}-intro" maxlength="40"></label></div>
  <div class="fs fs-q"><details class="qs" open><summary>성향 질문 10개 — 더 가까운 쪽을 고르세요</summary>
    ${QUESTIONS.map((q, i) => `<div class="qrow"><div class="qt">${i + 1}. ${q.q}</div><div class="chips">
      <label class="chip"><input type="radio" name="${px}-q${i}" value="A"><span>${q.a}</span></label>
      <label class="chip"><input type="radio" name="${px}-q${i}" value="B"><span>${q.b}</span></label></div></div>`).join('')}
  </details></div>
  ${px === 'me' ? '' : `
  <div class="lbl" style="margin-top:14px">친구가 원하는 상대 <span class="small">(쌍방 매칭: 상대도 나를 좋아할지 계산)</span></div>
  <div class="fields">
    <label>원하는 나이 (최소)<input type="number" id="${px}-prefAgeMin"></label>
    <label>원하는 나이 (최대)<input type="number" id="${px}-prefAgeMax"></label>
    <label>흡연자는?<select id="${px}-prefNoSmoker"><option value="1">싫어함</option><option value="0">상관없음</option></select></label>
    <label>주선자 (내 이름)<input id="${px}-matchmaker" maxlength="10"></label>
  </div>
  <label class="full">주선자 추천 한마디<input id="${px}-recommend" maxlength="60" placeholder="예) 리액션 최고, 같이 있으면 편한 친구예요"></label>`}`;
}
const readAnswers = px => QUESTIONS.map((_, i) => document.querySelector(`input[name="${px}-q${i}"]:checked`)?.value || '-').join('');
function readForm(px) {
  const v = k => $(px + '-' + k).value;
  return { name: v('name').trim(), gender: v('gender'), age: +v('age'), height: +v('height'), region: v('region'),
    religion: v('religion'), smoke: v('smoke') === '1', drink: v('drink'), style: v('style'), income: +v('income') || 0,
    interests: [...document.querySelectorAll(`#${px}-interests input:checked`)].map(x => x.value), intro: v('intro').trim(),
    mbti: v('mbti'), answers: readAnswers(px),
    ...($(px + '-prefAgeMin') ? { prefAgeMin: +v('prefAgeMin') || 0, prefAgeMax: +v('prefAgeMax') || 99, prefNoSmoker: v('prefNoSmoker') === '1',
      matchmaker: v('matchmaker').trim(), recommend: v('recommend').trim() } : {}) };
}
function fillForm(px, p) {
  for (const k of ['name', 'gender', 'age', 'height', 'region', 'religion', 'drink', 'style', 'income', 'intro']) $(px + '-' + k).value = p[k] ?? '';
  $(px + '-mbti').value = p.mbti || '모름';
  if ($(px + '-prefAgeMin')) {
    for (const k of ['prefAgeMin', 'prefAgeMax', 'matchmaker', 'recommend']) $(px + '-' + k).value = p[k] ?? '';
    $(px + '-prefNoSmoker').value = p.prefNoSmoker === false ? '0' : '1';
  }
  QUESTIONS.forEach((_, i) => document.querySelectorAll(`input[name="${px}-q${i}"]`).forEach(r => r.checked = (p.answers || '')[i] === r.value));
  $(px + '-smoke').value = p.smoke ? '1' : '0';
  document.querySelectorAll(`#${px}-interests input`).forEach(c => c.checked = (p.interests || []).includes(c.value));
}
