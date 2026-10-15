import { createLocalApi } from './local.js';
import { createRemoteApi } from './remote.js';

export async function loadConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    if (res.ok) {
      const c = await res.json();
      return { apiUrl: typeof c.apiUrl === 'string' ? c.apiUrl.trim() : '' };
    }
  } catch (e) { /* 설정 파일이 없으면 로컬 모드 */ }
  return { apiUrl: '' };
}

export function createApi(config) {
  return config.apiUrl ? createRemoteApi(config.apiUrl) : createLocalApi();
}

export { ApiError } from './errors.js';
