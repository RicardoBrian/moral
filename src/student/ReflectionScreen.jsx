import React, { useState } from 'react';
import { Button, BottomCTA, WizardBubble, SpeakButton, CheckedTextArea } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { L } from '../lib/localize.js';
import { checkText, minFor } from '../lib/validate.js';
import { audio } from '../lib/audio.js';

export default function ReflectionScreen({ set, stageIdx, answers, draft, onDraft, isLast, onSave }) {
  const { t, lang } = useI18n();
  const stage = set.stages[stageIdx];
  const [busy, setBusy] = useState(false);
  const min = minFor(set, 'reflection', lang);
  const ok = checkText(draft, min).ok;
  const guide = L(stage.reflection.guide, lang);
  const title = L(stage.reflection.title, lang) || L(stage.title, lang);

  const save = () => {
    if (busy || !ok) return;
    setBusy(true);
    audio.select();
    onSave(draft);
  };

  return (
    <div className="screen screen-reflection">
      <div className="screen-head">
        <p className="eyebrow">{t('reflect.eyebrow', { n: stageIdx + 1 })}</p>
        <h1 className="title-lg">{title}</h1>
      </div>

      <WizardBubble name={L(set.wizard.name, lang)} text={t('reflect.wizard')} />

      {stage.dilemmas.some((d) => answers[d.id]) ? (
        <div className="card card-muted">
          <h2 className="card-label">{t('reflect.mySelections')}</h2>
          <ul className="mini-recap">
            {stage.dilemmas.map((d) => {
              const a = answers[d.id];
              const c = a && d.choices.find((x) => x.id === a.choiceId);
              if (!c) return null;
              return (
                <li key={d.id}>
                  <strong>{L(d.title, lang)}</strong>
                  <span>{L(c.text, lang)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="question">
        <p className="question-text">{guide}</p>
        <SpeakButton text={guide} compact />
      </div>

      <CheckedTextArea
        id={`reflect-${stage.id}`}
        value={draft}
        min={min}
        rows={6}
        placeholder={L(stage.reflection.placeholder, lang)}
        onChange={onDraft}
        showErrors
      />

      <BottomCTA>
        <Button block disabled={!ok} loading={busy} onClick={save}>{isLast ? t('reflect.submitLast') : t('reflect.submitNext')}</Button>
      </BottomCTA>
    </div>
  );
}
