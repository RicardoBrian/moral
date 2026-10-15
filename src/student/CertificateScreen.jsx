import React, { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Button, BottomCTA, Sheet } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { L } from '../lib/localize.js';
import { averageScore, isHonorary } from '../lib/score.js';
import { SubmitStatus } from './ResultScreen.jsx';

export default function CertificateScreen({ set, session, game, scores, submitState, onRetry, onHome, preview }) {
  const { t, lang } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const honor = isHonorary(scores, set);
  const total = averageScore(scores, set);
  const date = new Date(game.finishedAt || Date.now());
  const dateText = date.toLocaleDateString({ ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', ru: 'ru-RU' }[lang], { year: 'numeric', month: 'long', day: 'numeric' });
  const certNo = `${date.getFullYear()}-${session.code}-${game.studentId}`;
  const notSubmitted = !preview && !game.submitted && submitState !== 'local' && submitState !== 'done';

  return (
    <div className="screen screen-cert">
      <SubmitStatus state={submitState} onRetry={onRetry} />

      <article className="cert" aria-label={honor ? t('cert.honor') : t('cert.prov')}>
        <div className="cert-inner">
          <p className="cert-no">{t('cert.no')} {certNo}</p>
          <h1 className="cert-title">{honor ? t('cert.honor') : t('cert.prov')}</h1>

          <dl className="cert-fields">
            <div><dt>{t('cert.name')}</dt><dd className="cert-name">{game.name}</dd></div>
            <div><dt>{t('cert.studentId')}</dt><dd>{game.studentId}</dd></div>
            <div><dt>{t('cert.nickname')}</dt><dd>{game.nickname}</dd></div>
          </dl>

          <p className="cert-body">
            {honor ? t('cert.bodyHonor', { set: L(set.title, lang) }) : t('cert.bodyProv', { set: L(set.title, lang) })}
          </p>

          <table className="cert-scores">
            <thead>
              <tr>
                {set.axes.map((a) => <th key={a.id}>{L(a.name, lang)}</th>)}
                <th>{t('result.total')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {set.axes.map((a) => <td key={a.id}>{scores[a.id] ?? 0}</td>)}
                <td className="total">{total}</td>
              </tr>
            </tbody>
          </table>

          <section className="cert-promises">
            <h2>{t('cert.promises')}</h2>
            <ol>
              {set.stages.map((st) => (game.reflections[st.id] ? (
                <li key={st.id}>
                  <span className="cert-promise-stage">{L(st.title, lang)}</span>
                  <span className="cert-promise-text">{game.reflections[st.id]}</span>
                </li>
              ) : null))}
            </ol>
          </section>

          <footer className="cert-foot">
            <p className="cert-date">{dateText}</p>
            <p className="cert-issuer">{t('cert.issuer')}</p>
          </footer>
        </div>
      </article>

      <BottomCTA>
        <Button variant="secondary" onClick={() => setConfirm(true)}>{t('cert.home')}</Button>
        <Button onClick={() => window.print()}><Icon name="print" size={18} /> {t('cert.print')}</Button>
      </BottomCTA>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('cert.homeConfirm')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>{t('cert.homeNo')}</Button>
            <Button variant={notSubmitted ? 'danger' : 'primary'} onClick={() => { setConfirm(false); onHome(); }}>{t('cert.homeYes')}</Button>
          </>
        )}
      >
        {notSubmitted ? <p className="notice notice-error">{t('cert.notSubmittedWarn')}</p> : null}
        <p className="sheet-desc">{t('cert.homeConfirmDesc')}</p>
      </Sheet>
    </div>
  );
}
