import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { fmtDate } from './tutils.js';

const LANG_KO = { ko: '한국어', en: '영어', zh: '중국어', ru: '러시아어' };
const isHonor = (r) => r.honorary === true || r.honorary === 'TRUE' || r.honorary === 'true';

function levelText(v) {
  if (v >= 70) return ['잘 지켜짐', 'high'];
  if (v >= 40) return ['보통', 'mid'];
  return ['위험', 'low'];
}

/** 이유·성찰: 한국어(번역)를 먼저, 원문이 다르면 아래에 함께 보여 줍니다. */
function Bilingual({ ko, orig }) {
  const main = ko || orig || '';
  return (
    <>
      <p className="t-rp-text">{main}</p>
      {ko && orig && ko !== orig ? <p className="t-rp-orig">원문 · {orig}</p> : null}
    </>
  );
}

/**
 * 학생 한 명의 결과 상세.
 * list: 넘겨 볼 수 있는 결과 목록 (학생별 최신 제출), index: 지금 보는 위치
 * allSubs: 같은 학생의 이전 제출을 찾기 위한 전체 제출 목록
 */
export default function ResultPanel({ list, index, onIndex, onClose, allSubs }) {
  const current = list[index];
  const versions = useMemo(() => {
    if (!current) return [];
    return (allSubs || list)
      .filter((s) => s.studentId === current.studentId && s.code === current.code)
      .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  }, [current, allSubs, list]);
  const [versionId, setVersionId] = useState(null);
  useEffect(() => { setVersionId(null); }, [index]);
  const rec = (versionId && versions.find((v) => v.submissionId === versionId)) || current;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < list.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('t-rp-open');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('t-rp-open'); };
  }, [index, list.length, onClose, onIndex]);

  if (!rec) return null;
  const honor = isHonor(rec);
  const axes = Array.isArray(rec.axes) && rec.axes.length
    ? rec.axes
    : Object.keys(rec.scores || {}).map((k) => ({ id: k, name: k, score: rec.scores[k] }));
  const stageGroups = [];
  (rec.answers || []).forEach((a) => {
    const si = Number(a.stageIndex) || 0;
    if (!stageGroups[si]) stageGroups[si] = { answers: [], reflection: null };
    stageGroups[si].answers.push(a);
  });
  (rec.reflections || []).forEach((r) => {
    const si = Number(r.stageIndex) || 0;
    if (!stageGroups[si]) stageGroups[si] = { answers: [], reflection: null };
    stageGroups[si].reflection = r;
  });

  return createPortal(
    <div className="t-rp-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-rp" role="dialog" aria-modal="true" aria-label={`${rec.name} 학생 결과`}>
        <div className="t-rp-bar no-print">
          <div className="t-rp-nav">
            <button type="button" className="icon-btn" disabled={index <= 0} onClick={() => onIndex(index - 1)} aria-label="이전 학생"><Icon name="back" /></button>
            <span className="t-muted">{index + 1} / {list.length}</span>
            <button type="button" className="icon-btn" disabled={index >= list.length - 1} onClick={() => onIndex(index + 1)} aria-label="다음 학생"><Icon name="chevronRight" /></button>
          </div>
          <div className="t-rp-tools">
            {rec.pdfUrl ? (
              <a className="btn btn-secondary btn-sm" href={rec.pdfUrl} target="_blank" rel="noreferrer"><span className="btn-label"><Icon name="external" size={16} /> 드라이브 PDF</span></a>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => window.print()}><Icon name="print" size={16} /> 인쇄</Button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
          </div>
        </div>

        <div className="t-rp-body">
          <header className="t-rp-head">
            <div>
              <p className="t-rp-meta">{[rec.setTitle, rec.sessionLabel, rec.code].filter(Boolean).join(' · ')}</p>
              <h2 className="t-rp-name">{rec.name} <span>{rec.studentId}</span></h2>
              <p className="t-rp-meta">
                {rec.grade}학년 {rec.classNo}반 {rec.number}번 · 닉네임 {rec.nickname || '-'} · {LANG_KO[rec.lang] || rec.lang || '한국어'}로 진행 · 제출 {fmtDate(rec.submittedAt)}
              </p>
            </div>
            <div className={`t-rp-grade ${honor ? 'honor' : ''}`}>
              <span>{honor ? '명예 세계시민' : '예비 세계시민'}</span>
              <strong>{rec.total}</strong>
            </div>
          </header>

          {versions.length > 1 ? (
            <div className="t-rp-versions no-print">
              <span className="t-muted">이 학생은 {versions.length}번 제출했어요.</span>
              <select className="field-input" value={rec.submissionId} onChange={(e) => setVersionId(e.target.value)} aria-label="제출 선택">
                {versions.map((v, i) => (
                  <option key={v.submissionId} value={v.submissionId}>{i === 0 ? '최근 제출' : `${versions.length - i}번째 제출`} · {fmtDate(v.submittedAt)} · {v.total}점</option>
                ))}
              </select>
            </div>
          ) : null}

          <section className="t-rp-scores">
            {axes.map((a) => {
              const v = Number(a.score) || 0;
              const [lv, cls] = levelText(v);
              return (
                <div className="t-rp-score" key={a.id}>
                  <div className="t-rp-score-head"><span>{a.name}</span><em className={`lv-${cls}`}>{lv}</em><strong>{v}</strong></div>
                  <div className="t-bar-track"><div className="t-bar-fill" style={{ width: `${v}%` }} /></div>
                </div>
              );
            })}
          </section>

          {stageGroups.map((g, si) => (g ? (
            <section className="t-rp-stage" key={si}>
              <h3 className="t-h3">스테이지 {si + 1}{g.reflection && g.reflection.stageTitle ? ` · ${g.reflection.stageTitle}` : ''}</h3>
              {g.answers.map((a) => (
                <div className="t-rp-item" key={a.dilemmaId}>
                  <p className="t-rp-q"><span className="t-tag">{si + 1}-{(Number(a.dilemmaIndex) || 0) + 1}</span> {a.dilemmaTitle}</p>
                  <p className="t-rp-choice">선택 · {a.choiceText}</p>
                  <div className="t-rp-reason">
                    <span className="t-rp-label">이유</span>
                    <Bilingual ko={a.reasonKo} orig={a.reason} />
                  </div>
                </div>
              ))}
              {g.reflection ? (
                <div className="t-rp-reflection">
                  <span className="t-rp-label">성찰 · 실천 약속</span>
                  <Bilingual ko={g.reflection.textKo} orig={g.reflection.text} />
                </div>
              ) : null}
            </section>
          ) : null))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
