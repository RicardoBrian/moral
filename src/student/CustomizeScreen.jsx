import React, { useState } from 'react';
import Avatar, { AVATAR_OPTIONS, DEFAULT_CHARACTER } from '../components/Avatar.jsx';
import { Button, BottomCTA, Chips, Swatches, TextField } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { audio } from '../lib/audio.js';

export default function CustomizeScreen({ initial, onDone }) {
  const { t } = useI18n();
  const [character, setCharacter] = useState(() => {
    const c = { ...DEFAULT_CHARACTER };
    const saved = initial.character || {};
    Object.keys(AVATAR_OPTIONS).forEach((k) => { if (AVATAR_OPTIONS[k].includes(saved[k])) c[k] = saved[k]; });
    return c;
  });
  const [nickname, setNickname] = useState(initial.nickname || '');
  const [error, setError] = useState('');
  const set = (k) => (v) => setCharacter((c) => ({ ...c, [k]: v }));

  const suggest = () => {
    audio.tap();
    const list = t('custom.nicknames').split('|');
    const pool = list.filter((n) => n !== nickname);
    setNickname(pool[Math.floor(Math.random() * pool.length)] || list[0]);
    setError('');
  };

  const done = () => {
    const n = nickname.trim();
    if (!n) { setError(t('custom.err.nickname')); audio.error(); return; }
    audio.select();
    onDone({ character, nickname: n });
  };

  const opts = (key, prefix) => AVATAR_OPTIONS[key].map((v) => ({ value: v, label: t(`${prefix}.${v}`) }));

  return (
    <div className="screen screen-customize">
      <div className="screen-head">
        <p className="eyebrow">{t('custom.eyebrow')}</p>
        <h1 className="title-lg">{t('custom.title')}</h1>
      </div>

      <div className="customize-preview">
        <Avatar character={character} size={120} />
        <div className="customize-name">{nickname.trim() || ' '}</div>
      </div>

      <div className="form-stack">
        <div className="nickname-row">
          <TextField
            id="nick"
            label={t('custom.nickname')}
            value={nickname}
            onChange={(e) => { setNickname(e.target.value.slice(0, 12)); setError(''); }}
            help={t('custom.nicknameHelp')}
            error={error}
            autoComplete="off"
          />
          <Button variant="secondary" size="md" className="nickname-suggest" onClick={suggest}>{t('custom.random')}</Button>
        </div>

        <section className="option-block">
          <h2 className="option-title">{t('custom.hair')}</h2>
          <Chips ariaLabel={t('custom.hair')} options={opts('hairStyle', 'hair')} value={character.hairStyle} onChange={set('hairStyle')} />
        </section>
        <section className="option-block">
          <h2 className="option-title">{t('custom.hairColor')}</h2>
          <Swatches ariaLabel={t('custom.hairColor')} colors={AVATAR_OPTIONS.hairColor} value={character.hairColor} onChange={set('hairColor')} />
        </section>
        <section className="option-block">
          <h2 className="option-title">{t('custom.skin')}</h2>
          <Swatches ariaLabel={t('custom.skin')} colors={AVATAR_OPTIONS.skinTone} value={character.skinTone} onChange={set('skinTone')} />
        </section>
        <section className="option-block">
          <h2 className="option-title">{t('custom.outfit')}</h2>
          <Chips ariaLabel={t('custom.outfit')} options={opts('outfitStyle', 'outfit')} value={character.outfitStyle} onChange={set('outfitStyle')} />
        </section>
        <section className="option-block">
          <h2 className="option-title">{t('custom.outfitColor')}</h2>
          <Swatches ariaLabel={t('custom.outfitColor')} colors={AVATAR_OPTIONS.outfitColor} value={character.outfitColor} onChange={set('outfitColor')} />
        </section>
        <section className="option-block">
          <h2 className="option-title">{t('custom.expression')}</h2>
          <Chips ariaLabel={t('custom.expression')} options={opts('expression', 'expr')} value={character.expression} onChange={set('expression')} />
        </section>
        <section className="option-block">
          <h2 className="option-title">{t('custom.accessory')}</h2>
          <Chips ariaLabel={t('custom.accessory')} options={opts('accessory', 'acc')} value={character.accessory} onChange={set('accessory')} />
        </section>
      </div>

      <BottomCTA>
        <Button block onClick={done}>{t('custom.done')}</Button>
      </BottomCTA>
    </div>
  );
}
