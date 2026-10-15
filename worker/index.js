// Cloudflare Workers 로 배포할 때의 진입점.
// /api 는 functions/api.js 와 같은 코드로 처리하고, 나머지는 빌드된 사이트(dist)를 그대로 보여 줍니다.
import { handle } from '../functions/api.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname === '/api/') return handle(request, env);
    return env.ASSETS.fetch(request);
  },
};
