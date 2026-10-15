import { LANGS, emptyText } from '../lib/localize.js';
import { randomId } from '../lib/rand.js';
import { DEFAULT_MIN } from '../lib/validate.js';
import { MOODS } from '../lib/audio.js';

export const LIMITS = {
  axes: [1, 4],
  stages: [1, 6],
  dilemmas: [1, 5],
  choices: [2, 4],
  prologue: [1, 10],
  effect: [-50, 50],
};

export const AXIS_COLORS = ['#15b886', '#ff9f00', '#3182f6', '#f04452', '#8b5cf6', '#00a6c8'];

const text = (v) => {
  const out = emptyText();
  if (typeof v === 'string') { out.ko = v; return out; }
  if (v && typeof v === 'object') LANGS.forEach((l) => { if (typeof v[l] === 'string') out[l] = v[l]; });
  return out;
};

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function blankChoice(axes) {
  const effects = {};
  axes.forEach((a) => { effects[a.id] = 0; });
  return { id: randomId('c'), text: emptyText(), effects, feedbackTitle: emptyText(), feedback: emptyText() };
}

export function blankDilemma(axes) {
  return {
    id: randomId('d'),
    title: emptyText(), context: emptyText(), hint: emptyText(), wizardLine: emptyText(),
    choices: [blankChoice(axes), blankChoice(axes)],
  };
}

export function blankStage(axes, dilemmaCount = 2, index = 0) {
  return {
    id: randomId('s'),
    title: emptyText(), year: emptyText(), place: emptyText(), description: emptyText(),
    mood: 'pensive',
    color: AXIS_COLORS[index % AXIS_COLORS.length],
    dilemmas: Array.from({ length: dilemmaCount }, () => blankDilemma(axes)),
    reflection: { title: emptyText(), guide: emptyText(), placeholder: emptyText() },
  };
}

/** 새 문제집: 기본 구조(3스테이지 · 딜레마 3/2/2개 · 선택지 2개)를 그대로 따릅니다. */
export function blankSet(baseAxes) {
  const axes = (baseAxes || []).map((a) => ({ ...a, name: text(a.name) }));
  return {
    id: randomId('set'),
    title: emptyText(),
    description: emptyText(),
    axes,
    startScore: 50,
    passScore: 70,
    minChars: JSON.parse(JSON.stringify(DEFAULT_MIN)),
    wizard: { name: text({ ko: '크로노스', en: 'Chronos', zh: '克罗诺斯', ru: 'Хронос' }), prologue: [emptyText()] },
    stages: [blankStage(axes, 3, 0), blankStage(axes, 2, 1), blankStage(axes, 2, 2)],
    updatedAt: null,
  };
}

/** 어떤 경로로 들어온 문제집이든 화면이 깨지지 않는 모양으로 맞춥니다. */
export function normalizeSet(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  let axes = Array.isArray(s.axes) ? s.axes.filter(Boolean).slice(0, LIMITS.axes[1]) : [];
  if (!axes.length) axes = [{ id: 'eco', name: text('환경'), color: AXIS_COLORS[0] }];
  axes = axes.map((a, i) => ({
    id: String(a.id || `axis${i + 1}`),
    name: text(a.name),
    color: typeof a.color === 'string' && a.color ? a.color : AXIS_COLORS[i % AXIS_COLORS.length],
  }));
  const minChars = { reflection: {}, reason: {} };
  ['reflection', 'reason'].forEach((k) => {
    LANGS.forEach((l) => {
      const v = s.minChars && s.minChars[k] && Number(s.minChars[k][l]);
      minChars[k][l] = v && v > 0 ? v : DEFAULT_MIN[k][l];
    });
  });
  const stages = (Array.isArray(s.stages) ? s.stages : []).filter(Boolean).map((st, si) => ({
    id: String(st.id || `s${si + 1}`),
    title: text(st.title),
    year: text(st.year),
    place: text(st.place),
    description: text(st.description),
    mood: MOODS[st.mood] ? st.mood : 'pensive',
    color: typeof st.color === 'string' && st.color ? st.color : AXIS_COLORS[si % AXIS_COLORS.length],
    dilemmas: (Array.isArray(st.dilemmas) ? st.dilemmas : []).filter(Boolean).map((d, di) => ({
      id: String(d.id || `d${si + 1}-${di + 1}`),
      title: text(d.title),
      context: text(d.context),
      hint: text(d.hint),
      wizardLine: text(d.wizardLine),
      choices: (Array.isArray(d.choices) ? d.choices : []).filter(Boolean).map((c, ci) => {
        const effects = {};
        axes.forEach((a) => {
          effects[a.id] = Math.max(LIMITS.effect[0], Math.min(LIMITS.effect[1], num(c.effects && c.effects[a.id], 0)));
        });
        return {
          id: String(c.id || `c${ci + 1}`),
          text: text(c.text),
          effects,
          feedbackTitle: text(c.feedbackTitle),
          feedback: text(c.feedback),
        };
      }),
    })),
    reflection: {
      title: text(st.reflection && st.reflection.title),
      guide: text(st.reflection && st.reflection.guide),
      placeholder: text(st.reflection && st.reflection.placeholder),
    },
  }));
  const prologue = (s.wizard && Array.isArray(s.wizard.prologue) ? s.wizard.prologue : []).map(text);
  return {
    id: String(s.id || randomId('set')),
    title: text(s.title),
    description: text(s.description),
    axes,
    startScore: Math.max(0, Math.min(100, num(s.startScore, 50))),
    passScore: Math.max(1, Math.min(100, num(s.passScore, 70))),
    minChars,
    wizard: { name: text(s.wizard && s.wizard.name), prologue },
    stages,
    updatedAt: s.updatedAt || null,
  };
}

