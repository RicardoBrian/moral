import React, { useEffect, useRef } from 'react';
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

export default function StageIntroScreen({ set, stageIdx, onStart }) {
  const { t, lang } = useI18n();
  const stage = set.stages[stageIdx];
  const year = L(stage.year, lang);
  const place = L(stage.place, lang);
  const wizardText = t('stage.wizard');
  const desc = L(stage.description, lang);

  return (
    <div className="screen screen-stage-intro">
      <div className="stage-head" style={{ '--stage': stage.color }}>
        <p className="step-label"><span className="stage-dot" />{t('stage.label', { n: stageIdx + 1, total: set.stages.length })}</p>
        <h1 className="title-xl">{L(stage.title, lang)}</h1>
        {(year || place) ? <p className="desc">{[year, place].filter(Boolean).join(' · ')}</p> : null}
      </div>

      {desc ? (
        <div className="passage">
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
