import test from 'node:test';
import assert from 'node:assert/strict';
import { createGas } from './gas-mock.js';
import { DEFAULT_SET } from '../src/data/defaultSet.js';
import { normalizeSet } from '../src/data/setModel.js';
import { buildPayload } from '../src/student/submission.js';

// Cloudflare 가 붙여 주는 값(연결 키, 관리자 확인 표시)을 흉내 냅니다.
function setupServer() {
  const g = createGas();
  g.ctx.setup();
  const key = g.props.GAS_KEY;
  const raw = g.post;
  g.post = (body) => raw({ key, ...body });
  g.raw = raw;
  const admin = (action, data = {}) => g.post({ action, admin: true, ...data });
  return { g, key, admin };
}

function playAll(set, pick) {
  const answers = {};
  set.stages.forEach((st) => st.dilemmas.forEach((d) => { answers[d.id] = { choiceId: d.choices[pick(d)].id, reason: '이유를 이렇게 적었어요 정말로' }; }));
  const reflections = {};
  set.stages.forEach((st) => { reflections[st.id] = '앞으로 텀블러를 챙겨 다니고 아껴 쓰겠습니다.'; });
  return { answers, reflections };
}

function makePayload(session, set, studentId, name, lang = 'ko', extra = {}) {
  const { answers, reflections } = playAll(set, (d) => d.choices.length - 1);
  const game = {
    studentId, grade: Number(studentId[0]), classNo: Number(studentId.slice(1, 3)), number: Number(studentId.slice(3)),
    name, nickname: '별', answers, reflections, startedAt: new Date().toISOString(), submissionId: `sub_${studentId}_${Math.random()}`, ...extra,
  };
  if (lang === 'ru') {
    Object.values(game.answers).forEach((a) => { a.reason = 'Потому что это важно для всех людей'; });
  }
  const scores = {};
  set.axes.forEach((a) => { scores[a.id] = 80; });
  return buildPayload({ session, set, game, scores, lang });
}

test('setup 이 폴더·DB·비밀번호를 만든다', () => {
  const { g } = setupServer();
  assert.ok(g.props.ROOT_ID && g.props.DB_ID && g.props.SETS_ID);
  assert.equal(g.props.GAS_KEY.length, 40);
  assert.equal(g.props.ADMIN_PASSWORD, undefined, '비밀번호는 Apps Script 에 두지 않음');
  // 두 번 실행해도 같은 폴더를 재사용
  const root = g.props.ROOT_ID;
  g.ctx.setup();
  assert.equal(g.props.ROOT_ID, root);
});

test('setup 전에는 SETUP_REQUIRED', () => {
  const g = createGas();
  const r = g.post({ action: 'getSession', code: 'X' });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'SETUP_REQUIRED');
});

test('연결 키가 없거나 틀리면 거절, 관리자 표시 없으면 관리자 기능 거절', () => {
  const { g, admin, key } = setupServer();
  assert.equal(g.raw({ action: 'getSession', code: 'X' }).error, 'FORBIDDEN');
  assert.equal(g.raw({ action: 'listSets', admin: true, key: 'x'.repeat(40) }).error, 'FORBIDDEN');
  assert.equal(g.raw({ action: 'listSets', admin: true, key: key.slice(1) }).error, 'FORBIDDEN');
  assert.equal(g.post({ action: 'listSets' }).error, 'UNAUTHORIZED');
  assert.equal(admin('listSets').ok, true);
  assert.equal(g.post({ action: 'nope' }).error, 'UNKNOWN_ACTION');
});

