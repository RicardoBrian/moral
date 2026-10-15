import React, { useCallback, useEffect, useState } from 'react';
import { Button, Sheet, Toggle, TextField, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { L } from '../lib/localize.js';
import { navigate } from '../lib/router.js';
import { validateSet } from '../data/setModel.js';
import { fmtDate, studentLink, copyText, errorText } from './tutils.js';

function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg];
}

export function Toast({ msg }) {
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export default function SessionsPage({ api, onAuthError }) {
  const [sessions, setSessions] = useState(null);
  const [sets, setSets] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useToast();
  const [form, setForm] = useState({ setId: '', label: '', bgm: true });
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [big, setBig] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [ss, st] = await Promise.all([api.listSessions(), api.listSets()]);
      setSessions(ss);
      setSets(st);
      setForm((f) => ({ ...f, setId: f.setId && st.some((x) => x.id === f.setId) ? f.setId : (st[0] && st[0].id) || '' }));
    } catch (e) {
      if (!onAuthError(e)) setError(errorText(e));
      setSessions((s) => s || []);
    }
  }, [api, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const setTitle = (id) => {
    const s = sets.find((x) => x.id === id);
    return s ? L(s.title, 'ko') || '(제목 없음)' : '(삭제된 문제집)';
  };

  const create = async () => {
    if (creating) return;
    if (!form.setId) { setFormErr('문제집을 선택해 주세요.'); return; }
    setCreating(true);
    setFormErr('');
    try {
      // 완성되지 않은 문제집으로는 수업을 열지 않습니다.
      const full = await api.getSet(form.setId);
      const errs = validateSet(full);
      if (errs.length) {
        setFormErr(`이 문제집에 비어 있는 항목이 ${errs.length}개 있어요. 문제집 편집에서 먼저 채워 주세요. (예: ${errs[0]})`);
        return;
      }
      const sess = await api.createSession({ setId: form.setId, label: form.label.trim(), bgm: form.bgm });
      setSessions((list) => [sess, ...(list || [])]);
      setForm((f) => ({ ...f, label: '' }));
      setBig(sess);
    } catch (e) {
      if (!onAuthError(e)) setFormErr(errorText(e));
    } finally {
      setCreating(false);
    }
  };

  const patch = async (code, p) => {
    setSessions((list) => list.map((s) => (s.code === code ? { ...s, ...p } : s)));
    try {
      const updated = await api.updateSession(code, p);
      setSessions((list) => list.map((s) => (s.code === code ? updated : s)));
    } catch (e) {
      if (!onAuthError(e)) setToast(errorText(e));
      load();
    }
  };

  const remove = async () => {
    const code = del.code;
    setDel(null);
    try {
      await api.deleteSession(code);
      setSessions((list) => list.filter((s) => s.code !== code));
      setToast('수업을 삭제했어요. 드라이브에 저장된 결과는 그대로 남아 있어요.');
    } catch (e) {
      if (!onAuthError(e)) setToast(errorText(e));
    }
  };

  const copy = async (code) => {
    const ok = await copyText(studentLink(code));
    setToast(ok ? '학생용 링크를 복사했어요.' : '복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.');
  };

  return (
    <div className="t-page">
      <div className="t-page-head">
        <h1 className="t-h1">수업</h1>
        <p className="t-desc">차시마다 수업 코드를 만들어 학생들에게 알려 주세요. 학생은 코드로 들어와 선택한 문제집을 풀어요.</p>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      <section className="t-card">
        <h2 className="t-h2">새 수업 열기</h2>
        <div className="t-form-grid">
          <div className="field">
            <label className="field-label" htmlFor="new-set">문제집</label>
            <select id="new-set" className="field-input" value={form.setId} onChange={(e) => setForm({ ...form, setId: e.target.value })}>
              {sets.length === 0 ? <option value="">문제집이 없어요</option> : null}
              {sets.map((s) => <option key={s.id} value={s.id}>{L(s.title, 'ko') || '(제목 없음)'} · 딜레마 {s.dilemmas}개</option>)}
            </select>
          </div>
          <TextField id="new-label" label="차시 이름" placeholder="예) 1차시, 3-2반 4교시" value={form.label} maxLength={30} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <div className="field">
            <span className="field-label">배경음악</span>
            <div className="t-inline"><Toggle label="배경음악" checked={form.bgm} onChange={(v) => setForm({ ...form, bgm: v })} /><span className="t-muted">{form.bgm ? '켜기' : '끄기'}</span></div>
          </div>
        </div>
        {formErr ? <div className="notice notice-error">{formErr}</div> : null}
        <div className="t-actions"><Button size="md" loading={creating} onClick={create}>수업 코드 만들기</Button></div>
      </section>

      <section>
        <h2 className="t-h2">수업 목록</h2>
        {sessions === null ? <Spinner /> : sessions.length === 0 ? <p className="t-empty">아직 만든 수업이 없어요.</p> : (
          <div className="t-session-list">
            {sessions.map((s) => (
              <article className={`t-card t-session ${s.active ? '' : 'closed'}`} key={s.code}>
                <div className="t-session-main">
                  <button type="button" className="t-code" onClick={() => setBig(s)} title="크게 보기">{s.code}</button>
                  <div className="t-session-info">
                    <strong>{setTitle(s.setId)}</strong>
                    <span>{s.label || '차시 이름 없음'} · {fmtDate(s.createdAt)}</span>
                  </div>
                </div>
                <div className="t-session-controls">
                  <label className="t-inline"><Toggle label="학생 입장 허용" checked={!!s.active} onChange={(v) => patch(s.code, { active: v })} /><span>{s.active ? '입장 가능' : '종료됨'}</span></label>
                  <label className="t-inline"><Toggle label="배경음악" checked={s.bgm !== false} onChange={(v) => patch(s.code, { bgm: v })} /><span>배경음악</span></label>
                </div>
                <div className="t-session-actions">
                  <Button size="sm" onClick={() => navigate(`/teacher/dash/${encodeURIComponent(s.code)}`)}>현황 보기</Button>
                  <Button size="sm" variant="secondary" onClick={() => copy(s.code)}><Icon name="copy" size={16} /> 링크 복사</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDel(s)}><Icon name="trash" size={16} /> 삭제</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Sheet open={!!big} onClose={() => setBig(null)} title="학생들에게 이 코드를 알려 주세요" actions={<Button variant="secondary" block onClick={() => setBig(null)}>닫기</Button>}>
        {big ? (
          <div className="t-bigcode">
            <div className="t-bigcode-code">{big.code}</div>
            <p className="t-bigcode-link">{studentLink(big.code)}</p>
            <Button size="md" variant="secondary" onClick={() => copy(big.code)}><Icon name="copy" size={16} /> 링크 복사</Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={!!del}
        onClose={() => setDel(null)}
        title={del ? `${del.code} 수업을 삭제할까요?` : ''}
        actions={<><Button variant="secondary" onClick={() => setDel(null)}>취소</Button><Button variant="danger" onClick={remove}>삭제</Button></>}
      >
        <p className="sheet-desc">학생들이 더 이상 이 코드로 들어올 수 없어요. 드라이브에 저장된 결과 파일은 지워지지 않아요. 잠시 막아 두려면 삭제 대신 ‘입장 가능’을 꺼 주세요.</p>
      </Sheet>

      <Toast msg={toast} />
    </div>
  );
}
