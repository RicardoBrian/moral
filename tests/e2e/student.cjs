const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const BASE = 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false });
  const step = (s) => console.log('▶', s);

  await page.goto(BASE);
  await page.getByRole('button', { name: '입장하기' }).waitFor();
  await shot('01-entry');

  step('빈 값으로 입장 → 오류 표시');
  await page.getByRole('button', { name: '입장하기' }).click();
  await page.getByText('학번은 숫자 5자리로 입력해 주세요').waitFor();
  await page.getByText('이름을 입력해 주세요.', { exact: true }).waitFor();

  step('없는 코드 → 오류');
  await page.fill('#entry-code', 'WRONG');
  await page.fill('#entry-sid', '30215');
  await page.fill('#entry-name', '홍길동');
  await page.getByRole('button', { name: '입장하기' }).click();
  await page.getByText('수업 코드를 찾을 수 없어요').waitFor();

  step('DEMO 로 입장 → 확인 시트');
  await page.fill('#entry-code', 'demo');
  await page.getByRole('button', { name: '입장하기' }).click();
  await page.getByText('3학년 2반 15번').waitFor();
  await shot('02-confirm');
  await page.getByRole('button', { name: '네, 맞아요' }).click();

  step('캐릭터 꾸미기');
  await page.getByText('시간 여행자를 꾸며 주세요').waitFor();
  await page.getByRole('button', { name: '이 모습으로 출발하기' }).click();
  await page.getByText('닉네임을 입력해 주세요.', { exact: true }).waitFor();
  await page.fill('#nick', '별빛 수호자');
  await page.getByRole('radio', { name: '포니테일' }).click();
  await page.getByRole('radio', { name: '퓨전 한복' }).click();
  await shot('03-customize');
  await page.getByRole('button', { name: '이 모습으로 출발하기' }).click();

  step('프롤로그');
  await page.getByText('드디어 만났군요').waitFor();
  await shot('04-intro');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '시간 여행 시작' }).click();
  await page.getByText('시간을 건너는 중').waitFor();
  await shot('05-warp');

  let dilemmaShot = false;
  for (let stage = 0; stage < 3; stage++) {
    step(`스테이지 ${stage + 1} 소개`);
    await page.getByRole('button', { name: '상황 살펴보기' }).waitFor({ timeout: 5000 });
    if (stage === 0) await shot('06-stage-intro');
    await page.getByRole('button', { name: '상황 살펴보기' }).click();
    const counts = [3, 2, 2];
    for (let d = 0; d < counts[stage]; d++) {
      await page.getByText('나라면 어떻게 할까요?').waitFor();
      const decide = page.getByRole('button', { name: '이 선택으로 결정하기' });
      if (!(await decide.isDisabled())) throw new Error('선택 전인데 결정 버튼이 눌림');
      // 도움말 열기
      if (stage === 0 && d === 0) {
        await page.getByRole('button', { name: '생각 도움말' }).click();
        await page.getByText('이렇게 생각해 보세요').waitFor();
      }
      // 두 번째 스테이지는 이기적인 선택(효과 합이 음수)을 골라 보기
      const choices = page.locator('.choice');
      const n = await choices.count();
      if (n < 2) throw new Error('선택지가 2개 미만');
      await choices.nth(stage === 1 ? 0 : n - 1).click();
      // 성의 없는 답은 막혀야 함
      await page.fill('textarea', 'ㅋㅋㅋㅋㅋㅋㅋ');
      if (!(await decide.isDisabled())) throw new Error('ㅋㅋㅋ 인데 결정 가능');
      await page.getByText('같은 글자를 반복하지 말고').waitFor();
      await page.fill('textarea', '모두에게 도움이 되니까요');
      if (await decide.isDisabled()) throw new Error('이유를 썼는데 결정 불가');
      if (!dilemmaShot) { await shot('07-dilemma'); dilemmaShot = true; }
      await decide.click();
      await page.locator('.outcome').waitFor();
      if (stage === 0 && d === 0) await shot('08-feedback');
      const next = d < counts[stage] - 1 ? '다음 딜레마' : '성찰 쓰러 가기';
      await page.getByRole('button', { name: next }).click();
    }
    step(`스테이지 ${stage + 1} 성찰`);
    await page.getByText('이번 스테이지에서 내가 한 선택').waitFor();
    if (stage === 0) {
      await shot('09-reflection');
      // 새로고침해도 이어 하기
      await page.fill('textarea', '앞으로 일회용 컵 대신 텀블러를');
      await page.waitForTimeout(200);
      await page.reload();
      await page.getByText('하던 곳부터 이어서 할까요?').waitFor();
      await page.getByRole('button', { name: '이어서 하기' }).click();
      await page.getByText('이번 스테이지에서 내가 한 선택').waitFor();
      const v = await page.inputValue('textarea');
      if (!v.includes('텀블러')) throw new Error('작성 중이던 성찰이 사라짐');
    }
    if (stage === 1) {
      step('러시아어로 바꿔서 성찰 쓰기');
      await page.getByRole('radio', { name: 'Русский' }).click();
      await page.getByText('Мой выбор на этом этапе').waitFor();
      await shot('10-reflection-ru');
      await page.fill('textarea', 'Я буду покупать товары справедливой торговли.');
      await page.getByRole('button', { name: 'Сохранить и перейти дальше' }).click();
      await page.getByRole('radio', { name: '한국어' }).click();
    } else {
      await page.fill('textarea', '앞으로 일회용 컵 대신 텀블러를 챙겨 다니겠습니다.');
      const label = stage === 2 ? '저장하고 결과 보기' : '저장하고 다음 장면으로';
      await page.getByRole('button', { name: label }).click();
    }
  }

  step('결과');
  await page.locator('.total-score').waitFor();
  await page.getByText('체험 모드라서 이 기기에만 저장했어요.').waitFor({ timeout: 8000 });
  await shot('11-result');
  await page.getByRole('button', { name: '증명서 받기' }).click();
  await page.getByText('나의 실천 약속').waitFor();
  await shot('12-certificate');
  await page.screenshot({ path: `${SHOTS}/12b-certificate-full.png`, fullPage: true });

  step('설정 시트');
  await page.getByRole('button', { name: '설정' }).click();
  await page.getByText('글자 크기').waitFor();
  await page.getByRole('radio', { name: '크게', exact: true }).click();
  await shot('13-settings');
  await page.getByRole('button', { name: '닫기' }).click();

  step('처음으로');
  await page.getByRole('button', { name: '처음으로' }).click();
  await page.getByRole('button', { name: '처음으로 가기' }).click();
  await page.getByRole('button', { name: '입장하기' }).waitFor();
  const code = await page.inputValue('#entry-code');
  if (code !== 'DEMO') throw new Error('수업 코드가 기억되지 않음');

  const subs = await page.evaluate(() => JSON.parse(localStorage.getItem('mt.local.submissions') || '[]'));
  if (subs.length !== 1) throw new Error(`제출 기록 ${subs.length}개`);
  const s = subs[0];
  if (s.answers.length !== 7 || s.reflections.length !== 3) throw new Error('제출 내용 부족');
  console.log('제출:', s.studentId, s.name, s.nickname, 'total', s.total, 'honorary', s.honorary, 'lang', s.lang);
  console.log('scores', JSON.stringify(s.scores));

  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
  else console.log('콘솔 오류 없음');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
