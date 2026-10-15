import React, { useEffect, useMemo, useState } from 'react';
import { I18nProvider } from './i18n/index.jsx';
import { PrefsProvider } from './lib/prefs.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { Spinner } from './components/ui.jsx';
import StudentApp from './student/StudentApp.jsx';
import TeacherApp from './teacher/TeacherApp.jsx';
import { loadConfig, createApi } from './api/index.js';
import { useHashRoute, navigate, getPreviewSet, clearPreview } from './lib/router.js';

function Redirect({ to }) {
  useEffect(() => { navigate(to); }, [to]);
  return <Spinner />;
}

export default function App() {
  const route = useHashRoute();
  const [config, setConfig] = useState(null);
  useEffect(() => { loadConfig().then(setConfig); }, []);
  const api = useMemo(() => (config ? createApi(config) : null), [config]);

  useEffect(() => {
    document.body.classList.toggle('is-teacher', route.startsWith('/teacher'));
  }, [route]);

  let content;
  if (!api) {
    content = <Spinner />;
  } else if (route.startsWith('/teacher')) {
    content = <TeacherApp api={api} />;
  } else if (route.startsWith('/preview')) {
    const set = getPreviewSet();
    content = set
      ? <StudentApp key="preview" api={api} preview={{ set }} onExitPreview={() => { clearPreview(); navigate('/teacher/sets'); }} />
      : <Redirect to="/teacher/sets" />;
  } else {
    content = <StudentApp key="student" api={api} />;
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <PrefsProvider>{content}</PrefsProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
