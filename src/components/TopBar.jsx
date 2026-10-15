import React, { useState } from 'react';
import Icon from './Icon.jsx';
import { Sheet, Toggle, Segmented, Button } from './ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { usePrefs } from '../lib/prefs.jsx';
import { LANGS, LANG_CHIPS, LANG_NAMES } from '../lib/localize.js';
import { audio } from '../lib/audio.js';

export function LangChips() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-chips" role="radiogroup" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          aria-label={LANG_NAMES[l]}
          lang={l}
          className={`lang-chip ${lang === l ? 'active' : ''}`}
          onClick={() => { if (lang !== l) { audio.tap(); setLang(l); } }}
        >
          {LANG_CHIPS[l]}
        </button>
      ))}
    </div>
  );
}

export function SettingsSheet({ open, onClose, bgmAllowed }) {
  const { t } = useI18n();
  const { prefs, update } = usePrefs();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      actions={<Button variant="secondary" block onClick={onClose}>{t('common.close')}</Button>}
    >
      <div className="setting-row">
        <label htmlFor="set-bgm">{t('settings.bgm')}</label>
        <Toggle id="set-bgm" label={t('settings.bgm')} checked={prefs.bgmOn && bgmAllowed} disabled={!bgmAllowed} onChange={(v) => update({ bgmOn: v })} />
      </div>
      {!bgmAllowed && <p className="setting-note">{t('settings.bgmOffByTeacher')}</p>}
      <div className="setting-row">
        <label htmlFor="set-sfx">{t('settings.sfx')}</label>
        <Toggle id="set-sfx" label={t('settings.sfx')} checked={prefs.sfxOn} onChange={(v) => update({ sfxOn: v })} />
      </div>
      <div className="setting-col">
        <span className="setting-label">{t('settings.fontSize')}</span>
        <Segmented
          ariaLabel={t('settings.fontSize')}
          value={prefs.fontSize}
          onChange={(v) => update({ fontSize: v })}
          options={[
            { value: 'md', label: t('settings.font.md') },
            { value: 'lg', label: t('settings.font.lg') },
            { value: 'xl', label: t('settings.font.xl') },
          ]}
        />
      </div>
    </Sheet>
  );
}

export default function TopBar({ progress, bgmAllowed = true, left }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar no-print">
      <div className="topbar-inner">
        <div className="topbar-left">{left || <span className="topbar-brand">{t('app.title')}</span>}</div>
        <div className="topbar-right">
          <LangChips />
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label={t('common.settings')}>
            <Icon name="gear" size={20} />
          </button>
        </div>
      </div>
      {typeof progress === 'number' ? (
        <div className="topbar-progress"><div className="topbar-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      ) : null}
      <SettingsSheet open={open} onClose={() => setOpen(false)} bgmAllowed={bgmAllowed} />
    </header>
  );
}
