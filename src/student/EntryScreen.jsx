import React, { useState } from 'react';
import { Button, BottomCTA, TextField, Sheet } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { parseStudentId } from '../lib/validate.js';
import { loadJSON } from '../lib/storage.js';
import { audio } from '../lib/audio.js';

function initialCode() {
  try {
    const q = new URLSearchParams(window.location.search).get('code');
    if (q) return q.toUpperCase().slice(0, 12);
  } catch (e) { /* ignore */ }
  const last = loadJSON('mt.lastEntry', null);
  return last && last.code ? last.code : '';
}

export default function EntryScreen({ api, onEntered }) {
  const { t } = useI18n();
  const [code, setCode] = useState(initialCode);
  const [sid, setSid] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null); // 확인 대기 중인 입장 정보

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    const errs = {};
    const c = code.trim().toUpperCase();
    if (!c) errs.code = t('entry.err.code');
    const parsed = parseStudentId(sid);
    if (!parsed.ok) errs.sid = parsed.error === 'format' ? t('entry.err.idFormat') : t('entry.err.idRange');
    const n = name.trim();
    if (!n) errs.name = t('entry.err.name');
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) { audio.error(); return; }
    setLoading(true);
    try {
      const { session, set } = await api.getSession(c);
      setPending({
        student: { studentId: parsed.id, grade: parsed.grade, classNo: parsed.classNo, number: parsed.number, name: n },
        session,
        set,
      });
    } catch (err) {
      audio.error();
      const k = err && err.code;
      if (k === 'NOT_FOUND' || k === 'CLOSED') setErrors({ code: t(`entry.err.${k}`) });
      else if (k === 'NETWORK' || k === 'TIMEOUT') setFormError(t('entry.err.network'));
      else setFormError(t('entry.err.generic'));
    } finally {
      setLoading(false);
    }
  };

  const p = pending && pending.student;

  return (
    <form className="screen screen-entry" onSubmit={submit} noValidate>
      <div className="screen-head">
        <h1 className="title-xl">{t('entry.title')}</h1>
        <p className="desc">{t('entry.desc')}</p>
      </div>

      {api.mode === 'local' ? <div className="notice notice-info">{t('entry.localMode')}</div> : null}

      <div className="form-stack">
        <TextField
          id="entry-code"
          label={t('entry.code')}
          placeholder={t('entry.codePh')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          error={errors.code}
        />
        <TextField
          id="entry-sid"
          label={t('entry.studentId')}
          placeholder={t('entry.studentIdPh')}
          value={sid}
          onChange={(e) => setSid(e.target.value.replace(/\D/g, '').slice(0, 5))}
          inputMode="numeric"
          autoComplete="off"
          help={t('entry.studentIdHelp')}
          error={errors.sid}
        />
        <TextField
          id="entry-name"
          label={t('entry.name')}
          placeholder={t('entry.namePh')}
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          autoComplete="off"
          error={errors.name}
        />
      </div>

      {formError ? <div className="notice notice-error" role="alert">{formError}</div> : null}
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} />

      <BottomCTA>
        <Button block loading={loading} onClick={submit}>{t('entry.submit')}</Button>
      </BottomCTA>

      <Sheet
        open={!!pending}
        onClose={() => setPending(null)}
        title={p ? t('confirm.title', { grade: p.grade, classNo: p.classNo, number: p.number, name: p.name }) : ''}
        actions={(
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>{t('confirm.no')}</Button>
            <Button onClick={() => { const x = pending; setPending(null); onEntered(x); }}>{t('confirm.yes')}</Button>
          </>
        )}
      >
        <p className="sheet-desc">{t('confirm.desc')}</p>
      </Sheet>
    </form>
  );
}
