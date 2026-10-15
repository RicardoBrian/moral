import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseStudentId, checkText, countChars } from '../src/lib/validate.js';
import { initScores, applyEffects, averageScore, isHonorary } from '../src/lib/score.js';
import { seededShuffle } from '../src/lib/rand.js';
import { normalizeSet, validateSet, countMissingTranslations, blankSet } from '../src/data/setModel.js';
import { DEFAULT_SET } from '../src/data/defaultSet.js';
import { STRINGS } from '../src/i18n/strings.js';

test('학번 30215 → 3학년 2반 15번', () => {
  assert.deepEqual(parseStudentId('30215'), { ok: true, id: '30215', grade: 3, classNo: 2, number: 15 });
  assert.equal(parseStudentId('3021').error, 'format');
  assert.equal(parseStudentId('3a215').error, 'format');
  assert.equal(parseStudentId('00215').error, 'range');
  assert.equal(parseStudentId('70215').error, 'range');
  assert.equal(parseStudentId('30015').error, 'range');
  assert.equal(parseStudentId('30200').error, 'range');
});

test('성의 없는 답 걸러내기', () => {
  assert.equal(checkText('ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', 15).ok, false);
  assert.equal(checkText('ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', 15).code, 'repeat');
  assert.equal(checkText('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄱㄴ', 15).code, 'jamo');
  assert.equal(checkText('가나가나가나가나가나가나가나가나', 15).code, 'repeat');
  assert.equal(checkText('짧아요', 15).code, 'short');
  assert.equal(checkText('일회용 컵 대신 텀블러를 쓰겠습니다.', 15).ok, true);
  assert.equal(checkText('I will bring my own bottle to school every day.', 35).ok, true);
  assert.equal(checkText('我会自带水杯，减少一次性用品。', 10).ok, true);
  assert.equal(checkText('Я буду беречь воду и выключать свет.', 20).ok, true);
  assert.equal(checkText('환경을 위해서요', 5).ok, true);
  assert.equal(countChars('a b  c'), 3);
});

test('점수: 0~100 사이로 제한, 평균과 명예 등급', () => {
  const set = normalizeSet(DEFAULT_SET);
  let s = initScores(set);
  assert.deepEqual(s, { eco: 50, solidarity: 50, peace: 50 });
  s = applyEffects(s, { eco: 80, solidarity: -80 }, set);
  assert.deepEqual(s, { eco: 100, solidarity: 0, peace: 50 });
  assert.equal(averageScore(s, set), 50);
  assert.equal(isHonorary({ eco: 70, solidarity: 70, peace: 70 }, set), true);
  assert.equal(isHonorary({ eco: 70, solidarity: 69, peace: 69 }, set), false, '평균 69.3 → 69 → 예비');
});

test('선택지 섞기: 같은 학생·같은 문제면 항상 같은 순서, 학생마다 다양', () => {
  const items = ['a', 'b', 'c', 'd'];
  assert.deepEqual(seededShuffle(items, '30215:d1'), seededShuffle(items, '30215:d1'));
  const orders = new Set();
  for (let i = 10101; i < 10140; i++) orders.add(seededShuffle(['A', 'B'], `${i}:d1-1`).join(''));
  assert.equal(orders.size, 2, 'A가 먼저인 학생과 B가 먼저인 학생이 모두 있어야 함');
});

test('기본 문제집은 완성되어 있고 번역이 모두 채워져 있다', () => {
  const set = normalizeSet(DEFAULT_SET);
  assert.deepEqual(validateSet(set), []);
  assert.equal(countMissingTranslations(set), 0);
  assert.equal(set.stages.length, 3);
  assert.deepEqual(set.stages.map((s) => s.dilemmas.length), [3, 2, 2]);
});

test('새 문제집 틀은 기본 구조(3스테이지 · 딜레마 3/2/2 · 선택지 2개)', () => {
  const b = blankSet(DEFAULT_SET.axes);
  assert.deepEqual(b.stages.map((s) => s.dilemmas.length), [3, 2, 2]);
  assert.ok(b.stages.every((s) => s.dilemmas.every((d) => d.choices.length === 2)));
  assert.ok(validateSet(b).length > 0, '빈 문제집은 수업에 쓸 수 없음');
});

test('normalizeSet 은 망가진 데이터도 안전한 모양으로 바꾼다', () => {
  const n = normalizeSet({ stages: [{ dilemmas: [{ choices: [{ effects: { eco: 999 } }, null] }] }], axes: [] });
  assert.equal(n.axes.length, 1);
  assert.equal(n.stages[0].dilemmas[0].choices.length, 1);
  assert.equal(n.stages[0].dilemmas[0].choices[0].effects.eco, 50);
  assert.equal(n.stages[0].mood, 'pensive');
  assert.deepEqual(normalizeSet(null).stages, []);
});

test('화면 문구: 소스에서 쓰는 모든 키가 4개 언어에 있다', () => {
  const keys = new Set();
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'teacher') walk(p); return; }
    if (!/\.jsx?$/.test(e.name)) return;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
    for (const m of src.matchAll(/\bt\(\s*`([a-z]+)\.\$\{/g)) keys.add(`${m[1]}.*`);
  });
  walk(new URL('../src', import.meta.url).pathname);
  const langs = Object.keys(STRINGS);
  assert.deepEqual(langs, ['ko', 'en', 'zh', 'ru']);
  for (const k of keys) {
    if (k.endsWith('.*')) continue;
    for (const l of langs) assert.ok(STRINGS[l][k], `${l} 에 "${k}" 문구가 없어요`);
  }
  // 언어마다 같은 키 집합
  const ko = Object.keys(STRINGS.ko).sort();
  for (const l of langs) assert.deepEqual(Object.keys(STRINGS[l]).sort(), ko, `${l} 키 목록이 한국어와 달라요`);
  // 변수 이름도 같아야 함
  for (const k of ko) {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const l of langs) assert.equal(vars(STRINGS[l][k]), vars(STRINGS.ko[k]), `${l}.${k} 의 {변수}가 달라요`);
  }
});
