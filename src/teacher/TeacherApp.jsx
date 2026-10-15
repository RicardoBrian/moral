import React, { useState } from 'react';
import { Button, TextField } from '../components/ui.jsx';
import { useHashRoute, navigate } from '../lib/router.js';
import { sessionGet, sessionSet } from '../lib/storage.js';
import { ADMIN_KEY } from '../api/remote.js';
import { errorText } from './tutils.js';
import SessionsPage from './SessionsPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import SetsPage from './SetsPage.jsx';
import SetEditor from './SetEditor.jsx';
import HelpPage from './HelpPage.jsx';
import ResultsPage from './ResultsPage.jsx';

function Login({ api, onDone }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pw || loading) return;
    setLoading(true);
    setErr('');
    try {
      await api.login(pw);
      sessionSet(ADMIN_KEY, pw);
      onDone();
    } catch (ex) {
      setErr(errorText(ex));
    } finally {
      setLoading(false);
    }
  };
  return (
    <form className="t-login" onSubmit={submit}>
      <h1 className="title-lg">교사용 화면</h1>
      <p className="desc">Cloudflare 에 ADMIN_PASSWORD 로 넣어 둔 관리자 비밀번호를 입력해 주세요.</p>
      <TextField id="t-pw" type="password" label="관리자 비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} error={err} autoComplete="current-password" />
      <Button block loading={loading} onClick={submit}>들어가기</Button>
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      <a className="text-btn t-login-back" href="#/">학생 화면으로</a>
    </form>
  );
}

const TABS = [
  { path: '/teacher', label: '수업' },
  { path: '/teacher/results', label: '결과' },
  { path: '/teacher/sets', label: '문제집' },
  { path: '/teacher/help', label: '사용 안내' },
];

export default function TeacherApp({ api }) {
  const route = useHashRoute();
  const [authed, setAuthed] = useState(() => api.mode === 'local' || !!sessionGet(ADMIN_KEY));
  const parts = route.split('/').filter(Boolean); // ['teacher', ...]

  if (!authed) return <div className="teacher"><Login api={api} onDone={() => setAuthed(true)} /></div>;

  const onAuthError = (e) => {
    if (e && e.code === 'UNAUTHORIZED') {
      sessionSet(ADMIN_KEY, null);
      setAuthed(false);
      return true;
    }
    return false;
  };

  let page;
  let activeTab = '/teacher';
  if (parts[1] === 'sets' && parts[2]) {
    activeTab = '/teacher/sets';
    page = <SetEditor key={parts[2]} api={api} setId={parts[2] === 'new' ? null : decodeURIComponent(parts[2])} onAuthError={onAuthError} />;
  } else if (parts[1] === 'sets') {
    activeTab = '/teacher/sets';
    page = <SetsPage api={api} onAuthError={onAuthError} />;
  } else if (parts[1] === 'dash' && parts[2]) {
    page = <DashboardPage key={parts[2]} api={api} code={decodeURIComponent(parts[2])} onAuthError={onAuthError} />;
  } else if (parts[1] === 'results') {
    activeTab = '/teacher/results';
    page = <ResultsPage api={api} onAuthError={onAuthError} />;
  } else if (parts[1] === 'help') {
    activeTab = '/teacher/help';
    page = <HelpPage api={api} />;
  } else {
    page = <SessionsPage api={api} onAuthError={onAuthError} />;
  }

  return (
    <div className="teacher">
      <header className="t-nav">
        <div className="t-nav-inner">
          <a className="t-brand" href="#/teacher">시간 여행 도덕 수업 <span>교사용</span></a>
          <nav className="t-tabs">
            {TABS.map((tab) => (
              <a key={tab.path} href={`#${tab.path}`} className={`t-tab ${activeTab === tab.path ? 'active' : ''}`}>{tab.label}</a>
            ))}
          </nav>
          <div className="t-nav-right">
            <span className={`t-mode ${api.mode}`}>{api.mode === 'local' ? '로컬 체험 모드' : '구글 드라이브 연결됨'}</span>
            {api.mode === 'remote' ? (
              <button type="button" className="text-btn" onClick={() => { sessionSet(ADMIN_KEY, null); setAuthed(false); navigate('/teacher'); }}>로그아웃</button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="t-main">{page}</main>
    </div>
  );
}