/** 학생이 실제로 플레이할 수 있는 문제집인지 검사합니다. 문제가 있으면 한국어 오류 문장 목록을 돌려줍니다. */
export function validateSet(set) {
  const errs = [];
  const need = (field, where) => { if (!field || !String(field.ko || '').trim()) errs.push(`${where}: 한국어 내용을 입력해 주세요.`); };
  need(set.title, '문제집 제목');
  if (!set.axes.length) errs.push('점수 항목이 1개 이상 필요해요.');
  set.axes.forEach((a, i) => need(a.name, `점수 항목 ${i + 1}의 이름`));
  const ids = new Set();
  set.axes.forEach((a) => { if (ids.has(a.id)) errs.push(`점수 항목 ID "${a.id}"가 중복돼요.`); ids.add(a.id); });
  if (!set.stages.length) errs.push('스테이지가 1개 이상 필요해요.');
  set.stages.forEach((st, si) => {
    const sw = `스테이지 ${si + 1}`;
    need(st.title, `${sw} 제목`);
    if (!st.dilemmas.length) errs.push(`${sw}: 딜레마가 1개 이상 필요해요.`);
    st.dilemmas.forEach((d, di) => {
      const dw = `${sw} · 딜레마 ${di + 1}`;
      need(d.title, `${dw} 제목`);
      need(d.context, `${dw} 상황 설명`);
      if (d.choices.length < 2) errs.push(`${dw}: 선택지가 2개 이상 필요해요.`);
      d.choices.forEach((c, ci) => {
        need(c.text, `${dw} · 선택지 ${ci + 1}`);
        need(c.feedbackTitle, `${dw} · 선택지 ${ci + 1} 결과 제목`);
        need(c.feedback, `${dw} · 선택지 ${ci + 1} 결과 설명`);
      });
    });
    need(st.reflection.guide, `${sw} 성찰 질문`);
  });
  return errs;
}

/** 번역이 비어 있는 칸 수 (한국어는 있는데 다른 언어가 빈 칸) */
export function countMissingTranslations(set) {
  let missing = 0;
  walkTexts(set, (field) => {
    if (!String(field.ko || '').trim()) return;
    LANGS.forEach((l) => { if (l !== 'ko' && !String(field[l] || '').trim()) missing++; });
  });
  return missing;
}

/** 문제집 안의 모든 다국어 필드를 순회합니다. */
export function walkTexts(set, fn) {
  fn(set.title); fn(set.description);
  set.axes.forEach((a) => fn(a.name));
  fn(set.wizard.name);
  set.wizard.prologue.forEach(fn);
  set.stages.forEach((st) => {
    [st.title, st.year, st.place, st.description].forEach(fn);
    st.dilemmas.forEach((d) => {
      [d.title, d.context, d.hint, d.wizardLine].forEach(fn);
      d.choices.forEach((c) => [c.text, c.feedbackTitle, c.feedback].forEach(fn));
    });
    [st.reflection.title, st.reflection.guide, st.reflection.placeholder].forEach(fn);
  });
}

export function totalDilemmas(set) {
  return set.stages.reduce((n, st) => n + st.dilemmas.length, 0);
}
