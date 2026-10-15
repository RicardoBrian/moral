export const LANGS = ['ko', 'en', 'zh', 'ru'];
export const LANG_CHIPS = { ko: 'KO', en: 'EN', zh: '中文', ru: 'RU' };
export const LANG_NAMES = { ko: '한국어', en: 'English', zh: '中文', ru: 'Русский' };
export const SPEECH_LANG = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', ru: 'ru-RU' };

/** 다국어 필드({ko, en, zh, ru})에서 현재 언어 값을 꺼냅니다. 비어 있으면 한국어로 대체합니다. */
export function L(field, lang) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  const v = field[lang];
  if (typeof v === 'string' && v.trim()) return v;
  return field.ko || '';
}

export function emptyText() {
  return { ko: '', en: '', zh: '', ru: '' };
}
