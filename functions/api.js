// Cloudflare Pages Function: 사이트의 /api 주소
//
// 하는 일
//  1. 교사 비밀번호를 Cloudflare 비밀키 ADMIN_PASSWORD 와 비교합니다. (비밀번호는 Cloudflare 에만 있음)
//  2. 확인된 요청만 Google Apps Script(GAS_URL)로 전달하고, 이때 연결 키 GAS_KEY 를 붙입니다.
//     Apps Script 는 연결 키가 맞는 요청만 처리하므로, 누가 주소를 알아내도 직접 호출할 수 없습니다.
//
// Cloudflare Pages → Settings → Variables and Secrets 에 넣을 값
//  - GAS_URL         Apps Script 웹 앱 주소 (…/exec)
//  - GAS_KEY         Apps Script setup 실행 로그에 나온 연결 키  (Secret 으로)
//  - ADMIN_PASSWORD  교사 화면 비밀번호                          (Secret 으로)

const PUBLIC_ACTIONS = new Set(['getSession', 'checkin', 'submit']);
const ADMIN_ACTIONS = new Set([
  'login', 'listSets', 'getSet', 'saveSet', 'deleteSet', 'translateSet',
  'listSessions', 'createSession', 'updateSession', 'deleteSession', 'dashboard', 'listSubmissions',
]);
const MAX_BODY = 2 * 1024 * 1024;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const fail = (error, status = 200) => json({ ok: false, error }, status);

/** 글자 하나하나 비교 시간을 같게 해서, 응답 시간으로 비밀번호를 짐작하지 못하게 합니다. */
export function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a ?? ''));
  const y = enc.encode(String(b ?? ''));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function isConfigured(env) {
  return !!(env && env.GAS_URL && env.GAS_KEY && env.ADMIN_PASSWORD);
}

async function forward(env, body, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
  } catch (e) {
    return fail('UPSTREAM_UNREACHABLE');
  }
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return json(data);
  } catch (e) {
    // Apps Script 가 로그인 화면(HTML)을 돌려주면 배포 권한 설정이 잘못된 경우입니다.
    return fail('BAD_RESPONSE');
  }
}

export async function handle(request, env, fetchImpl = fetch) {
  if (request.method === 'GET') {
    return json({ ok: true, result: { service: 'moral-timeline', configured: isConfigured(env) } });
  }
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!isConfigured(env)) return fail('NOT_CONFIGURED');

  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return fail('TOO_LARGE', 413);
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return fail('TOO_LARGE', 413);
    body = JSON.parse(text);
  } catch (e) {
    return fail('INVALID', 400);
  }
  if (!body || typeof body !== 'object') return fail('INVALID', 400);

  const action = String(body.action || '');
  const { password, key, admin, ...rest } = body; // 브라우저가 보낸 key/admin 은 믿지 않고 버립니다.

  if (PUBLIC_ACTIONS.has(action)) {
    return forward(env, { ...rest, action, key: env.GAS_KEY }, fetchImpl);
  }
  if (ADMIN_ACTIONS.has(action)) {
    if (!safeEqual(password, env.ADMIN_PASSWORD)) {
      await new Promise((r) => setTimeout(r, 700)); // 비밀번호 무작위 대입을 늦춥니다.
      return fail('UNAUTHORIZED');
    }
    if (action === 'login') return json({ ok: true, result: { ok: true } });
    return forward(env, { ...rest, action, key: env.GAS_KEY, admin: true }, fetchImpl);
  }
  return fail('UNKNOWN_ACTION', 400);
}

export const onRequest = (context) => handle(context.request, context.env);
