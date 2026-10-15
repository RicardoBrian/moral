import React, { useEffect, useRef } from 'react';
import Avatar from '../components/Avatar.jsx';
import { Button, BottomCTA, WizardBubble, SpeakButton } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { L } from '../lib/localize.js';

export function WarpOverlay({ title }) {
  const { t } = useI18n();
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  return (
    <div className="warp" role="status" aria-live="polite" tabIndex={-1} ref={ref}>
      <div className="warp-rings" aria-hidden="true">
        <span /><span /><span />
      </div>
      <p className="warp-title">{t('warp.title')}</p>
      {title ? <p className="warp-sub">{t('warp.next', { title })}</p> : null}
    </div>
  );
}

export default function StageIntroScreen({ set, stageIdx, character, nickname, onStart }) {
  const { t, lang } = useI18n();
  const stage = set.stages[stageIdx];
  const year = L(stage.year, lang);
  const place = L(stage.place, lang);
  const where = [year, place].filter(Boolean).join(lang === 'zh' ? '，' : ', ');
  const wizardText = where ? t('stage.wizard', { where }) : '';
  const desc = L(stage.description, lang);

  return (
    <div className="screen screen-stage-intro">
      <div className="stage-hero" style={{ '--stage': stage.color }}>
        <span className="stage-pill">{t('stage.label', { n: stageIdx + 1, total: set.stages.length })}</span>
        <h1 className="title-xl stage-hero-title">{L(stage.title, lang)}</h1>
        {(year || place) ? <p className="stage-hero-meta">{[year, place].filter(Boolean).join(' · ')}</p> : null}
        <div className="stage-hero-avatar"><Avatar character={character} size={84} /><span>{nickname}</span></div>
      </div>

      {desc ? (
        <div className="card">
          <p className="body-lg">{desc}</p>
          <SpeakButton text={desc} />
        </div>
      ) : null}

      <WizardBubble name={L(set.wizard.name, lang)} text={wizardText} />

      <BottomCTA>
        <Button block onClick={onStart}>{t('stage.start')}</Button>
      </BottomCTA>
    </div>
  );
}
