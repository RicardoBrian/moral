// Cloudflare 중간 서버(functions/api.js) → Apps Script(가짜 구글 환경) 전체 경로 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, safeEqual } from '../functions/api.js';
import { createGas } from './gas-mock.js';
import { DEFAULT_SET } from '../src/data/defaultSet.js';

function setup(envOverride = {}) {
  const g = createGas();
  g.ctx.setup();
  const sent = [];
  // Apps Script 웹 앱 흉내: Worker 가 보낸 요청을 doPost 로 전달
  const fetchImpl = async (url, init) => {
    assert.equal(url, 'https://script.google.com/macros/s/TEST/exec');
    const body = JSON.parse(init.body);
    sent.push(body);
    return new Response(JSON.stringify(g.post(body)));
  };
  const env = { GAS_URL: 'https://script.google.com/macros/s/TEST/exec', GAS_KEY: g.props.GAS_KEY, ADMIN_PASSWORD: '선생님-비밀번호!', ...envOverride };
  const call = async (body, method = 'POST') => {
    const req = method === 'GET'
      ? new Request('https://site.pages.dev/api')
      : new Request('https://site.pages.dev/api', { method: 'POST', body: JSON.stringify(body) });
    return (await handle(req, env, fetchImpl)).json();
  };
  return { g, env, call, sent };
}

test('비밀번호 비교', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual(undefined, 'a'), false);
  assert.equal(safeEqual('비밀', '비밀'), true);
});

test('GET /api: 설정 여부만 알려 줌 (비밀값은 노출하지 않음)', async () => {
  const { call } = setup();
  const r = await call(null, 'GET');
  assert.deepEqual(r, { ok: true, result: { service: 'moral-timeline', configured: true } });
  const { call: call2 } = setup({ ADMIN_PASSWORD: '' });
  assert.equal((await call2(null, 'GET')).result.configured, false);
  assert.equal((await call2({ action: 'getSession' })).error, 'NOT_CONFIGURED');
});

test('관리자: 비밀번호가 Cloudflare 비밀키와 같아야 함', async () => {
  const { call, sent } = setup();
  assert.equal((await call({ action: 'login', password: '틀림' })).error, 'UNAUTHORIZED');
  assert.equal((await call({ action: 'listSets' })).error, 'UNAUTHORIZED');
  assert.equal(sent.length, 0, '틀린 비밀번호는 Apps Script 까지 가지 않음');
  assert.equal((await call({ action: 'login', password: '선생님-비밀번호!' })).ok, true);
  assert.equal(sent.length, 0, '로그인은 Cloudflare 에서 끝남');
  const r = await call({ action: 'saveSet', password: '선생님-비밀번호!', set: DEFAULT_SET });
  assert.equal(r.ok, true);
  assert.equal(sent[0].password, undefined, '비밀번호는 Apps Script 로 보내지 않음');
  assert.equal(sent[0].admin, true);
});

test('학생이 key/admin 을 끼워 넣어도 무시됨', async () => {
  const { call, sent } = setup();
  const r = await call({ action: 'listSets', admin: true, key: 'hack' });
  assert.equal(r.error, 'UNAUTHORIZED');
  await call({ action: 'getSession', code: 'ZZZZZ', admin: true, key: 'hack' });
  assert.equal(sent[0].admin, undefined);
  assert.notEqual(sent[0].key, 'hack');
});

test('전체 흐름: 수업 만들기 → 학생 입장 → 제출 → 결과 보기', async () => {
  const { call } = setup();
  const pw = '선생님-비밀번호!';
  await call({ action: 'saveSet', password: pw, set: DEFAULT_SET });
  const sess = (await call({ action: 'createSession', password: pw, setId: DEFAULT_SET.id, label: '1차시' })).result;
  const got = await call({ action: 'getSession', code: sess.code });
  assert.equal(got.ok, true);
  const payload = {
    submissionId: 'sub_1', code: sess.code, setTitle: '미래를 구하는 세계시민', studentId: '30215', grade: 3, classNo: 2, number: 15,
    name: '홍길동', nickname: '별', lang: 'ko', axes: [{ id: 'eco', name: '환경', score: 80 }], total: 80, honorary: true,
    answers: [{ stageIndex: 0, dilemmaIndex: 0, dilemmaId: 'd1-1', dilemmaTitle: '바다', choiceId: 'c2', choiceText: '규제', reason: '바다를 지키려고' }],
    reflections: [{ stageIndex: 0, stageId: 's1', stageTitle: '환경', text: '텀블러를 쓰겠습니다.' }],
  };
  assert.equal((await call({ action: 'submit', payload })).ok, true);
  const list = (await call({ action: 'listSubmissions', password: pw })).result;
  assert.equal(list.length, 1);
  assert.equal(list[0].name, '홍길동');
  assert.equal((await call({ action: 'listSubmissions' })).error, 'UNAUTHORIZED');
});

test('잘못된 요청', async () => {
  const { call, env } = setup();
  assert.equal((await call({ action: 'deleteEverything', password: env.ADMIN_PASSWORD })).error, 'UNKNOWN_ACTION');
  const bad = await handle(new Request('https://x/api', { method: 'POST', body: '{not json' }), env, () => {});
  assert.equal((await bad.json()).error, 'INVALID');
  const put = await handle(new Request('https://x/api', { method: 'PUT', body: '{}' }), env, () => {});
  assert.equal(put.status, 405);
});

test('Apps Script 가 HTML(로그인 화면)을 돌려주면 BAD_RESPONSE', async () => {
  const env = { GAS_URL: 'https://g', GAS_KEY: 'k', ADMIN_PASSWORD: 'p' };
  const res = await handle(new Request('https://x/api', { method: 'POST', body: JSON.stringify({ action: 'getSession', code: 'A' }) }), env, async () => new Response('<html>Sign in</html>'));
  assert.equal((await res.json()).error, 'BAD_RESPONSE');
  const down = await handle(new Request('https://x/api', { method: 'POST', body: JSON.stringify({ action: 'getSession', code: 'A' }) }), env, async () => { throw new Error('down'); });
  assert.equal((await down.json()).error, 'UPSTREAM_UNREACHABLE');
});
