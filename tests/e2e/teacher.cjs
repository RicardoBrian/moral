const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const BASE = 'http://localhost:4173/';

async function quickPlay(page, code, sid, name) {
  await page.goto(`${BASE}?code=${code}`);
  await page.fill('#entry-sid', sid);
  await page.fill('#entry-name', name);
  await page.getByRole('button', { name: '입장하기' }).click();
  await page.getByRole('button', { name: '네, 맞아요' }).click();
  await page.fill('#nick', '별');
  await page.getByRole('button', { name: '이 모습으로 출발하기' }).click();
  await page.getByRole('button', { name: '건너뛰기' }).click();
  for (const n of [3, 2, 2]) {
    await page.getByRole('button', { name: '상황 살펴보기' }).click({ timeout: 5000 });
    for (let d = 0; d < n; d++) {
      await page.locator('.choice').first().click();
      await page.fill('textarea', '친구들과 함께 살기 위해서');
      await page.getByRole('button', { name: '이 선택으로 결정하기' }).click();
      await page.getByRole('button', { name: d < n - 1 ? '다음 딜레마' : '성찰 쓰러 가기' }).click();
    }
    await page.fill('textarea', '앞으로 다른 사람의 입장을 먼저 생각하겠습니다.');
    await page.locator('.bottom-cta .btn-primary').click();
  }
  await page.getByText('체험 모드라서 이 기기에만 저장했어요.').waitFor({ timeout: 8000 });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('dialog', (d) => d.accept());
  const step = (s) => console.log('▶', s);

  step('수업 목록');
  await page.goto(`${BASE}#/teacher`);
  await page.getByText('새 수업 열기').waitFor();
  await page.getByText('DEMO').first().waitFor();
  await page.fill('#new-label', '1차시');
  await page.getByRole('button', { name: '수업 코드 만들기' }).click();
  await page.getByText('학생들에게 이 코드를 알려 주세요').waitFor();
  const code = (await page.locator('.t-bigcode-code').textContent()).trim();
  console.log('새 수업 코드', code);
  await page.screenshot({ path: `${SHOTS}/t1-bigcode.png` });
  await page.getByRole('button', { name: '닫기' }).click();
  await page.screenshot({ path: `${SHOTS}/t2-sessions.png` });

  step('학생 2명 진행 (다른 반)');
  const sp = await ctx.newPage();
  sp.on('pageerror', (e) => errors.push(`student pageerror: ${e.message}`));
  await quickPlay(sp, code, '30215', '홍길동');
  await sp.evaluate(() => localStorage.removeItem('mt.game'));
  await quickPlay(sp, code, '30301', '김영희');
  await sp.close();

  step('현황판');
  await page.goto(`${BASE}#/teacher/dash/${code}`);
  await page.getByText('제출 완료').first().waitFor();
  await page.getByRole('cell', { name: '홍길동' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/t3-dash.png` });
  await page.getByRole('radio', { name: '3학년 3반' }).click();
  if (await page.getByRole('cell', { name: '홍길동' }).count()) throw new Error('반 필터가 동작하지 않음');
  await page.getByRole('radio', { name: '전체' }).click();
  await page.getByRole('radio', { name: '선택 분포' }).click();
  await page.getByText('2명 · 100%').first().waitFor();
  await page.locator('.t-bar-head').first().click();
  await page.getByText('친구들과 함께 살기 위해서').first().waitFor();
  await page.screenshot({ path: `${SHOTS}/t4-dist.png` });
  await page.getByRole('radio', { name: '성찰 모아보기' }).click();
  await page.getByText('앞으로 다른 사람의 입장을').first().waitFor();

  step('현황판에서 학생 결과 상세 보기');
  await page.getByRole('radio', { name: '학생 현황' }).click();
  await page.getByRole('cell', { name: '홍길동' }).click();
  const panel = page.getByRole('dialog', { name: '홍길동 학생 결과' });
  await panel.waitFor();
  await panel.getByText('친구들과 함께 살기 위해서').first().waitFor();
  await panel.getByText('앞으로 다른 사람의 입장을 먼저 생각하겠습니다.').first().waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/t8-result-panel.png` });
  await page.getByRole('button', { name: '다음 학생' }).click();
  await page.getByRole('dialog', { name: '김영희 학생 결과' }).waitFor();
  await page.keyboard.press('Escape');
  if (await page.getByRole('dialog').count()) throw new Error('Esc 로 닫히지 않음');

  step('결과 탭');
  await page.goto(`${BASE}#/teacher/results`);
  await page.getByText('결과 보기').first().waitFor();
  const before = await page.locator('.t-table-click tbody tr').count();
  await page.fill('input[placeholder="예) 홍길동, 30215"]', '김영희');
  const after = await page.locator('.t-table-click tbody tr').count();
  if (!(before >= 2 && after === 1)) throw new Error(`검색 결과 이상: ${before} → ${after}`);
  await page.locator('.t-table-click tbody tr').first().click();
  await page.getByRole('dialog', { name: '김영희 학생 결과' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/t9-results.png` });
  await page.getByRole('button', { name: '닫기' }).click();

  step('문제집 편집');
  await page.goto(`${BASE}#/teacher/sets`);
  await page.getByRole('button', { name: '편집' }).first().click();
  await page.getByText('편집할 언어').waitFor();
  const title = page.getByRole('textbox', { name: '문제집 제목' });
  await title.fill('미래를 구하는 세계시민 (수정)');
  await page.getByText('저장 안 됨').waitFor();
  await page.getByRole('radio', { name: 'English' }).click();
  await page.getByText('미래를 구하는 세계시민 (수정)').first().waitFor();
  await page.getByRole('radio', { name: '한국어' }).click();
  await page.getByText('스테이지 1 · 환경과 기후 위기').waitFor();
  await page.screenshot({ path: `${SHOTS}/t5-editor.png` });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByText('저장했어요.').waitFor();

  step('미리보기');
  await page.getByRole('button', { name: '미리보기' }).click();
  await page.getByText('미리보기 중').waitFor();
  await page.getByText('시간 여행자를 꾸며 주세요').waitFor();
  await page.getByRole('button', { name: '미리보기 끝내기' }).click();
  await page.getByRole('button', { name: '새 문제집' }).waitFor();

  step('빈 새 문제집 → 저장은 되지만 수업 열기는 막힘');
  await page.getByRole('button', { name: '새 문제집' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/t6-newset.png` });
  await page.getByText('비어 있는 필수 항목').waitFor({ timeout: 5000 });
  await page.getByRole('textbox', { name: '문제집 제목' }).fill('작성 중인 문제집');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByText(/저장했어요\. 수업에 쓰려면/).waitFor();
  await page.goto(`${BASE}#/teacher`);
  await page.getByText('새 수업 열기').waitFor();
  await page.locator('#new-set option', { hasText: '작성 중인 문제집' }).waitFor({ state: 'attached' });
  const opts = await page.locator('#new-set option').allTextContents();
  console.log('options', opts);
  await page.selectOption('#new-set', { label: opts.find((o) => o.includes('작성 중인 문제집')) });
  await page.getByRole('button', { name: '수업 코드 만들기' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/t7-blocked.png` });
  await page.getByText(/비어 있는 항목이 \d+개 있어요/).waitFor({ timeout: 5000 });

  step('사용 안내');
  await page.goto(`${BASE}#/teacher/help`);
  await page.getByText('구글 드라이브 · Cloudflare 연결하기').waitFor();

  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
  else console.log('콘솔 오류 없음');
  await browser.close();
})().catch(async (e) => { console.error('FAILED:', e.message.split('\n').slice(0,3).join(' / ')); process.exit(1); });
