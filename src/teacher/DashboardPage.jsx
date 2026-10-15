import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Segmented, Toggle, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { L } from '../lib/localize.js';
import { navigate } from '../lib/router.js';
import { fmtDate, errorText, downloadFile, safeFileName } from './tutils.js';
import { Toast } from './SessionsPage.jsx';
import ResultPanel from './ResultPanel.jsx';

const STEP_LABEL = { start: '시작', stage1: '1단계 완료', stage2: '2단계 완료', stage3: '3단계 완료', stage4: '4단계 완료', stage5: '5단계 완료' };
const classKey = (r) => `${r.grade}-${r.classNo}`;
const classLabel = (k) => { const [g, c] = k.split('-'); return `${g}학년 ${c}반`; };

/** 같은 학생이 여러 번 제출했다면 가장 최근 것만 집계에 씁니다. */
function latestByStudent(subs) {
  const map = new Map();
  subs.forEach((s) => {
    const prev = map.get(s.studentId);
    if (!prev || String(s.submittedAt) > String(prev.submittedAt)) map.set(s.studentId, s);
  });
  return [...map.values()];
}

export default function DashboardPage({ api, code, onAuthError }) {
  const [data, setData] = useState(null);
  const [set, setSet] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('students');
  const [cls, setCls] = useState('all');
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [open, setOpen] = useState({});
  const [toast, setToast] = useState('');
  const [detail, setDetail] = useState(-1);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const d = await api.dashboard(code);
      setData(d);
      setError('');
      setUpdatedAt(new Date());
      if (d.session && (!set || set.id !== d.session.setId)) {
        try { setSet(await api.getSet(d.session.setId)); } catch (e) { /* 문제집이 지워졌다면 제출 기록만으로 보여 줍니다 */ }
      }
    } catch (e) {
      if (!onAuthError(e)) setError(errorText(e));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [api, code, onAuthError, set]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 결과 창을 보는 동안에는 자동 새로고침을 멈춰 화면이 바뀌지 않게 합니다.
  useEffect(() => {
    if (!auto || detail >= 0) return undefined;
    const t = setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => clearInterval(t);
  }, [auto, load, detail]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const view = useMemo(() => {
    if (!data) return null;
    const allSubs = latestByStudent(data.submissions || []);
    // 진행 상황: 학생별 마지막 기록
    const prog = new Map();
    (data.progress || []).forEach((p) => {
      const prev = prog.get(p.studentId);
      if (!prev || String(p.at) > String(prev.at)) prog.set(p.studentId, p);
    });
    const students = new Map();
    prog.forEach((p, id) => {
      const g = Number(String(id)[0]);
      const c = Number(String(id).slice(1, 3));
      students.set(id, { studentId: id, name: p.name, nickname: p.nickname, grade: g, classNo: c, status: 'playing', step: p.step, at: p.at });
    });
    allSubs.forEach((s) => {
      students.set(s.studentId, { ...students.get(s.studentId), ...s, status: 'done', at: s.submittedAt });
    });
    const classes = [...new Set([...students.values()].map(classKey))].sort();
    const inClass = (r) => cls === 'all' || classKey(r) === cls;
    const list = [...students.values()].filter(inClass).sort((a, b) => String(a.studentId).localeCompare(String(b.studentId)));
    const subs = allSubs.filter(inClass).sort((a, b) => String(a.studentId).localeCompare(String(b.studentId)));
    const everySub = (data.submissions || []).filter(inClass);
    const avg = subs.length ? Math.round(subs.reduce((n, s) => n + (Number(s.total) || 0), 0) / subs.length) : 0;
    return { list, subs, everySub, classes, avg, honor: subs.filter((s) => s.honorary === true || s.honorary === 'TRUE').length };
  }, [data, cls]);

  // 딜레마별 선택 분포 (문제집이 있으면 아무도 고르지 않은 선택지도 0%로 보여 줌)
  const distribution = useMemo(() => {
    if (!view) return [];
    const rows = [];
    if (set) {
      set.stages.forEach((st, si) => st.dilemmas.forEach((d, di) => {
        rows.push({
          id: d.id, label: `${si + 1}-${di + 1}`, title: L(d.title, 'ko'), stage: L(st.title, 'ko'),
          choices: d.choices.map((c, ci) => ({ id: c.id, no: ci + 1, text: L(c.text, 'ko'), picks: [] })),
        });
      }));
    }
    view.subs.forEach((s) => (s.answers || []).forEach((a) => {
      let row = rows.find((r) => r.id === a.dilemmaId);
      if (!row) {
        row = { id: a.dilemmaId, label: `${(a.stageIndex ?? 0) + 1}-${(a.dilemmaIndex ?? 0) + 1}`, title: a.dilemmaTitle, stage: '', choices: [] };
        rows.push(row);
      }
      let ch = row.choices.find((c) => c.id === a.choiceId);
      if (!ch) {
        ch = { id: a.choiceId, no: a.choiceNo, text: a.choiceText, picks: [] };
        row.choices.push(ch);
      }
      ch.picks.push({ studentId: s.studentId, name: s.name, reason: a.reason, reasonKo: a.reasonKo });
    }));
    return rows;
  }, [view, set]);

  const reflectionsByStage = useMemo(() => {
    if (!view) return [];
    const map = new Map();
    if (set) set.stages.forEach((st, i) => map.set(st.id, { id: st.id, title: `${i + 1}. ${L(st.title, 'ko')}`, items: [] }));
    view.subs.forEach((s) => (s.reflections || []).forEach((r) => {
      if (!map.has(r.stageId)) map.set(r.stageId, { id: r.stageId, title: r.stageTitle, items: [] });
      map.get(r.stageId).items.push({ studentId: s.studentId, name: s.name, text: r.text, textKo: r.textKo, lang: s.lang });
    }));
    return [...map.values()].map((g) => ({ ...g, items: g.items.sort((a, b) => String(a.studentId).localeCompare(String(b.studentId))) }));
  }, [view, set]);

  const exportCsv = () => {
    if (!view) return;
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const axes = (view.subs[0] && view.subs[0].axes) || [];
    const header = ['학번', '이름', '닉네임', '언어', ...axes.map((a) => a.name), '종합', '등급', '제출 시각'];
    const lines = [header.map(esc).join(',')];
    view.subs.forEach((s) => {
      lines.push([s.studentId, s.name, s.nickname, s.lang, ...axes.map((a) => (s.scores || {})[a.id]), s.total, s.honorary ? '명예' : '예비', fmtDate(s.submittedAt)].map(esc).join(','));
    });
    downloadFile(`${safeFileName(code)}_결과.csv`, `﻿${lines.join('\n')}`, 'text/csv');
  };

  const openStudent = (studentId) => {
    const i = view ? view.subs.findIndex((x) => x.studentId === studentId) : -1;
    if (i >= 0) setDetail(i);
  };

  if (!data && !error) return <div className="t-page"><Spinner label="불러오는 중…" /></div>;

  const session = data && data.session;

  return (
    <div className="t-page">
      <button type="button" className="text-btn t-back" onClick={() => navigate('/teacher')}><Icon name="back" size={18} /> 수업 목록</button>
      <div className="t-page-head t-dash-head">
        <div>
          <h1 className="t-h1">{code} 현황</h1>
          {session ? <p className="t-desc">{[set ? L(set.title, 'ko') : '', session.label, session.active ? '' : '종료된 수업'].filter(Boolean).join(' · ')}</p> : null}
        </div>
        <div className="t-dash-tools">
          <label className="t-inline"><Toggle label="자동 새로고침" checked={auto} onChange={setAuto} /><span>20초마다 새로고침</span></label>
          <Button size="sm" variant="secondary" loading={loading} onClick={load}><Icon name="refresh" size={16} /> 새로고침</Button>
          <Button size="sm" variant="secondary" onClick={exportCsv}>CSV</Button>
        </div>
      </div>
      {updatedAt ? <p className="t-muted t-updated">마지막 업데이트 {fmtDate(updatedAt.toISOString())}</p> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}

      {view ? (
        <>
          {view.classes.length > 1 ? (
            <div className="t-filter">
              <Segmented
                size="sm"
                ariaLabel="반 선택"
                value={cls}
                onChange={setCls}
                options={[{ value: 'all', label: '전체' }, ...view.classes.map((k) => ({ value: k, label: classLabel(k) }))]}
              />
            </div>
          ) : null}

          <div className="t-stats">
            <div className="t-stat"><span>참여</span><strong>{view.list.length}</strong></div>
            <div className="t-stat"><span>제출 완료</span><strong>{view.subs.length}</strong></div>
            <div className="t-stat"><span>평균 점수</span><strong>{view.subs.length ? view.avg : '-'}</strong></div>
            <div className="t-stat"><span>명예 등급</span><strong>{view.honor}</strong></div>
          </div>

          <Segmented
            ariaLabel="보기"
            value={tab}
            onChange={setTab}
            options={[{ value: 'students', label: '학생 현황' }, { value: 'choices', label: '선택 분포' }, { value: 'reflections', label: '성찰 모아보기' }]}
          />

          {tab === 'students' ? (
            <div className="t-table-wrap">
              {view.subs.length ? <p className="t-muted t-small t-table-hint">제출한 학생을 누르면 선택한 이유와 성찰을 자세히 볼 수 있어요.</p> : null}
              {view.list.length === 0 ? <p className="t-empty">아직 들어온 학생이 없어요.</p> : (
                <table className="t-table">
                  <thead><tr><th>학번</th><th>이름</th><th>닉네임</th><th>상태</th><th>종합</th><th>등급</th><th>시각</th><th /></tr></thead>
                  <tbody>
                    {view.list.map((r) => (
                      <tr
                        key={r.studentId}
                        className={r.status === 'done' ? 't-row-click' : ''}
                        onClick={r.status === 'done' ? () => openStudent(r.studentId) : undefined}
                        tabIndex={r.status === 'done' ? 0 : undefined}
                        onKeyDown={r.status === 'done' ? (e) => { if (e.key === 'Enter') openStudent(r.studentId); } : undefined}
                      >
                        <td>{r.studentId}</td>
                        <td>{r.name}</td>
                        <td>{r.nickname}</td>
                        <td>{r.status === 'done' ? <span className="badge badge-done">제출 완료</span> : <span className="badge badge-play">진행 중 · {STEP_LABEL[r.step] || r.step}</span>}</td>
                        <td>{r.status === 'done' ? r.total : '-'}</td>
                        <td>{r.status === 'done' ? (r.honorary === true || r.honorary === 'TRUE' ? '명예' : '예비') : '-'}</td>
                        <td>{fmtDate(r.at)}</td>
                        <td>{r.status === 'done' ? <span className="t-td-open">결과 보기 <Icon name="chevronRight" size={16} /></span> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {tab === 'choices' ? (
            <div className="t-dist">
              {distribution.length === 0 ? <p className="t-empty">아직 제출된 결과가 없어요.</p> : distribution.map((row) => {
                const total = row.choices.reduce((n, c) => n + c.picks.length, 0);
                return (
                  <section className="t-card" key={row.id}>
                    <h3 className="t-h3"><span className="t-tag">{row.label}</span> {row.title}</h3>
                    <div className="t-bars">
                      {row.choices.map((c) => {
                        const pct = total ? Math.round((c.picks.length / total) * 100) : 0;
                        const k = `${row.id}:${c.id}`;
                        return (
                          <div className="t-bar" key={c.id}>
                            <button type="button" className="t-bar-head" onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))} aria-expanded={!!open[k]}>
                              <span className="t-bar-text">{c.text}</span>
                              <span className="t-bar-num">{c.picks.length}명 · {pct}%</span>
                            </button>
                            <div className="t-bar-track"><div className="t-bar-fill" style={{ width: `${pct}%` }} /></div>
                            {open[k] ? (
                              <ul className="t-reasons">
                                {c.picks.length === 0 ? <li className="t-muted">이 선택을 한 학생이 없어요.</li> : c.picks.map((p) => (
                                  <li key={p.studentId}>
                                    <button type="button" className="t-name-link" onClick={() => openStudent(p.studentId)}>{p.studentId} {p.name}</button>
                                    <span>{p.reasonKo || p.reason}</span>
                                    {p.reasonKo && p.reasonKo !== p.reason ? <em className="t-orig">원문: {p.reason}</em> : null}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {total ? <p className="t-muted t-hint">선택지를 누르면 학생들이 쓴 이유를 볼 수 있어요.</p> : null}
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === 'reflections' ? (
            <div className="t-dist">
              {reflectionsByStage.every((g) => g.items.length === 0) ? <p className="t-empty">아직 제출된 성찰이 없어요.</p> : reflectionsByStage.map((g) => (
                <section className="t-card" key={g.id}>
                  <h3 className="t-h3">{g.title}</h3>
                  <ul className="t-reasons">
                    {g.items.map((it) => (
                      <li key={it.studentId}>
                        <button type="button" className="t-name-link" onClick={() => openStudent(it.studentId)}>{it.studentId} {it.name}</button>
                        <span>{it.textKo || it.text}</span>
                        {it.textKo && it.textKo !== it.text ? <em className="t-orig">원문: {it.text}</em> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {detail >= 0 && view && view.subs[detail] ? (
        <ResultPanel list={view.subs} index={detail} onIndex={setDetail} onClose={() => setDetail(-1)} allSubs={view.everySub} />
      ) : null}
      <Toast msg={toast} />
    </div>
  );
}
