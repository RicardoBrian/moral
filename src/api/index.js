import { createLocalApi } from './local.js';
import { createRemoteApi } from './remote.js';

/**
 * 서버 주소 정하기
 *  1. public/config.json 의 apiUrl 이 있으면 그 주소를 씁니다. (직접 지정할 때만)
 *  2. 없으면 이 사이트의 /api (Cloudflare Pages Function) 가 설정되어 있는지 확인해 그 주소를 씁니다.
 *  3. 둘 다 없으면 로컬 체험 모드로 동작합니다.
 */
export async function loadConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    if (res.ok) {
      const c = await res.json();
      const url = typeof c.apiUrl === 'string' ? c.apiUrl.trim() : '';
      if (url) return { apiUrl: url };
    }
  } catch (e) { /* 설정 파일이 없으면 다음 단계로 */ }
  try {
    const res = await fetch('./api', { cache: 'no-store' });
    if (res.ok) {
      const d = await res.json();
      if (d && d.ok && d.result && d.result.configured) return { apiUrl: './api' };
    }
  } catch (e) { /* /api 가 없으면(개발 서버 등) 로컬 모드 */ }
  return { apiUrl: '' };
}

export function createApi(config) {
  return config.apiUrl ? createRemoteApi(config.apiUrl) : createLocalApi();
}

export { ApiError } from './errors.js';
