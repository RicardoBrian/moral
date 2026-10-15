import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON } from './storage.js';
import { audio } from './audio.js';

const PrefsCtx = createContext(null);
const DEFAULTS = { fontSize: 'md', bgmOn: true, sfxOn: true };

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULTS, ...(loadJSON('mt.prefs', {}) || {}) }));

  useEffect(() => {
    saveJSON('mt.prefs', prefs);
    audio.setPrefs({ bgmOn: prefs.bgmOn, sfxOn: prefs.sfxOn });
    document.documentElement.dataset.font = prefs.fontSize;
  }, [prefs]);

  const value = useMemo(() => ({
    prefs,
    update: (patch) => setPrefs((p) => ({ ...p, ...patch })),
  }), [prefs]);
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  return useContext(PrefsCtx);
}
