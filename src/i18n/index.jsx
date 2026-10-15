import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS } from './strings.js';
import { LANGS } from '../lib/localize.js';
import { loadJSON, saveJSON } from '../lib/storage.js';
import { stopSpeaking } from '../lib/tts.js';

const I18nCtx = createContext(null);

export function format(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = loadJSON('mt.lang', null);
    // 학교 기기의 브라우저 언어와 상관없이 처음에는 한국어로 시작하고, 학생이 고른 언어를 기억합니다.
    return LANGS.includes(saved) ? saved : 'ko';
  });

  const setLang = useCallback((l) => {
    if (!LANGS.includes(l)) return;
    stopSpeaking();
    setLangState(l);
    saveJSON('mt.lang', l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  }, [lang]);

  const t = useCallback((key, vars) => {
    const s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.ko[key] || key;
    return format(s, vars);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}
