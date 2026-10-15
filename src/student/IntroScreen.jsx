import React from 'react';
import Avatar, { WizardAvatar } from '../components/Avatar.jsx';
import { Button, BottomCTA, SpeakButton } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { L } from '../lib/localize.js';
import { audio } from '../lib/audio.js';

export default function IntroScreen({ set, character, nickname, index, onIndex, onDone }) {
  const { t, lang } = useI18n();
  const lines = set.wizard.prologue.filter((p) => L(p, 'ko').trim());
  const i = Math.min(index, Math.max(0, lines.length - 1));
  const isLast = i >= lines.length - 1;
  const line = lines.length ? L(lines[i], lang) : '';

  const next = () => {
    if (isLast) { onDone(); return; }
    audio.tap();
    onIndex(i + 1);
  };

  return (
    <div className="screen screen-intro">
      <div className="intro-top">
        <button type="button" className="text-btn" onClick={() => { audio.tap(); onDone(); }}>{t('intro.skip')}</button>
      </div>

      <div className="intro-stage">
        <div className="intro-actor intro-wizard">
          <WizardAvatar size={132} className="float" />
          <span className="intro-actor-name">{L(set.wizard.name, lang)}</span>
        </div>
        <div className="intro-actor intro-player">
          <Avatar character={character} size={92} />
          <span className="intro-actor-name">{nickname}</span>
        </div>
      </div>

      <div className="intro-dialog" key={`${i}-${lang}`}>
        <p className="intro-line">{line}</p>
        <div className="intro-dialog-foot">
          <SpeakButton text={line} />
          <div className="dots" aria-hidden="true">
            {lines.map((_, k) => <span key={k} className={`dot ${k === i ? 'active' : k < i ? 'done' : ''}`} />)}
          </div>
        </div>
      </div>

      <BottomCTA>
        <Button block onClick={next}>{isLast ? t('intro.go') : t('common.next')}</Button>
      </BottomCTA>
    </div>
  );
}
