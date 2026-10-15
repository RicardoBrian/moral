import { useEffect, useState } from 'react';

const read = () => (window.location.hash || '').replace(/^#/, '') || '/';

export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path) {
  window.location.hash = path;
}

// 교사 화면의 "미리보기"에서 넘겨주는 문제집 (새로고침하면 사라지므로 교사 화면으로 돌아감)
let previewSet = null;
export function startPreview(set) {
  previewSet = set;
  navigate('/preview');
}
export function getPreviewSet() {
  return previewSet;
}
export function clearPreview() {
  previewSet = null;
}
