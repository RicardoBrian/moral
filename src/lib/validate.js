/** 학번 30215 → 3학년 02반 15번 */
export function parseStudentId(raw) {
  const s = String(raw || '').trim();
  if (!/^\d{5}$/.test(s)) return { ok: false, error: 'format' };
  const grade = Number(s[0]);
  const classNo = Number(s.slice(1, 3));
  const number = Number(s.slice(3, 5));
  if (grade < 1 || grade > 6 || classNo < 1 || number < 1) return { ok: false, error: 'range' };
  return { ok: true, id: s, grade, classNo, number };
}

export const DEFAULT_MIN = {
  reflection: { ko: 15, en: 35, zh: 10, ru: 35 },
  reason: { ko: 5, en: 10, zh: 4, ru: 10 },
};

export function minFor(set, kind, lang) {
  const conf = set && set.minChars && set.minChars[kind];
  const v = conf && Number(conf[lang]);
  if (v && v > 0) return v;
  return DEFAULT_MIN[kind][lang] || DEFAULT_MIN[kind].ko;
}

/** 공백을 뺀 글자 수 (이모지·한자도 1글자) */
export function countChars(text) {
  return Array.from(String(text || '').replace(/\s+/g, '')).length;
}

/**
 * 성의 없는 답을 걸러냅니다.
 * 반환: { ok, code, length }  code: 'short' | 'repeat' | 'jamo' | 'variety'
 */
export function checkText(text, min) {
  const compact = String(text || '').replace(/\s+/g, '');
  const chars = Array.from(compact);
  const length = chars.length;
  if (length < min) return { ok: false, code: 'short', length };
  if (/(.)\1{4,}/u.test(compact)) return { ok: false, code: 'repeat', length };
  if (length >= 8 && /(.{2,5})\1{3,}/u.test(compact)) return { ok: false, code: 'repeat', length };
  const jamo = chars.filter((c) => /[ㄱ-ㅎㅏ-ㅣ]/.test(c)).length;
  if (jamo / length > 0.3) return { ok: false, code: 'jamo', length };
  const distinct = new Set(chars).size;
  if (distinct < Math.min(5, Math.ceil(length * 0.3))) return { ok: false, code: 'variety', length };
  return { ok: true, code: null, length };
}
