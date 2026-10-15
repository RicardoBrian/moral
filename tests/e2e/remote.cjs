// Cloudflare(/api) 연결 모드 전체 흐름. wrangler pages dev 와 가짜 Apps Script 를 띄운 뒤 실행합니다.
// BASE=http://127.0.0.1:8788/ ADMIN_PASSWORD=... node tests/e2e/remote.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8788/';
const PW = process.env.ADMIN_PASSWORD;
const SHOTS = process.env.SHOTS || require('os').tmpdir();

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const step = (s) => console.log('▶', s);

  step('교사 로그인: 틀린 비밀번호 → 거절');
  await page.goto(`${BASE}#/teacher`);
  await page.fill('#t-pw', 'wrong');
  await page.getByRole('button', { name: '들어가기' }).click();
  await page.getByText('비밀번호가 맞지 않아요.').waitFor({ timeout: 10000 });
  step('올바른 비밀번호');
  await page.fill('#t-pw', PW);
  await page.getByRole('button', { name: '들어가기' }).click();
  await page.getByText('구글 드라이브 연결됨').waitFor();
  await page.getByText('새 수업 열기').waitFor();
  // 처음엔 기본 문제집이 자동으로 올라감
  await page.locator('#new-set option', { hasText: '미래를 구하는 세계시민' }).waitFor({ state: 'attached', timeout: 15000 });
  await page.fill('#new-label', '1차시');
  await page.getByRole('button', { name: '수업 코드 만들기' }).click();
  const code = (await page.locator('.t-bigcode-code').textContent({ timeout: 15000 })).trim();
  console.log('수업 코드', code);

  step('학생 진행 (러시아어로)');
  const sp = await ctx.newPage();
  sp.on('pageerror', (e) => errors.push(`student: ${e.message}`));
  await sp.setViewportSize({ width: 390, height: 844 });
  await sp.goto(`${BASE}?code=${code}`);
  if (await sp.getByText('체험 모드예요').count()) throw new Error('연결 모드가 아니라 체험 모드로 열림');
  await sp.getByRole('radio', { name: 'Русский' }).click();
  await sp.fill('#entry-sid', '30215');
  await sp.fill('#entry-name', 'Иван');
  await sp.getByRole('button', { name: 'Войти' }).click();
  await sp.getByRole('button', { name: 'Да, это я' }).click();
  await sp.fill('#nick', 'Звезда');
  await sp.getByRole('button', { name: 'Отправиться в этом образе' }).click();
  await sp.getByRole('button', { name: 'Пропустить' }).click();
  for (const n of [3, 2, 2]) {
    await sp.getByRole('button', { name: 'Осмотреться' }).click({ timeout: 6000 });
    for (let d = 0; d < n; d++) {
      await sp.locator('.choice').first().click();
      await sp.fill('textarea', 'Потому что это важно для всех');
      await sp.getByRole('button', { name: 'Подтвердить выбор' }).click();
      await sp.getByRole('button', { name: d < n - 1 ? 'Следующая дилемма' : 'Написать размышление' }).click();
    }
    await sp.fill('textarea', 'Я буду беречь воду и помогать другим людям.');
    await sp.locator('.bottom-cta .btn-primary').click();
  }
  await sp.getByText('Отправлено учителю').waitFor({ timeout: 20000 });
  await sp.screenshot({ path: `${SHOTS}/remote-student-done.png` });

  step('교사: 현황판 → 결과 상세 (한국어 번역 + 원문)');
  await page.goto(`${BASE}#/teacher/dash/${code}`);
  await page.getByRole('cell', { name: 'Иван' }).click({ timeout: 15000 });
  const panel = page.getByRole('dialog', { name: 'Иван 학생 결과' });
  await panel.waitFor();
  await panel.getByText('[ko] Потому что это важно для всех').first().waitFor();
  await panel.getByText('원문 · Потому что это важно для всех').first().waitFor();
  await panel.getByRole('link', { name: '드라이브 PDF' }).waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/remote-result.png` });
  await page.keyboard.press('Escape');

  step('결과 탭');
  await page.goto(`${BASE}#/teacher/results`);
  await page.getByRole('cell', { name: 'Иван' }).waitFor({ timeout: 15000 });

  step('로그아웃 후 다시 잠김');
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.getByText('관리자 비밀번호').first().waitFor();

  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; } else console.log('콘솔 오류 없음');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message.split('\n').slice(0, 3).join(' / ')); process.exit(1); });
