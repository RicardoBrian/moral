const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const BASE = 'http://localhost:4173/';
const SIZES = [['tablet', 768, 1024], ['tabletL', 1024, 768], ['pc', 1440, 900]];

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [label, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
    const shot = async (n) => { await page.waitForTimeout(450); await page.screenshot({ path: `${SHOTS}/r-${label}-${n}.png` }); };
    // 가로 스크롤이 생기면 안 됨
    const noHScroll = async (where) => {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) errors.push(`${label} ${where}: 가로 스크롤 ${over}px`);
    };
    await page.goto(`${BASE}?code=DEMO`);
    await page.fill('#entry-sid', '30215');
    await page.fill('#entry-name', '홍길동');
    await shot('1-entry'); await noHScroll('entry');
    await page.getByRole('button', { name: '입장하기' }).click();
    await page.getByRole('button', { name: '네, 맞아요' }).click();
    await page.fill('#nick', '별빛');
    await shot('2-customize'); await noHScroll('customize');
    await page.getByRole('button', { name: '이 모습으로 출발하기' }).click();
    await shot('3-intro');
    await page.getByRole('button', { name: '건너뛰기' }).click();
    await page.getByRole('button', { name: '상황 살펴보기' }).click({ timeout: 5000 });
    await page.locator('.choice').first().click();
    await page.fill('textarea', '모두에게 도움이 되니까요');
    await shot('4-dilemma'); await noHScroll('dilemma');
    await page.getByRole('button', { name: '이 선택으로 결정하기' }).click();
    await shot('5-feedback');
    // 팝업(설정) 확인
    await page.getByRole('button', { name: '설정' }).click();
    await shot('6-settings');
    await page.getByRole('button', { name: '닫기' }).click();
    // 교사 화면
    await page.goto(`${BASE}#/teacher`);
    await page.getByText('새 수업 열기').waitFor();
    await shot('7-teacher'); await noHScroll('teacher');
    await page.goto(`${BASE}#/teacher/sets`);
    await page.getByRole('button', { name: '편집' }).first().click();
    await page.getByText('편집할 언어').waitFor();
    await page.getByText('스테이지 1 · 환경과 기후 위기').scrollIntoViewIfNeeded();
    await shot('8-editor'); await noHScroll('editor');
    await ctx.close();
  }
  // 휴대폰 교사 화면
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}#/teacher`);
  await page.getByText('새 수업 열기').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/r-phone-teacher.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) errors.push(`phone teacher: 가로 스크롤 ${over}px`);
  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '오류 없음');
})().catch((e) => { console.error('FAILED:', e.message.split('\n')[0]); process.exit(1); });