test('문제집 저장·목록·조회·수업 생성·입장·종료 흐름', () => {
  const { g, admin } = setupServer();
  assert.deepEqual(admin('listSets').result, []);
  const saved = admin('saveSet', { set: DEFAULT_SET }).result;
  assert.ok(saved.updatedAt);
  const list = admin('listSets').result;
  assert.equal(list.length, 1);
  assert.equal(list[0].dilemmas, 7);
  assert.equal(admin('getSet', { id: DEFAULT_SET.id }).result.stages.length, 3);

  assert.equal(admin('createSession', { setId: 'nope', label: 'x' }).error, 'NOT_FOUND');
  const sess = admin('createSession', { setId: DEFAULT_SET.id, label: '1차시', bgm: false }).result;
  assert.match(sess.code, /^[A-Z2-9]{5}$/);

  const got = g.post({ action: 'getSession', code: sess.code.toLowerCase() });
  assert.equal(got.ok, true);
  assert.equal(got.result.session.bgm, false);
  assert.equal(got.result.session.active, true);
  assert.equal(typeof got.result.session.createdAt, 'string', 'createdAt 이 날짜 객체로 바뀌면 안 됨');
  assert.equal(got.result.set.title.ko, DEFAULT_SET.title.ko);

  assert.equal(g.post({ action: 'getSession', code: 'ZZZZZ' }).error, 'NOT_FOUND');
  assert.equal(admin('deleteSet', { id: DEFAULT_SET.id }).error, 'SET_IN_USE');

  admin('updateSession', { code: sess.code, patch: { active: false, label: '=HYPERLINK("x")' } });
  assert.equal(g.post({ action: 'getSession', code: sess.code }).error, 'CLOSED');
  const sessions = admin('listSessions').result;
  assert.equal(sessions[0].label, '=HYPERLINK("x")', '수식으로 실행되지 않고 글자 그대로');
  assert.equal(admin('deleteSet', { id: DEFAULT_SET.id }).ok, true);
  assert.equal(admin('listSets').result.length, 0);
  admin('deleteSession', { code: sess.code });
  assert.equal(admin('listSessions').result.length, 0);
});

test('결과 제출: PDF·반 폴더·요약 시트·중복 방지·번역', () => {
  const { g, admin } = setupServer();
  admin('saveSet', { set: DEFAULT_SET });
  const sess = admin('createSession', { setId: DEFAULT_SET.id, label: '1차시' }).result;
  const set = normalizeSet(DEFAULT_SET);

  const p1 = makePayload(sess, set, '30215', '홍길동');
  const r1 = g.post({ action: 'submit', payload: p1 });
  assert.equal(r1.ok, true, JSON.stringify(r1));
  assert.match(r1.result.fileName, /^30215_홍길동_미래를 구하는 세계시민_1차시_\d{4}-\d{2}-\d{2}\.pdf$/);

  // 같은 submissionId 재전송 → 파일이 새로 생기지 않음
  const again = g.post({ action: 'submit', payload: p1 });
  assert.equal(again.result.duplicate, true);
  assert.equal(again.result.fileName, r1.result.fileName);

  // 같은 학생의 두 번째 제출 → _2
  const p2 = makePayload(sess, set, '30215', '홍길동');
  assert.match(g.post({ action: 'submit', payload: p2 }).result.fileName, /_2\.pdf$/);

  // 다른 반 학생 (러시아어)
  const p3 = makePayload(sess, set, '30307', 'Иван', 'ru');
  assert.equal(g.post({ action: 'submit', payload: p3 }).ok, true);

  // 폴더 구조 확인
  const root = g.folders.get(g.props.ROOT_ID);
  const setFolder = [...g.folders.values()].find((f) => f.parent === root && f.name === '미래를 구하는 세계시민_1차시');
  assert.ok(setFolder, '문제집_차시 폴더');
  const class2 = [...g.folders.values()].find((f) => f.parent === setFolder && f.name === '3학년 2반');
  const class3 = [...g.folders.values()].find((f) => f.parent === setFolder && f.name === '3학년 3반');
  assert.ok(class2 && class3, '반별 폴더');
  const class2Files = class2.children().map((f) => f.name).sort();
  assert.equal(class2Files.filter((n) => n.endsWith('.pdf')).length, 2);
  assert.ok(class2Files.includes('미래를 구하는 세계시민_1차시_3학년 2반_요약'));

  // 요약 시트: 학번이 숫자로 바뀌지 않고, 러시아어 이유는 한국어 번역 + 원문
  const ss3 = [...g.spreadsheets.values()].find((s) => s.name === '미래를 구하는 세계시민_1차시_3학년 3반_요약');
  const [header, row] = ss3.sheets[0].data;
  assert.equal(row[header.indexOf('학번')], '30307');
  assert.equal(row[header.indexOf('언어')], '러시아어');
  assert.equal(row[header.indexOf('1-1 이유')], '[ko] Потому что это важно для всех людей');
  assert.equal(row[header.indexOf('1-1 이유(원문)')], 'Потому что это важно для всех людей');
  assert.ok(header.includes('환경') && header.includes('종합') && header.includes('성찰3') && header.includes('PDF'));

  // 현황판
  g.post({ action: 'checkin', code: sess.code, studentId: '30401', name: '김철수', nickname: '철', step: 'start' });
  assert.equal(g.post({ action: 'checkin', code: sess.code, studentId: 'abc' }).error, 'INVALID');
  const dash = admin('dashboard', { code: sess.code }).result;
  assert.equal(dash.submissions.length, 3);
  assert.equal(dash.progress.length, 1);
  assert.equal(dash.progress[0].studentId, '30401');
  const ru = dash.submissions.find((s) => s.studentId === '30307');
  assert.equal(ru.answers[0].reasonKo, '[ko] Потому что это важно для всех людей');
  assert.equal(ru.reflections[0].textKo, ru.reflections[0].text, '한국어 성찰은 번역하지 않음');
  assert.equal(typeof ru.submittedAt, 'string');
  assert.ok(ru.pdfUrl.startsWith('https://drive/file/'));

  // 결과 탭: 모든 수업의 제출물, 최신순, 수업을 지워도 남음
  const all = admin('listSubmissions').result;
  assert.equal(all.length, 3);
  assert.ok(String(all[0].submittedAt) >= String(all[2].submittedAt));
  assert.equal(all[0].setTitle, '미래를 구하는 세계시민');
  admin('deleteSession', { code: sess.code });
  assert.equal(admin('listSubmissions').result.length, 3);
  assert.equal(g.post({ action: 'listSubmissions' }).error, 'UNAUTHORIZED', '관리자 표시 없이는 결과를 볼 수 없음');
});

