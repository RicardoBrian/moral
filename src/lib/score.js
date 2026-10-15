export function axesOf(set) {
  return (set && set.axes && set.axes.length ? set.axes : []);
}

export function initScores(set) {
  const start = Number.isFinite(Number(set.startScore)) ? Number(set.startScore) : 50;
  const scores = {};
  axesOf(set).forEach((a) => { scores[a.id] = start; });
  return scores;
}

const clamp = (v) => Math.max(0, Math.min(100, v));

export function applyEffects(scores, effects, set) {
  const next = { ...scores };
  axesOf(set).forEach((a) => {
    next[a.id] = clamp((next[a.id] ?? 50) + (Number(effects && effects[a.id]) || 0));
  });
  return next;
}

export function averageScore(scores, set) {
  const axes = axesOf(set);
  if (!axes.length) return 0;
  const sum = axes.reduce((acc, a) => acc + (scores[a.id] ?? 0), 0);
  return Math.round(sum / axes.length);
}

export function passScore(set) {
  const p = Number(set.passScore);
  return Number.isFinite(p) && p > 0 ? p : 70;
}

export function isHonorary(scores, set) {
  return averageScore(scores, set) >= passScore(set);
}

export function scoreLevel(v) {
  if (v >= 70) return 'high';
  if (v >= 40) return 'mid';
  return 'low';
}

/** 선택지의 효과 합이 양수면 긍정적 결과로 봅니다. */
export function effectTone(effects) {
  const sum = Object.values(effects || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  if (sum > 0) return 'positive';
  if (sum < 0) return 'negative';
  return 'neutral';
}
