import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Button, BottomCTA, WizardBubble, SpeakButton, CheckedTextArea } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { L } from '../lib/localize.js';
import { seededShuffle } from '../lib/rand.js';
import { checkText, minFor } from '../lib/validate.js';
import { effectTone } from '../lib/score.js';
import { audio } from '../lib/audio.js';

export function ScoreBars({ set, scores, prev }) {
  const { lang } = useI18n();
  return (
    <div className="score-bars">
      {set.axes.map((a) => {
        const v = scores[a.id] ?? 0;
        const d = prev ? v - (prev[a.id] ?? 0) : 0;
        return (
          <div className="score-bar" key={a.id}>
            <div className="score-bar-head">
              <span className="score-bar-name">{L(a.name, lang)}</span>
              <span className="score-bar-val">
                {d !== 0 ? <em className={d > 0 ? 'up' : 'down'}>{d > 0 ? `+${d}` : d}</em> : null}
                {v}
              </span>
            </div>
            <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${v}%`, background: a.color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function DilemmaScreen({
  set, stageIdx, dilemmaIdx, studentId, answer, draft, onDraft,
  scores, prevScores, showFeedback, onDecide, onNext, isLastInStage,
}) {
  const { t, lang } = useI18n();
  const stage = set.stages[stageIdx];
  const d = stage.dilemmas[dilemmaIdx];
  const [hintOpen, setHintOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const choices = useMemo(() => seededShuffle(d.choices, `${studentId}:${d.id}`), [d, studentId]);
  const selectedId = showFeedback ? answer && answer.choiceId : draft && draft.choiceId;
  const reason = (draft && draft.reason) || '';
  const min = minFor(set, 'reason', lang);
  const reasonOk = checkText(reason, min).ok;
  const selected = choices.find((c) => c.id === selectedId);
  const reasonRef = useRef(null);
  const hadSelection = useRef(!!selected);
  // 처음 선택지를 고르면 이유 입력칸이 하단 버튼에 가리지 않도록 화면을 내려 줍니다.
  useEffect(() => {
    if (selected && !hadSelection.current && reasonRef.current) {
      reasonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    hadSelection.current = !!selected;
  }, [selected]);

  const pick = (c) => {
    if (showFeedback) return;
    audio.select();
    onDraft({ choiceId: c.id, reason });
  };

  const decide = () => {
    if (busy || !selected || !reasonOk) return;
    setBusy(true);
    onDecide(selected, reason);
  };

  const context = L(d.context, lang);
  const hint = L(d.hint, lang);

  if (showFeedback && selected) {
    const tone = effectTone(selected.effects);
    const fbTitle = L(selected.feedbackTitle, lang);
    const fb = L(selected.feedback, lang);
    return (
      <div className="screen screen-feedback">
        <div className="screen-head">
          <p className="step-label">{t('stage.label', { n: stageIdx + 1, total: set.stages.length })} · {t('dilemma.label', { n: dilemmaIdx + 1, total: stage.dilemmas.length })}</p>
          <h1 className="title-lg">{L(d.title, lang)}</h1>
        </div>

        <section className={`outcome tone-${tone}`}>
          <div className="outcome-head">
            <span className="outcome-icon" aria-hidden="true"><Icon name={tone === 'negative' ? 'warning' : 'check'} size={18} /></span>
            <h2 className="outcome-title">{fbTitle}</h2>
          </div>
          <p className="body-lg">{fb}</p>
          <SpeakButton text={`${fbTitle}. ${fb}`} />
        </section>

        <hr className="divider" />

        <ScoreBars set={set} scores={scores} prev={prevScores} />

        <hr className="divider" />

        <dl className="recap">
          <div><dt>{t('feedback.myChoice')}</dt><dd>{L(selected.text, lang)}</dd></div>
          <div><dt>{t('feedback.myReason')}</dt><dd>{answer && answer.reason}</dd></div>
        </dl>

        <BottomCTA>
          <Button block onClick={onNext}>{isLastInStage ? t('feedback.toReflection') : t('feedback.next')}</Button>
        </BottomCTA>
      </div>
    );
  }

  const note = !selected ? t('dilemma.pickFirst') : !reasonOk ? t('dilemma.writeReason') : null;

  return (
    <div className="screen screen-dilemma">
      <div className="screen-head">
        <p className="step-label">{t('stage.label', { n: stageIdx + 1, total: set.stages.length })} · {t('dilemma.label', { n: dilemmaIdx + 1, total: stage.dilemmas.length })}</p>
        <h1 className="title-lg">{L(d.title, lang)}</h1>
      </div>

      <div className="passage">
        <p className="body-lg">{context}</p>
        <SpeakButton text={`${L(d.title, lang)}. ${context}`} />
      </div>

      <WizardBubble name={L(set.wizard.name, lang)} text={L(d.wizardLine, lang)} />

      {hint ? (
        <div className={`hint ${hintOpen ? 'open' : ''}`}>
          <button type="button" className="hint-toggle" aria-expanded={hintOpen} onClick={() => { audio.tap(); setHintOpen((v) => !v); }}>
            <Icon name="bulb" size={18} />
            <span>{t('dilemma.hint')}</span>
            <Icon name="chevronDown" size={18} className="hint-chevron" />
          </button>
          {hintOpen ? (
            <div className="hint-body">
              <p className="hint-title">{t('dilemma.hintTitle')}</p>
              <p>{hint}</p>
              <SpeakButton text={hint} compact />
            </div>
          ) : null}
        </div>
      ) : null}

      <h2 className="section-title">{t('dilemma.pick')}</h2>
      <div className="choice-list" role="radiogroup" aria-label={t('dilemma.pick')}>
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selectedId === c.id}
            className={`choice ${selectedId === c.id ? 'selected' : ''}`}
            onClick={() => pick(c)}
          >
            <span className="choice-text">{L(c.text, lang)}</span>
            <span className="choice-check" aria-hidden="true"><Icon name="check" size={18} /></span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="reason-block" ref={reasonRef}>
          <CheckedTextArea
            id={`reason-${d.id}`}
            label={t('dilemma.reasonLabel')}
            placeholder={t('dilemma.reasonPh')}
            value={reason}
            min={min}
            rows={3}
            onChange={(v) => onDraft({ choiceId: selectedId, reason: v })}
            showErrors
          />
        </div>
      ) : null}

      <BottomCTA note={note}>
        <Button block disabled={!selected || !reasonOk} loading={busy} onClick={decide}>{t('dilemma.decide')}</Button>
      </BottomCTA>
    </div>
  );
}