test('종료된 수업·삭제된 수업에도 늦은 제출은 받아 준다 (결과 유실 방지)', () => {
  const { g, admin } = setupServer();
  admin('saveSet', { set: DEFAULT_SET });
  const sess = admin('createSession', { setId: DEFAULT_SET.id, label: '2차시' }).result;
  admin('updateSession', { code: sess.code, patch: { active: false } });
  const set = normalizeSet(DEFAULT_SET);
  assert.equal(g.post({ action: 'submit', payload: makePayload(sess, set, '10101', '이영희') }).ok, true);
  admin('deleteSession', { code: sess.code });
  assert.equal(g.post({ action: 'submit', payload: makePayload(sess, set, '10102', '박민수') }).ok, true);
});

test('잘못된 제출은 거부', () => {
  const { g } = setupServer();
  assert.equal(g.post({ action: 'submit', payload: { studentId: '123' } }).error, 'INVALID');
  assert.equal(g.post({ action: 'submit' }).error, 'INVALID');
});

test('자동 번역: 빈 칸만 / 전체', () => {
  const { g, admin } = setupServer();
  const set = normalizeSet(DEFAULT_SET);
  set.title.en = '';
  set.stages[0].dilemmas[0].title.ru = '';
  const r = admin('translateSet', { set, onlyMissing: true }).result;
  assert.equal(r.total, 2);
  assert.equal(r.done, 2);
  assert.equal(r.set.title.en, `[en] ${DEFAULT_SET.title.ko}`);
  assert.equal(r.set.stages[0].dilemmas[0].title.ru, `[ru] ${DEFAULT_SET.stages[0].dilemmas[0].title.ko}`);
  assert.equal(r.set.title.zh, DEFAULT_SET.title.zh, '이미 있는 번역은 그대로');
  const all = admin('translateSet', { set, onlyMissing: false }).result;
  assert.equal(all.set.title.zh, `[zh-CN] ${DEFAULT_SET.title.ko}`);
  assert.ok(all.total > 200);
});
