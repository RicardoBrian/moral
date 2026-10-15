import React from 'react';
import { STRINGS } from '../i18n/strings.js';
import { loadJSON } from '../lib/storage.js';

// 예기치 못한 오류가 나도 흰 화면 대신 안내를 보여 줍니다. (진행 기록은 자동 저장되어 있음)
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const lang = loadJSON('mt.lang', 'ko');
    const s = STRINGS[lang] || STRINGS.ko;
    return (
      <div className="fatal">
        <h1 className="title-lg">{s['error.title']}</h1>
        <p className="desc">{s['error.desc']}</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
          <span className="btn-label">{s['error.reload']}</span>
        </button>
      </div>
    );
  }
}
