import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spinner, Toggle } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate, errorText, downloadFile } from './tutils.js';
import ResultPanel from './ResultPanel.jsx';

const LANG_KO = { ko: '한국어', en: '영어', zh: '중국어', ru: '러시아어' };
const isHonor = (r) => r.honorary === true || r.honorary === 'TRUE' || r.honorary === 'true';

/** 같은 수업에서 같은 학생이 여러 번 냈다면 가장 최근 것만 남깁니다. */
function latestOnly(subs) {
  const map = new Map();
  subs.forEach((s) => {
    const k = `${s.code}|${s.studentId}`;
    const prev = map.get(k);
    if (!prev || String(s.submittedAt) > String(prev.submittedAt)) map.set(k, s);
  });
  return [...map.values()];
}

export default function ResultsPage({ api, onAuthError }) {
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ set: '', session: '', cls: '', q: '', latest: true });
  const [open, setOpen] = useState(-1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubs(await api.listSubmissions());
      setError('');
    } catch (e) {
      if (!onAuthError(e)) setError(errorText(e));
      setSubs((s) => s || []);
    } finally {
      setLoading(false);
    }
  }, [api, onAuthError]);

  useEffect(() => { load(); }, [load]);

  const options = useMemo(() => {
    const all = subs || [];
    const sets = [...new Set(all.map((s) => s.setTitle).filter(Boolean))].sort();
    const sessions = new Map();
    all.filter((s) => !f.set || s.setTitle === f.set).forEach((s) => {
      if (!sessions.has(s.code)) sessions.set(s.code, { code: s.code, label: s.sessionLabel, at: s.submittedAt });
    });
    const classes = [...new Set(all
      .filter((s) => (!f.set || s.setTitle === f.set) && (!f.session || s.code === f.session))
      .map((s) => `${s.grade}-${s.classNo}`))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return {
      sets,
      sessions: [...sessions.values()].sort((a, b) => String(b.at).localeCompare(String(a.at))),
      classes,
    };
  }, [subs, f.set, f.session]);

  const rows = useMemo(() => {
    let list = subs || [];
    if (f.set) list = list.filter((s) => s.setTitle === f.set);
    if (f.session) list = list.filter((s) => s.code === f.session);
    if (f.cls) list = list.filter((s) => `${s.grade}-${s.classNo}` === f.cls);
    const q = f.q.trim();
    if (q) list = list.filter((s) => String(s.name).includes(q) || String(s.studentId).includes(q) || String(s.nickname || '').includes(q));
    if (f.latest) list = latestOnly(list);
    return list.slice().sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)) || String(a.studentId).localeCompare(String(b.studentId)));
  }, [subs, f]);

  const filtered = useMemo(() => {
    // 결과 창에서 이전 제출을 고를 수 있도록 '최근 제출만' 과 상관없이 전체 제출을 넘깁니다.
    return subs || [];
  }, [subs]);

  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setOpen(-1); };

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['제출 시각', '문제집', '차시', '수업 코드', '학번', '이름', '닉네임', '언어', '종합', '등급', '점수', 'PDF'];
    const lines = [head.map(esc).join(',')];
    rows.forEach((s) => {
      const scores = (s.axes || []).map((a) => `${a.name} ${a.score}`).join(' / ');
      lines.push([fmtDate(s.submittedAt), s.setTitle, s.sessionLabel, s.code, s.studentId, s.name, s.nickname, LANG_KO[s.lang] || s.lang, s.total, isHonor(s) ? '명예' : '예비', scores, s.pdfUrl].map(esc).join(','));
    });
    downloadFile('결과_목록.csv', `﻿${lines.join('\n')}`, 'text/csv');
  };

  return (
    <div className="t-page">
      <div className="t-page-head t-row-between">
        <div>
          <h1 className="t-h1">결과</h1>
          <p className="t-desc">학생들이 제출한 결과물을 모두 볼 수 있어요. 줄을 누르면 선택한 이유와 성찰까지 자세히 보여요. 삭제한 수업의 결과도 남아 있어요.</p>
        </div>
        <div className="t-actions">
          <Button size="sm" variant="secondary" loading={loading} onClick={load}><Icon name="refresh" size={16} /> 새로고침</Button>
          <Button size="sm" variant="secondary" disabled={!rows.length} onClick={exportCsv}>CSV</Button>
        </div>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      <div className="t-card t-filters">
        <label className="field">
          <span className="field-label">문제집</span>
          <select className="field-input" value={f.set} onChange={(e) => set({ set: e.target.value, session: '', cls: '' })}>
            <option value="">전체</option>
            {options.sets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">차시</span>
          <select className="field-input" value={f.session} onChange={(e) => set({ session: e.target.value, cls: '' })}>
            <option value="">전체</option>
            {options.sessions.map((s) => <option key={s.code} value={s.code}>{s.label || '차시 이름 없음'} ({s.code})</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">반</span>
          <select className="field-input" value={f.cls} onChange={(e) => set({ cls: e.target.value })}>
            <option value="">전체</option>
            {options.classes.map((k) => { const [g, c] = k.split('-'); return <option key={k} value={k}>{g}학년 {c}반</option>; })}
          </select>
        </label>
        <label className="field">
          <span className="field-label">이름 · 학번 검색</span>
          <input className="field-input" value={f.q} placeholder="예) 홍길동, 30215" onChange={(e) => set({ q: e.target.value })} />
        </label>
        <label className="t-inline t-filter-toggle">
          <Toggle label="학생별 최근 제출만" checked={f.latest} onChange={(v) => set({ latest: v })} />
          <span>학생별 최근 제출만</span>
        </label>
      </div>

      {subs === null ? <Spinner label="불러오는 중…" /> : rows.length === 0 ? (
        <p className="t-empty">{(subs || []).length ? '조건에 맞는 결과가 없어요.' : '아직 제출된 결과가 없어요.'}</p>
      ) : (
        <>
          <p className="t-muted t-small">{rows.length}건</p>
          <div className="t-table-wrap">
            <table className="t-table t-table-click">
              <thead><tr><th>제출 시각</th><th>문제집 · 차시</th><th>학번</th><th>이름</th><th>언어</th><th>종합</th><th>등급</th><th /></tr></thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.submissionId || i} onClick={() => setOpen(i)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(i); }}>
                    <td>{fmtDate(s.submittedAt)}</td>
                    <td className="t-td-wrap">{s.setTitle}<span className="t-muted"> · {s.sessionLabel || s.code}</span></td>
                    <td>{s.studentId}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{LANG_KO[s.lang] || s.lang}</td>
                    <td>{s.total}</td>
                    <td>{isHonor(s) ? <span className="badge badge-done">명예</span> : <span className="badge badge-play">예비</span>}</td>
                    <td className="t-td-open">결과 보기 <Icon name="chevronRight" size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open >= 0 && rows[open] ? (
        <ResultPanel list={rows} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} allSubs={filtered} />
      ) : null}
    </div>
  );
}
