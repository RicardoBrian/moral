import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Segmented, Sheet, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { L, LANGS, LANG_NAMES } from '../lib/localize.js';
import { navigate, startPreview } from '../lib/router.js';
import { MOODS } from '../lib/audio.js';
import { randomId } from '../lib/rand.js';
import { DEFAULT_SET } from '../data/defaultSet.js';
import {
  AXIS_COLORS, LIMITS, blankSet, blankStage, blankDilemma, blankChoice,
  normalizeSet, validateSet, countMissingTranslations, walkTexts,
} from '../data/setModel.js';
import { errorText } from './tutils.js';
import { Toast } from './SessionsPage.jsx';

const LANG_OPTS = LANGS.map((l) => ({ value: l, label: l === 'ko' ? '한국어' : LANG_NAMES[l] }));

/** 다국어 입력칸. 한국어가 아닌 언어를 고치는 중이면 한국어 원문을 위에 보여 줍니다. */
function LField({ label, field, lang, onChange, multiline, placeholder, required, rows = 3 }) {
  const value = (field && field[lang]) || '';
  const ko = (field && field.ko) || '';
  const Tag = multiline ? 'textarea' : 'input';
  const missing = required && lang === 'ko' && !ko.trim();
  return (
    <div className={`field t-lfield ${missing ? 'is-missing' : ''}`}>
      <span className="field-label">{label}{required ? <em className="t-req">필수</em> : null}</span>
      {lang !== 'ko' ? <p className="t-ko-ref">{ko || '(한국어 내용 없음)'}</p> : null}
      <Tag
        className={`field-input ${multiline ? 'field-textarea' : ''}`}
        value={value}
        rows={multiline ? rows : undefined}
        placeholder={lang !== 'ko' ? `${LANG_NAMES[lang]} 번역` : placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function MoveButtons({ index, length, onMove, onRemove, min = 0, what }) {
  return (
    <div className="t-move">
      <button type="button" className="icon-btn sm" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`${what} 위로`}><Icon name="up" size={18} /></button>
      <button type="button" className="icon-btn sm" disabled={index === length - 1} onClick={() => onMove(index, index + 1)} aria-label={`${what} 아래로`}><Icon name="down" size={18} /></button>
      <button type="button" className="icon-btn sm danger" disabled={length <= min} onClick={() => onRemove(index)} aria-label={`${what} 삭제`}><Icon name="trash" size={18} /></button>
    </div>
  );
}

const moveItem = (arr, from, to) => {
  if (to < 0 || to >= arr.length) return;
  const [it] = arr.splice(from, 1);
  arr.splice(to, 0, it);
};

export default function SetEditor({ api, setId, onAuthError }) {
  const [set, setSet] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [dirty, setDirty] = useState(false);
  const [lang, setLang] = useState('ko');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [openStage, setOpenStage] = useState({ 0: true });
  const [showErrors, setShowErrors] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!setId) {
      setSet(blankSet(DEFAULT_SET.axes));
      return undefined;
    }
    api.getSet(setId).then((s) => { if (alive) setSet(s); }).catch((e) => { if (alive && !onAuthError(e)) setLoadErr(errorText(e)); });
    return () => { alive = false; };
  }, [api, setId, onAuthError]);

  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const mutate = useCallback((fn) => {
    setSet((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  }, []);

  const errors = useMemo(() => (set ? validateSet(set) : []), [set]);
  const missing = useMemo(() => (set ? countMissingTranslations(set) : 0), [set]);

  const save = async () => {
    if (saving || translating) return null;
    setSaving(true);
    try {
      const saved = await api.saveSet(normalizeSet(set));
      setDirty(false);
      setSet(saved);
      // 새 문제집은 주소만 바꿔 둡니다. (화면을 다시 불러오지 않아 안내 메시지와 편집 상태가 유지됨)
      if (!setId) window.history.replaceState(null, '', `#/teacher/sets/${encodeURIComponent(saved.id)}`);
      setToast(errors.length ? `저장했어요. 수업에 쓰려면 비어 있는 항목 ${errors.length}개를 채워 주세요.` : '저장했어요.');
      if (errors.length) setShowErrors(true);
      return saved;
    } catch (e) {
      if (!onAuthError(e)) setToast(errorText(e));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const translate = async (onlyMissing) => {
    if (translating) return;
    if (api.mode === 'local') { setToast('자동 번역은 Google Apps Script 서버를 연결한 뒤에 쓸 수 있어요.'); return; }
    setTranslating(true);
    try {
      // 한 번에 다 못 끝내면(서버가 80초마다 끊어서 돌려줌) 남은 칸을 이어서 번역합니다.
      // ‘전체 다시 번역’은 기존 번역을 비운 뒤 빈 칸 번역과 같은 방식으로 처리합니다.
      const start = normalizeSet(set);
      if (!onlyMissing) walkTexts(start, (f) => { f.en = ''; f.zh = ''; f.ru = ''; });
      let r = await api.translateSet(start, true);
      for (let round = 0; r.partial && round < 8; round++) {
        setSet(r.set);
        r = await api.translateSet(r.set, true);
      }
      setSet(r.set);
      setDirty(true);
      if (r.partial) setToast('번역이 아직 남았어요. ‘빈 칸 자동 번역’을 한 번 더 눌러 주세요.');
      else if (r.total && r.done < r.total) setToast(`${r.total - r.done}칸은 번역하지 못했어요. 다시 시도하거나 직접 입력해 주세요.`);
      else setToast('번역을 채웠어요. 내용을 확인한 뒤 저장해 주세요.');
    } catch (e) {
      if (!onAuthError(e)) setToast(errorText(e));
    } finally {
      setTranslating(false);
    }
  };

  const preview = async () => {
    if (errors.length) { setShowErrors(true); setToast('비어 있는 필수 항목을 먼저 채워 주세요.'); return; }
    let s = normalizeSet(set);
    if (dirty) {
      const saved = await save();
      if (!saved) return;
      s = saved;
    }
    startPreview(s);
  };

  const leave = () => {
    if (dirty) setConfirmLeave('/teacher/sets');
    else navigate('/teacher/sets');
  };

  if (loadErr) {
    return (
      <div className="t-page">
        <div className="notice notice-error">{loadErr}</div>
        <Button size="md" variant="secondary" onClick={() => navigate('/teacher/sets')}>문제집 목록으로</Button>
      </div>
    );
  }
  if (!set) return <div className="t-page"><Spinner label="불러오는 중…" /></div>;

  const setText = (getter) => (v) => mutate((s) => { getter(s)[lang] = v; });
  const axes = set.axes;

  return (
    <div className="t-page t-editor">
      <div className="t-editor-bar">
        <button type="button" className="text-btn" onClick={leave}><Icon name="back" size={18} /> 목록</button>
        <div className="t-editor-title">{L(set.title, 'ko') || '새 문제집'}{dirty ? <span className="t-dirty">저장 안 됨</span> : null}</div>
        <div className="t-editor-tools">
          <Button size="sm" variant="secondary" onClick={preview}>미리보기</Button>
          <Button size="sm" loading={saving} onClick={save}>저장</Button>
        </div>
      </div>

      <div className="t-card t-lang-card">
        <div className="t-lang-row">
          <span className="field-label">편집할 언어</span>
          <Segmented size="sm" ariaLabel="편집할 언어" value={lang} onChange={setLang} options={LANG_OPTS} />
        </div>
        <div className="t-lang-row">
          <span className="t-muted">{missing ? `번역이 비어 있는 칸 ${missing}개` : '모든 칸이 번역되어 있어요.'}</span>
          <div className="t-actions">
            <Button size="sm" variant="secondary" loading={translating} disabled={!missing} onClick={() => translate(true)}>빈 칸 자동 번역</Button>
            <Button size="sm" variant="ghost" disabled={translating} onClick={() => translate(false)}>전체 다시 번역</Button>
          </div>
        </div>
        <p className="t-muted t-small">한국어로 먼저 쓰고 자동 번역한 뒤, 각 언어를 골라 어색한 부분을 고칠 수 있어요. 한국어를 고친 뒤에는 ‘전체 다시 번역’을 눌러 주세요.</p>
      </div>

      {errors.length ? (
        <div className="notice notice-warn">
          <button type="button" className="t-errors-toggle" onClick={() => setShowErrors((v) => !v)}>
            비어 있는 필수 항목 {errors.length}개 {showErrors ? '접기' : '보기'}
          </button>
          {showErrors ? <ul className="t-errors">{errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
        </div>
      ) : null}

      <fieldset className="t-fieldset" disabled={translating}>
        <section className="t-card">
          <h2 className="t-h2">기본 정보</h2>
          <LField label="문제집 제목" required field={set.title} lang={lang} onChange={setText((s) => s.title)} placeholder="예) 미래를 구하는 세계시민" />
          <LField label="소개" multiline rows={2} field={set.description} lang={lang} onChange={setText((s) => s.description)} placeholder="학생에게 보이지 않는 교사용 메모로도 쓸 수 있어요." />
        </section>

        <section className="t-card">
          <h2 className="t-h2">점수 항목</h2>
          <p className="t-muted t-small">학생의 선택이 어떤 가치에 영향을 주는지 정해요. 1~4개까지 만들 수 있어요.</p>
          <div className="t-axes">
            {axes.map((a, i) => (
              <div className="t-axis" key={a.id}>
                <span className="t-axis-dot" style={{ background: a.color }} />
                <LField label={`항목 ${i + 1}`} required field={a.name} lang={lang} onChange={setText((s) => s.axes[i].name)} placeholder="예) 환경" />
                <div className="t-colors" role="radiogroup" aria-label={`항목 ${i + 1} 색`}>
                  {AXIS_COLORS.map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={a.color === c} aria-label={c} className={`t-color ${a.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => mutate((s) => { s.axes[i].color = c; })} />
                  ))}
                </div>
                <button
                  type="button"
                  className="icon-btn sm danger"
                  disabled={axes.length <= LIMITS.axes[0]}
                  aria-label="항목 삭제"
                  onClick={() => mutate((s) => {
                    const [gone] = s.axes.splice(i, 1);
                    s.stages.forEach((st) => st.dilemmas.forEach((d) => d.choices.forEach((c) => { delete c.effects[gone.id]; })));
                  })}
                ><Icon name="trash" size={18} /></button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={axes.length >= LIMITS.axes[1]}
            onClick={() => mutate((s) => {
              const id = randomId('a');
              s.axes.push({ id, name: { ko: '', en: '', zh: '', ru: '' }, color: AXIS_COLORS[s.axes.length % AXIS_COLORS.length] });
              s.stages.forEach((st) => st.dilemmas.forEach((d) => d.choices.forEach((c) => { c.effects[id] = 0; })));
            })}
          ><Icon name="plus" size={16} /> 항목 추가</Button>

          <div className="t-form-grid t-score-grid">
            <label className="field">
              <span className="field-label">시작 점수</span>
              <input className="field-input" type="number" min={0} max={100} value={set.startScore} onChange={(e) => mutate((s) => { s.startScore = e.target.value === '' ? 0 : Number(e.target.value); })} />
            </label>
            <label className="field">
              <span className="field-label">명예 등급 기준 (평균)</span>
              <input className="field-input" type="number" min={1} max={100} value={set.passScore} onChange={(e) => mutate((s) => { s.passScore = e.target.value === '' ? 1 : Number(e.target.value); })} />
            </label>
          </div>
        </section>

        <details className="t-card t-details">
          <summary className="t-h2">최소 글자 수 (언어별)</summary>
          <p className="t-muted t-small">언어마다 같은 내용을 쓰는 데 필요한 글자 수가 달라서 따로 정해요. 공백은 세지 않아요.</p>
          <table className="t-table t-min-table">
            <thead><tr><th /> {LANGS.map((l) => <th key={l}>{LANG_NAMES[l]}</th>)}</tr></thead>
            <tbody>
              {[['reason', '선택 이유'], ['reflection', '성찰']].map(([k, label]) => (
                <tr key={k}>
                  <th>{label}</th>
                  {LANGS.map((l) => (
                    <td key={l}>
                      <input className="field-input" type="number" min={1} max={300} value={set.minChars[k][l]} aria-label={`${label} ${LANG_NAMES[l]}`} onChange={(e) => mutate((s) => { s.minChars[k][l] = Math.max(1, Number(e.target.value) || 1); })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        <section className="t-card">
          <h2 className="t-h2">마법사 프롤로그</h2>
          <LField label="마법사 이름" field={set.wizard.name} lang={lang} onChange={setText((s) => s.wizard.name)} placeholder="크로노스" />
          {set.wizard.prologue.map((p, i) => (
            <div className="t-row-item" key={i}>
              <LField label={`대사 ${i + 1}`} field={p} lang={lang} onChange={setText((s) => s.wizard.prologue[i])} />
              <MoveButtons what="대사" index={i} length={set.wizard.prologue.length} min={0} onMove={(a, b) => mutate((s) => moveItem(s.wizard.prologue, a, b))} onRemove={(idx) => mutate((s) => { s.wizard.prologue.splice(idx, 1); })} />
            </div>
          ))}
          <Button size="sm" variant="secondary" disabled={set.wizard.prologue.length >= LIMITS.prologue[1]} onClick={() => mutate((s) => { s.wizard.prologue.push({ ko: '', en: '', zh: '', ru: '' }); })}><Icon name="plus" size={16} /> 대사 추가</Button>
        </section>

        {set.stages.map((st, si) => (
          <section className={`t-card t-stage ${openStage[si] ? 'open' : ''}`} key={st.id}>
            <div className="t-stage-head">
              <button type="button" className="t-stage-toggle" aria-expanded={!!openStage[si]} onClick={() => setOpenStage((o) => ({ ...o, [si]: !o[si] }))}>
                <span className="t-stage-dot" style={{ background: st.color }} />
                <span>스테이지 {si + 1} · {L(st.title, 'ko') || '제목 없음'}</span>
                <span className="t-muted">딜레마 {st.dilemmas.length}개</span>
                <Icon name="chevronDown" size={20} className="t-chev" />
              </button>
              <MoveButtons
                what="스테이지"
                index={si}
                length={set.stages.length}
                min={LIMITS.stages[0]}
                onMove={(a, b) => { mutate((s) => moveItem(s.stages, a, b)); setOpenStage({}); }}
                onRemove={(idx) => { if (window.confirm(`스테이지 ${idx + 1}을(를) 삭제할까요?`)) { mutate((s) => { s.stages.splice(idx, 1); }); setOpenStage({}); } }}
              />
            </div>

            {openStage[si] ? (
              <div className="t-stage-body">
                <LField label="스테이지 제목" required field={st.title} lang={lang} onChange={setText((s) => s.stages[si].title)} placeholder="예) 환경과 기후 위기" />
                <div className="t-form-grid">
                  <LField label="시간" field={st.year} lang={lang} onChange={setText((s) => s.stages[si].year)} placeholder="예) 2052년 여름" />
                  <LField label="장소" field={st.place} lang={lang} onChange={setText((s) => s.stages[si].place)} placeholder="예) 해안 도시 네오코스트" />
                </div>
                <LField label="장면 설명" multiline field={st.description} lang={lang} onChange={setText((s) => s.stages[si].description)} />
                <div className="t-form-grid">
                  <label className="field">
                    <span className="field-label">배경음악 분위기</span>
                    <select className="field-input" value={st.mood} onChange={(e) => mutate((s) => { s.stages[si].mood = e.target.value; })}>
                      {Object.entries(MOODS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                    </select>
                  </label>
                  <div className="field">
                    <span className="field-label">색</span>
                    <div className="t-colors">
                      {AXIS_COLORS.map((c) => (
                        <button key={c} type="button" aria-label={c} className={`t-color ${st.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => mutate((s) => { s.stages[si].color = c; })} />
                      ))}
                    </div>
                  </div>
                </div>

                {st.dilemmas.map((d, di) => (
                  <div className="t-dilemma" key={d.id}>
                    <div className="t-dilemma-head">
                      <h3 className="t-h3">딜레마 {si + 1}-{di + 1}</h3>
                      <MoveButtons what="딜레마" index={di} length={st.dilemmas.length} min={LIMITS.dilemmas[0]} onMove={(a, b) => mutate((s) => moveItem(s.stages[si].dilemmas, a, b))} onRemove={(idx) => { if (window.confirm('이 딜레마를 삭제할까요?')) mutate((s) => { s.stages[si].dilemmas.splice(idx, 1); }); }} />
                    </div>
                    <LField label="딜레마 제목" required field={d.title} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].title)} />
                    <LField label="상황 설명" required multiline rows={4} field={d.context} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].context)} placeholder="양쪽 선택 모두 그럴듯한 이유가 있도록 쓰면 토론이 더 풍부해져요." />
                    <div className="t-form-grid">
                      <LField label="생각 도움말 (학생이 열어 볼 수 있어요)" multiline rows={2} field={d.hint} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].hint)} />
                      <LField label="마법사 한마디" multiline rows={2} field={d.wizardLine} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].wizardLine)} />
                    </div>

                    <div className="t-choices">
                      {d.choices.map((c, ci) => {
                        const sum = axes.reduce((n, a) => n + (Number(c.effects[a.id]) || 0), 0);
                        return (
                          <div className="t-choice" key={c.id}>
                            <div className="t-choice-head">
                              <strong>선택지 {ci + 1}</strong>
                              <span className={`t-tone ${sum > 0 ? 'pos' : sum < 0 ? 'neg' : ''}`}>{sum > 0 ? '긍정적 결과' : sum < 0 ? '부정적 결과' : '중립'}</span>
                              <MoveButtons what="선택지" index={ci} length={d.choices.length} min={LIMITS.choices[0]} onMove={(a, b) => mutate((s) => moveItem(s.stages[si].dilemmas[di].choices, a, b))} onRemove={(idx) => mutate((s) => { s.stages[si].dilemmas[di].choices.splice(idx, 1); })} />
                            </div>
                            <LField label="선택지 내용" required multiline rows={2} field={c.text} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].choices[ci].text)} />
                            <div className="t-effects">
                              {axes.map((a) => (
                                <label className="t-effect" key={a.id}>
                                  <span><i style={{ background: a.color }} />{L(a.name, 'ko') || '항목'}</span>
                                  <input
                                    className="field-input"
                                    type="number"
                                    min={LIMITS.effect[0]}
                                    max={LIMITS.effect[1]}
                                    step={5}
                                    value={c.effects[a.id] ?? 0}
                                    onChange={(e) => mutate((s) => { s.stages[si].dilemmas[di].choices[ci].effects[a.id] = Math.max(LIMITS.effect[0], Math.min(LIMITS.effect[1], Number(e.target.value) || 0)); })}
                                  />
                                </label>
                              ))}
                            </div>
                            <LField label="결과 제목" required field={c.feedbackTitle} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].choices[ci].feedbackTitle)} placeholder="예) 바다가 다시 살아났어요" />
                            <LField label="결과 설명" required multiline rows={2} field={c.feedback} lang={lang} onChange={setText((s) => s.stages[si].dilemmas[di].choices[ci].feedback)} />
                          </div>
                        );
                      })}
                      <Button size="sm" variant="secondary" disabled={d.choices.length >= LIMITS.choices[1]} onClick={() => mutate((s) => { s.stages[si].dilemmas[di].choices.push(blankChoice(s.axes)); })}><Icon name="plus" size={16} /> 선택지 추가 (최대 4개)</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="secondary" disabled={st.dilemmas.length >= LIMITS.dilemmas[1]} onClick={() => mutate((s) => { s.stages[si].dilemmas.push(blankDilemma(s.axes)); })}><Icon name="plus" size={16} /> 딜레마 추가</Button>

                <div className="t-reflection">
                  <h3 className="t-h3">스테이지 성찰</h3>
                  <LField label="성찰 제목" field={st.reflection.title} lang={lang} onChange={setText((s) => s.stages[si].reflection.title)} placeholder="예) 환경을 위한 나의 약속" />
                  <LField label="성찰 질문" required multiline rows={2} field={st.reflection.guide} lang={lang} onChange={setText((s) => s.stages[si].reflection.guide)} />
                  <LField label="예시 문장 (입력칸에 흐리게 보여요)" field={st.reflection.placeholder} lang={lang} onChange={setText((s) => s.stages[si].reflection.placeholder)} />
                </div>
              </div>
            ) : null}
          </section>
        ))}
        <Button
          size="md"
          variant="secondary"
          disabled={set.stages.length >= LIMITS.stages[1]}
          onClick={() => { mutate((s) => { s.stages.push(blankStage(s.axes, 2, s.stages.length)); }); setOpenStage({ [set.stages.length]: true }); }}
        ><Icon name="plus" size={18} /> 스테이지 추가</Button>
      </fieldset>

      {translating ? (
        <div className="t-overlay" role="status">
          <Spinner label="번역하는 중이에요. 문제집 크기에 따라 1~3분 걸릴 수 있어요." />
        </div>
      ) : null}

      <Sheet
        open={!!confirmLeave}
        onClose={() => setConfirmLeave(null)}
        title="저장하지 않은 내용이 있어요"
        actions={(
          <>
            <Button variant="secondary" onClick={() => { const to = confirmLeave; setConfirmLeave(null); setDirty(false); navigate(to); }}>저장 안 하고 나가기</Button>
            <Button onClick={async () => { const to = confirmLeave; setConfirmLeave(null); const ok = await save(); if (ok) navigate(to); }}>저장하고 나가기</Button>
          </>
        )}
      >
        <p className="sheet-desc">나가면 바뀐 내용이 사라져요.</p>
      </Sheet>
      <Toast msg={toast} />
    </div>
  );
}
