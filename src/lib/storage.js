// localStorage 는 사생활 보호 모드 등에서 예외를 던질 수 있어 모두 감쌉니다.
export function loadJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (e) { /* ignore */ }
}

export function sessionGet(key) {
  try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
}

export function sessionSet(key, value) {
  try {
    if (value == null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch (e) { /* ignore */ }
}
