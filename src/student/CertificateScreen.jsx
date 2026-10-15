import React, { useState } from 'react';
import Avatar from '../components/Avatar.jsx';
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
          <header className="cert-head">
            <div className={`cert-badge ${honor ? 'gold' : 'blue'}`} aria-hidden="true"><Icon name="globe" size={28} /></div>
            <h1 className="cert-title">{honor ? t('cert.honor') : t('cert.prov')}</h1>
            <p className="cert-sub">{t('cert.sub')}</p>
          </header>

          <div className="cert-person">
            <Avatar character={game.character} size={88} />
            <dl className="cert-fields">
              <div><dt>{t('cert.name')}</dt><dd className="cert-name">{game.name}</dd></div>
              <div><dt>{t('cert.studentId')}</dt><dd>{game.studentId}</dd></div>
              <div><dt>{t('cert.nickname')}</dt><dd>{game.nickname}</dd></div>
            </dl>
          </div>

          <p className="cert-body">
            {honor ? t('cert.bodyHonor', { set: L(set.title, lang) }) : t('cert.bodyProv', { set: L(set.title, lang) })}
          </p>

          <div className="cert-scores">
            {set.axes.map((a) => (
              <div className="cert-score" key={a.id}>
                <span>{L(a.name, lang)}</span>
                <strong>{scores[a.id] ?? 0}</strong>
              </div>
            ))}
            <div className="cert-score total">
              <span>{t('result.total')}</span>
              <strong>{total}</strong>
            </div>
          </div>

          <section className="cert-promises">
            <h2>{t('cert.promises')}</h2>
            <ul>
              {set.stages.map((st) => (game.reflections[st.id] ? (
                <li key={st.id}>
                  <span className="cert-promise-stage">{L(st.title, lang)}</span>
                  <span className="cert-promise-text">{game.reflections[st.id]}</span>
                </li>
              ) : null))}
            </ul>
          </section>

          <footer className="cert-foot">
            <div>
              <p className="cert-date">{dateText}</p>
              <p className="cert-issuer">{t('cert.issuer')}</p>
              <p className="cert-no">{t('cert.no')} {certNo}</p>
            </div>
            <div className="cert-seal" aria-hidden="true"><span>CHRONOS</span></div>
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
