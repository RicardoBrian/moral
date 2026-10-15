import React from 'react';
import Icon from '../components/Icon.jsx';
import { Button, BottomCTA, WizardBubble } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { L } from '../lib/localize.js';
import { averageScore, isHonorary, scoreLevel } from '../lib/score.js';

export function SubmitStatus({ state, onRetry }) {
  const { t } = useI18n();
  if (state === 'idle') return null;
  const map = {
    sending: { cls: 'info', icon: null, text: t('submit.sending') },
    done: { cls: 'success', icon: 'check', text: t('submit.done') },
    local: { cls: 'info', icon: 'check', text: t('submit.local') },
    preview: { cls: 'info', icon: null, text: t('submit.preview') },
    failed: { cls: 'error', icon: 'warning', text: t('submit.failed') },
  };
  const m = map[state] || map.sending;
  return (
    <div className={`submit-status submit-${m.cls}`} role="status" aria-live="polite">
      {state === 'sending' ? <span className="spinner" aria-hidden="true" /> : m.icon ? <Icon name={m.icon} size={18} /> : null}
      <span className="submit-text">{m.text}</span>
      {state === 'failed' ? <Button variant="secondary" size="sm" onClick={onRetry}>{t('submit.retry')}</Button> : null}
    </div>
  );
}

export default function ResultScreen({ set, scores, nickname, submitState, onRetry, onNext }) {
  const { t, lang } = useI18n();
  const honor = isHonorary(scores, set);
  const total = averageScore(scores, set);

  return (
    <div className={`screen screen-result ${honor ? 'is-honor' : 'is-prov'}`}>
      <div className="result-hero">
        <div className={`earth ${honor ? 'earth-good' : 'earth-bad'}`} aria-hidden="true">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill={honor ? '#3182f6' : '#8b95a1'} />
            <path d="M30 42c10-8 22-6 26 2s-6 12-2 20 14 4 16 14-8 16-18 14S30 80 28 70s-8-18 2-28Z" fill={honor ? '#15b886' : '#6b7684'} />
            <path d="M74 28c8 0 18 6 20 14s-6 10-12 8-14-4-14-12 2-10 6-10Z" fill={honor ? '#15b886' : '#6b7684'} />
          </svg>
        </div>
        <p className="eyebrow">{t('result.eyebrow')}</p>
        <h1 className="title-xl">{honor ? t('result.honorTitle') : t('result.provTitle')}</h1>
        <p className="desc">{honor ? t('result.honorDesc', { nickname }) : t('result.provDesc', { nickname })}</p>
      </div>

      <SubmitStatus state={submitState} onRetry={onRetry} />

      <div className="card">
        <div className="total-row">
          <span>{t('result.total')}</span>
          <strong>{total}</strong>
        </div>
        <div className="axis-results">
          {set.axes.map((a) => {
            const v = scores[a.id] ?? 0;
            const lv = scoreLevel(v);
            return (
              <div className="axis-result" key={a.id}>
                <div className="axis-result-head">
                  <span className="axis-dot" style={{ background: a.color }} />
                  <span className="axis-name">{L(a.name, lang)}</span>
                  <span className={`axis-level level-${lv}`}>{t(`result.level.${lv}`)}</span>
                  <span className="axis-val">{v}</span>
                </div>
                <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${v}%`, background: a.color }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <WizardBubble name={L(set.wizard.name, lang)} text={honor ? t('result.wizardHonor') : t('result.wizardProv')} />

      <BottomCTA>
        <Button block onClick={onNext}>{t('result.toCert')}</Button>
      </BottomCTA>
    </div>
  );
}
