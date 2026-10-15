// 제출할 결과를 먼저 이 기기에 보관한 뒤 서버로 보냅니다.
// 인터넷이 끊겨도 결과가 사라지지 않고, 다음에 앱을 열 때 자동으로 다시 보냅니다.
import { loadJSON, saveJSON } from '../lib/storage.js';
import { L } from '../lib/localize.js';
import { averageScore, isHonorary } from '../lib/score.js';
import { randomId } from '../lib/rand.js';

const QUEUE_KEY = 'mt.pending';
let flushing = null;

export function pendingCount() {
  return (loadJSON(QUEUE_KEY, []) || []).length;
}

export function isPending(submissionId) {
  return (loadJSON(QUEUE_KEY, []) || []).some((p) => p.submissionId === submissionId);
}

function enqueue(payload) {
  const q = (loadJSON(QUEUE_KEY, []) || []).filter((p) => p.submissionId !== payload.submissionId);
  q.push(payload);
  saveJSON(QUEUE_KEY, q);
}

function dequeue(submissionId) {
  const q = (loadJSON(QUEUE_KEY, []) || []).filter((p) => p.submissionId !== submissionId);
  saveJSON(QUEUE_KEY, q);
}

/** 대기열 전체를 보냅니다. 동시에 두 번 실행되지 않습니다. */
export function flushPending(api) {
  if (flushing) return flushing;
  flushing = (async () => {
    const results = {};
    const q = loadJSON(QUEUE_KEY, []) || [];
    for (const payload of q) {
      try {
        const r = await api.submit(payload);
        dequeue(payload.submissionId);
        results[payload.submissionId] = { ok: true, result: r };
      } catch (e) {
        results[payload.submissionId] = { ok: false, error: e };
        // 서버가 받은 내용을 거부한 경우(수업 종료 등)는 계속 재시도해도 소용없으므로 꺼냅니다.
        if (e && ['NOT_FOUND', 'CLOSED', 'INVALID'].includes(e.code)) dequeue(payload.submissionId);
      }
    }
    return results;
  })().finally(() => { flushing = null; });
  return flushing;
}

export async function submitResult(api, payload) {
  enqueue(payload);
  const results = await flushPending(api);
  const mine = results[payload.submissionId];
  if (mine) return mine;
  // 다른 제출이 진행 중이어서 이번 것이 포함되지 않았다면 한 번 더 보냅니다.
  const again = await flushPending(api);
  return again[payload.submissionId] || { ok: !isPending(payload.submissionId) };
}

/** 서버(교사)가 한국어로 바로 읽을 수 있도록 선택 내용을 한국어 원문과 함께 담습니다. */
export function buildPayload({ session, set, game, scores, lang }) {
  const answers = [];
  const reflections = [];
  set.stages.forEach((st, si) => {
    st.dilemmas.forEach((d, di) => {
      const a = game.answers[d.id];
      if (!a) return;
      const choiceIndex = d.choices.findIndex((c) => c.id === a.choiceId);
      const choice = d.choices[choiceIndex];
      answers.push({
        stageIndex: si,
        dilemmaIndex: di,
        dilemmaId: d.id,
        dilemmaTitle: L(d.title, 'ko'),
        choiceId: a.choiceId,
        choiceNo: choiceIndex + 1,
        choiceText: choice ? L(choice.text, 'ko') : '',
        reason: a.reason,
      });
    });
    const text = game.reflections[st.id];
    if (text) reflections.push({ stageIndex: si, stageId: st.id, stageTitle: L(st.title, 'ko'), text });
  });
  const axes = set.axes.map((a) => ({ id: a.id, name: L(a.name, 'ko'), score: scores[a.id] }));
  return {
    submissionId: game.submissionId || randomId('sub'),
    code: session.code,
    sessionLabel: session.label || '',
    setId: set.id,
    setTitle: L(set.title, 'ko'),
    studentId: game.studentId,
    grade: game.grade,
    classNo: game.classNo,
    number: game.number,
    name: game.name,
    nickname: game.nickname,
    lang,
    axes,
    scores,
    total: averageScore(scores, set),
    honorary: isHonorary(scores, set),
    passScore: set.passScore,
    answers,
    reflections,
    startedAt: game.startedAt,
    finishedAt: new Date().toISOString(),
  };
}
