// Google Apps Script 웹 앱과 통신합니다.
// Content-Type 을 text/plain 으로 보내야 브라우저의 CORS 사전 요청이 생기지 않습니다.
import { normalizeSet } from '../data/setModel.js';
import { DEFAULT_SET } from '../data/defaultSet.js';
import { sessionGet } from '../lib/storage.js';
import { ApiError } from './errors.js';

export const ADMIN_KEY = 'mt.adminPw';

async function post(url, body, { timeout = 30000, retries = 0 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new ApiError('BAD_RESPONSE');
      }
      if (!data || data.ok !== true) throw new ApiError((data && data.error) || 'SERVER_ERROR', data && data.message);
      return data.result;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e instanceof ApiError ? e : new ApiError(e && e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
      // 서버가 명확히 거절한 경우(코드 없음, 비밀번호 틀림 등)는 다시 시도하지 않습니다.
      const retryable = ['NETWORK', 'TIMEOUT', 'BAD_RESPONSE', 'BUSY'].includes(lastErr.code);
      if (!retryable || attempt === retries) break;
      await new Promise((r) => setTimeout(r, 1200 * Math.pow(2, attempt) + Math.random() * 800));
    }
  }
  throw lastErr;
}

export function createRemoteApi(url) {
  const call = (action, data, opts) => post(url, { action, ...data }, opts);
  const admin = (action, data, opts) => call(action, { ...data, password: sessionGet(ADMIN_KEY) || '' }, opts);

  return {
    mode: 'remote',

    async getSession(code) {
      const r = await call('getSession', { code }, { retries: 2 });
      return { session: r.session, set: normalizeSet(r.set) };
    },
    checkin: (p) => call('checkin', p, { timeout: 15000 }),
    submit: (payload) => call('submit', { payload }, { timeout: 90000, retries: 2 }),

    login: (password) => call('login', { password }),
    // 서버에 문제집이 하나도 없으면(처음 설치) 기본 문제집을 올려 둡니다.
    listSets: async () => {
      const list = await admin('listSets');
      if (list.length) return list;
      await admin('saveSet', { set: DEFAULT_SET });
      return admin('listSets');
    },
    getSet: async (id) => normalizeSet(await admin('getSet', { id })),
    saveSet: async (set) => normalizeSet(await admin('saveSet', { set })),
    deleteSet: (id) => admin('deleteSet', { id }),
    translateSet: async (set, onlyMissing) => {
      const r = await admin('translateSet', { set, onlyMissing }, { timeout: 330000 });
      return { set: normalizeSet(r.set), partial: !!r.partial, total: r.total, done: r.done };
    },
    listSessions: () => admin('listSessions'),
    createSession: (data) => admin('createSession', data),
    updateSession: (code, patch) => admin('updateSession', { code, patch }),
    deleteSession: (code) => admin('deleteSession', { code }),
    dashboard: (code) => admin('dashboard', { code }, { timeout: 45000 }),
    listSubmissions: () => admin('listSubmissions', {}, { timeout: 60000 }),
  };
}
