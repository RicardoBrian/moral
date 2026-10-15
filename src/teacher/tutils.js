export function fmtDate(iso, withTime = true) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  const base = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return withTime ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

export function studentLink(code) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?code=${encodeURIComponent(code)}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

export function downloadFile(name, content, type = 'application/json') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'untitled';
}

export const API_ERRORS = {
  NETWORK: '서버에 연결하지 못했어요. 인터넷 연결이나 서버 주소(config.json)를 확인해 주세요.',
  TIMEOUT: '서버 응답이 너무 늦어요. 잠시 후 다시 시도해 주세요.',
  BAD_RESPONSE: 'Apps Script 응답을 읽지 못했어요. 웹 앱 배포의 액세스 권한이 ‘모든 사용자’인지 확인해 주세요.',
  UNAUTHORIZED: '비밀번호가 맞지 않아요.',
  NOT_FOUND: '찾을 수 없어요. 이미 삭제되었을 수 있어요.',
  SET_IN_USE: '진행 중인 수업에서 사용 중인 문제집이에요. 수업을 먼저 종료해 주세요.',
  LOCAL_NO_TRANSLATE: '자동 번역은 Google Apps Script 서버를 연결한 뒤에 쓸 수 있어요.',
  STORAGE_FULL: '브라우저 저장 공간이 가득 찼어요.',
  INVALID: '입력값이 올바르지 않아요.',
  BUSY: '서버가 바빠요. 잠시 후 다시 시도해 주세요.',
  SETUP_REQUIRED: '서버 초기 설정이 필요해요. Apps Script 에서 setup 함수를 먼저 실행해 주세요.',
  FORBIDDEN: 'Apps Script 가 요청을 거절했어요. Cloudflare 의 GAS_KEY 가 setup 로그에 나온 연결 키와 같은지 확인해 주세요.',
  NOT_CONFIGURED: 'Cloudflare 설정(GAS_URL · GAS_KEY · ADMIN_PASSWORD)이 아직 비어 있어요.',
  UPSTREAM_UNREACHABLE: 'Apps Script 에 연결하지 못했어요. Cloudflare 의 GAS_URL 주소를 확인해 주세요.',
};

export function errorText(e) {
  const code = e && e.code;
  return API_ERRORS[code] || (e && e.message && e.message !== code ? e.message : '문제가 생겼어요. 잠시 후 다시 시도해 주세요.') + (code && !API_ERRORS[code] ? ` (${code})` : '');
}
