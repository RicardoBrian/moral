import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Sheet, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { L } from '../lib/localize.js';
import { navigate, startPreview } from '../lib/router.js';
import { normalizeSet } from '../data/setModel.js';
import { randomId } from '../lib/rand.js';
import { fmtDate, errorText, downloadFile, safeFileName } from './tutils.js';
import { Toast } from './SessionsPage.jsx';

export default function SetsPage({ api, onAuthError }) {
  const [sets, setSets] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [del, setDel] = useState(null);
  const [busyId, setBusyId] = useState('');
  const fileRef = useRef(null);

  const fail = useCallback((e) => { if (!onAuthError(e)) setToast(errorText(e)); }, [onAuthError]);

  const load = useCallback(async () => {
    try {
      setSets(await api.listSets());
      setError('');
    } catch (e) {
      if (!onAuthError(e)) setError(errorText(e));
      setSets((s) => s || []);
    }
  }, [api, onAuthError]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const withSet = async (id, fn) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn(await api.getSet(id));
    } catch (e) {
      fail(e);
    } finally {
      setBusyId('');
    }
  };

  const duplicate = (id) => withSet(id, async (s) => {
    const copy = { ...s, id: randomId('set'), title: { ...s.title, ko: `${L(s.title, 'ko')} (복사본)` } };
    await api.saveSet(copy);
    setToast('복사본을 만들었어요.');
    load();
  });

  const exportSet = (id) => withSet(id, async (s) => {
    downloadFile(`${safeFileName(L(s.title, 'ko'))}.json`, JSON.stringify(s, null, 2));
  });

  const preview = (id) => withSet(id, async (s) => startPreview(s));

  const importFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      // 가져온 문제집은 항상 새 문제집으로 저장해 기존 것을 덮어쓰지 않게 합니다.
      const s = normalizeSet({ ...raw, id: randomId('set') });
      if (!s.stages.length) throw new Error('문제집 형식이 아니에요.');
      await api.saveSet(s);
      setToast(`"${L(s.title, 'ko') || '제목 없음'}" 문제집을 가져왔어요.`);
      load();
    } catch (ex) {
      setToast(ex instanceof SyntaxError ? 'JSON 파일을 읽지 못했어요.' : errorText(ex));
    }
  };

  const remove = async () => {
    const id = del.id;
    setDel(null);
    try {
      await api.deleteSet(id);
      setSets((list) => list.filter((s) => s.id !== id));
      setToast('문제집을 삭제했어요.');
    } catch (e) {
      fail(e);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-head t-row-between">
        <div>
          <h1 className="t-h1">문제집</h1>
          <p className="t-desc">딜레마 문제를 묶은 문제집을 만들고 고칠 수 있어요. 한국어로 쓰면 영어·중국어·러시아어는 자동 번역할 수 있어요.</p>
        </div>
        <div className="t-actions">
          <Button size="md" variant="secondary" onClick={() => fileRef.current && fileRef.current.click()}>가져오기</Button>
          <Button size="md" onClick={() => navigate('/teacher/sets/new')}><Icon name="plus" size={18} /> 새 문제집</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
        </div>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}

      {sets === null ? <Spinner /> : sets.length === 0 ? <p className="t-empty">문제집이 없어요. 새 문제집을 만들어 보세요.</p> : (
        <div className="t-set-grid">
          {sets.map((s) => (
            <article className="t-card t-set" key={s.id}>
              <h2 className="t-h3">{L(s.title, 'ko') || '(제목 없음)'}</h2>
              <p className="t-muted">스테이지 {s.stages}개 · 딜레마 {s.dilemmas}개 · 수정 {fmtDate(s.updatedAt)}</p>
              <div className="t-set-actions">
                <Button size="sm" onClick={() => navigate(`/teacher/sets/${encodeURIComponent(s.id)}`)}>편집</Button>
                <Button size="sm" variant="secondary" loading={busyId === s.id} onClick={() => preview(s.id)}>미리보기</Button>
                <Button size="sm" variant="ghost" onClick={() => duplicate(s.id)}>복제</Button>
                <Button size="sm" variant="ghost" onClick={() => exportSet(s.id)}>내보내기</Button>
                <Button size="sm" variant="ghost" onClick={() => setDel(s)}><Icon name="trash" size={16} /></Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet
        open={!!del}
        onClose={() => setDel(null)}
        title={del ? `"${L(del.title, 'ko') || '제목 없음'}"을(를) 삭제할까요?` : ''}
        actions={<><Button variant="secondary" onClick={() => setDel(null)}>취소</Button><Button variant="danger" onClick={remove}>삭제</Button></>}
      >
        <p className="sheet-desc">삭제하면 되돌릴 수 없어요. 필요하면 먼저 ‘내보내기’로 백업해 두세요. 이미 제출된 학생 결과는 지워지지 않아요.</p>
      </Sheet>
      <Toast msg={toast} />
    </div>
  );
}
