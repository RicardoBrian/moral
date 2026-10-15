import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { Button, Sheet } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { audio } from '../lib/audio.js';
import { loadJSON, saveJSON, removeKey } from '../lib/storage.js';
import { L } from '../lib/localize.js';
import { initScores, applyEffects, isHonorary } from '../lib/score.js';
import { randomId } from '../lib/rand.js';
import { DEFAULT_CHARACTER } from '../components/Avatar.jsx';
import EntryScreen from './EntryScreen.jsx';
import CustomizeScreen from './CustomizeScreen.jsx';
import IntroScreen from './IntroScreen.jsx';
import StageIntroScreen, { WarpOverlay } from './StageIntroScreen.jsx';
import DilemmaScreen from './DilemmaScreen.jsx';
import ReflectionScreen from './ReflectionScreen.jsx';
import ResultScreen from './ResultScreen.jsx';
import CertificateScreen from './CertificateScreen.jsx';
import { buildPayload, submitResult, flushPending } from './submission.js';

const GAME_KEY = 'mt.game';
const LAST_ENTRY_KEY = 'mt.lastEntry';

/** 답한 내용을 처음부터 다시 적용해 점수를 계산합니다. (저장된 점수와 어긋날 일이 없음) */
export function computeScores(set, answers) {
  let scores = initScores(set);
  set.stages.forEach((st) => st.dilemmas.forEach((d) => {
    const a = answers[d.id];
    if (!a) return;
    const c = d.choices.find((x) => x.id === a.choiceId);
    if (c) scores = applyEffects(scores, c.effects, set);
  }));
  return scores;
}

function newGame(student, session, set, character, nickname) {
  return {
    v: 1,
    ...student,
    code: session.code,
    setId: set.id,
    setUpdatedAt: set.updatedAt || null,
    nickname: nickname || '',
    character: character || DEFAULT_CHARACTER,
    step: 'customize',
    introIdx: 0,
    stageIdx: 0,
    dilemmaIdx: 0,
    answers: {},
    drafts: {},
    reflections: {},
    startedAt: new Date().toISOString(),
    submissionId: randomId('sub'),
    submitted: false,
  };
}

export default function StudentApp({ api, preview, onExitPreview }) {
  const { t, lang } = useI18n();
  // phase: entry → game   (preview 는 바로 game)
  const [phase, setPhase] = useState(preview ? 'game' : 'entry');
  const [ctx, setCtx] = useState(() => (preview ? { session: { code: 'PREVIEW', label: '', bgm: true }, set: preview.set } : null));
  const [game, setGame] = useState(() => (preview ? newGame({ studentId: '00000', grade: 0, classNo: 0, number: 0, name: '미리보기' }, { code: 'PREVIEW' }, preview.set, null, '') : null));
  const [warp, setWarp] = useState(null); // { title }
  const [submitState, setSubmitState] = useState('idle'); // idle | sending | done | failed | preview | local
  const [savedGame, setSavedGame] = useState(null); // 이어 하기 후보
  const warpTimer = useRef(null);

  const set = ctx && ctx.set;
  const session = ctx && ctx.session;

  // ---------- 저장 / 복원 ----------
  useEffect(() => {
    if (preview) return;
    const saved = loadJSON(GAME_KEY, null);
    if (saved && saved.game && saved.set && saved.session && !saved.game.finished) setSavedGame(saved);
    flushPending(api).catch(() => {});
  }, [api, preview]);

  useEffect(() => {
    if (preview || phase !== 'game' || !game || !ctx) return;
    saveJSON(GAME_KEY, { session: ctx.session, set: ctx.set, game });
  }, [game, ctx, phase, preview]);

  useEffect(() => () => clearTimeout(warpTimer.current), []);

  const update = useCallback((patch) => {
    setGame((g) => ({ ...g, ...(typeof patch === 'function' ? patch(g) : patch) }));
  }, []);

  const scores = useMemo(() => (set && game ? computeScores(set, game.answers) : {}), [set, game]);
  const honorary = set && game ? isHonorary(scores, set) : false;
  const stage = set && game ? set.stages[game.stageIdx] : null;

  // ---------- 배경음 ----------
  useEffect(() => {
    audio.setBgmAllowed(session ? session.bgm !== false : true);
  }, [session]);

  useEffect(() => {
    let mood = 'title';
    if (phase === 'game' && game) {
      if (game.step === 'intro') mood = 'mystic';
      else if (['stageIntro', 'dilemma', 'feedback'].includes(game.step)) mood = (stage && stage.mood) || 'pensive';
      else if (game.step === 'reflection') mood = 'calm';
      else if (game.step === 'result' || game.step === 'certificate') mood = honorary ? 'hopeful' : 'somber';
    }
    audio.setMood(mood);
  }, [phase, game && game.step, stage, honorary]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => audio.setMood(null), []);

  // 화면이 바뀌면 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, game && game.step, game && game.stageIdx, game && game.dilemmaIdx, game && game.introIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 진행 상황 알림 (교사 현황판용) ----------
  const ping = useCallback((step) => {
    if (preview || !game || !session) return;
    api.checkin({ code: session.code, studentId: game.studentId, name: game.name, nickname: game.nickname, step }).catch(() => {});
  }, [api, preview, game, session]);

  // ---------- 입장 ----------
  const handleEntered = ({ student, session: sess, set: st }) => {
    saveJSON(LAST_ENTRY_KEY, { code: sess.code });
    const saved = loadJSON(GAME_KEY, null);
    const sameGame = saved && saved.game && !saved.game.finished
      && saved.game.code === sess.code && saved.game.studentId === student.studentId
      && saved.game.setUpdatedAt === (st.updatedAt || null);
    if (sameGame) {
      // 같은 학생 · 같은 수업 · 같은 문제집이면 이어 하기를 물어봅니다.
      setSavedGame({ ...saved, session: sess, set: st, fromEntry: true });
      return;
    }
    const prevChar = loadJSON('mt.character', null);
    setCtx({ session: sess, set: st });
    setGame(newGame(student, sess, st, prevChar && prevChar.character, prevChar && prevChar.nickname));
    setSubmitState('idle');
    setPhase('game');
  };

  const resumeSaved = () => {
    const s = savedGame;
    setSavedGame(null);
    setCtx({ session: s.session, set: s.set });
    const g = { ...s.game };
    setGame(g);
    setPhase('game');
    if (g.step === 'result' || g.step === 'certificate') {
      if (g.submitted) setSubmitState(api.mode === 'local' ? 'local' : 'done');
      else doSubmit(g, { session: s.session, set: s.set });
    }
  };

  const discardSaved = () => {
    const s = savedGame;
    setSavedGame(null);
    removeKey(GAME_KEY);
    if (s && s.fromEntry) {
      const prevChar = loadJSON('mt.character', null);
      setCtx({ session: s.session, set: s.set });
      setGame(newGame(
        { studentId: s.game.studentId, grade: s.game.grade, classNo: s.game.classNo, number: s.game.number, name: s.game.name },
        s.session, s.set, prevChar && prevChar.character, prevChar && prevChar.nickname,
      ));
      setSubmitState('idle');
      setPhase('game');
    }
  };

  // ---------- 진행 ----------
  const goWarp = (title, after) => {
    audio.warp();
    setWarp({ title });
    clearTimeout(warpTimer.current);
    warpTimer.current = setTimeout(() => {
      setWarp(null);
      after();
    }, 1500);
  };

  const finishCustomize = ({ character, nickname }) => {
    saveJSON('mt.character', { character, nickname });
    const hasPrologue = set.wizard.prologue.some((p) => L(p, 'ko').trim());
    update({ character, nickname, step: hasPrologue ? 'intro' : 'stageIntro', introIdx: 0 });
    ping('start');
  };

  const finishIntro = () => {
    goWarp(L(set.stages[0].title, lang), () => update({ step: 'stageIntro', stageIdx: 0, dilemmaIdx: 0 }));
  };

  const startStage = () => {
    if (!stage.dilemmas.length) update({ step: 'reflection' });
    else update({ step: 'dilemma', dilemmaIdx: 0 });
  };

  const decide = (choice, reason) => {
    const d = stage.dilemmas[game.dilemmaIdx];
    const before = computeScores(set, game.answers);
    const after = applyEffects(before, choice.effects, set);
    const gain = Object.keys(after).reduce((n, k) => n + (after[k] - before[k]), 0);
    if (gain >= 0) audio.positive(); else audio.negative();
    update((g) => ({
      answers: { ...g.answers, [d.id]: { choiceId: choice.id, reason: reason.trim(), at: new Date().toISOString() } },
      step: 'feedback',
    }));
  };

  const nextAfterFeedback = () => {
    if (game.dilemmaIdx < stage.dilemmas.length - 1) update({ step: 'dilemma', dilemmaIdx: game.dilemmaIdx + 1 });
    else update({ step: 'reflection' });
  };

  // c: { session, set } — 이어 하기 직후처럼 상태가 아직 반영되기 전에도 쓸 수 있도록 직접 받습니다.
  const doSubmit = useCallback(async (g, c) => {
    if (preview) { setSubmitState('preview'); return; }
    setSubmitState('sending');
    const payload = buildPayload({ session: c.session, set: c.set, game: g, scores: computeScores(c.set, g.answers), lang });
    const res = await submitResult(api, payload);
    if (res.ok) {
      setSubmitState(api.mode === 'local' ? 'local' : 'done');
      audio.success();
      setGame((cur) => (cur && cur.submissionId === g.submissionId ? { ...cur, submitted: true } : cur));
    } else {
      setSubmitState('failed');
    }
  }, [api, preview, lang]);

  const saveReflection = (text) => {
    const isLast = game.stageIdx >= set.stages.length - 1;
    const reflections = { ...game.reflections, [stage.id]: text.trim() };
    if (!isLast) {
      ping(`stage${game.stageIdx + 1}`);
      const next = set.stages[game.stageIdx + 1];
      update({ reflections });
      goWarp(L(next.title, lang), () => update({ step: 'stageIntro', stageIdx: game.stageIdx + 1, dilemmaIdx: 0 }));
      return;
    }
    const g = { ...game, reflections, step: 'result', finishedAt: new Date().toISOString() };
    setGame(g);
    if (isHonorary(computeScores(set, g.answers), set)) audio.success(); else audio.negative();
    doSubmit(g, ctx);
  };

  // 서버가 submissionId 로 중복을 걸러 주므로 다시 보내도 파일이 두 번 생기지 않습니다.
  const retrySubmit = () => {
    if (!game || game.submitted) return;
    doSubmit(game, ctx);
  };

  const goHome = () => {
    removeKey(GAME_KEY);
    if (preview) { onExitPreview && onExitPreview(); return; }
    setGame(null);
    setCtx(null);
    setSubmitState('idle');
    setPhase('entry');
  };

  // ---------- 진행률 ----------
  const progress = useMemo(() => {
    if (!set || !game || phase !== 'game') return undefined;
    const units = set.stages.reduce((n, st) => n + st.dilemmas.length + 1, 0);
    const done = Object.keys(game.answers).length + Object.keys(game.reflections).length;
    if (['customize', 'intro'].includes(game.step)) return 0;
    return units ? Math.min(1, done / units) : 0;
  }, [set, game, phase]);

  // ---------- 화면 ----------
  let screen = null;
  if (phase === 'entry') {
    screen = <EntryScreen api={api} onEntered={handleEntered} />;
  } else if (game && set) {
    switch (game.step) {
      case 'customize':
        screen = <CustomizeScreen initial={{ character: game.character, nickname: game.nickname }} onDone={finishCustomize} />;
        break;
      case 'intro':
        screen = (
          <IntroScreen
            set={set}
            character={game.character}
            nickname={game.nickname}
            index={game.introIdx}
            onIndex={(i) => update({ introIdx: i })}
            onDone={finishIntro}
          />
        );
        break;
      case 'stageIntro':
        screen = <StageIntroScreen set={set} stageIdx={game.stageIdx} onStart={startStage} />;
        break;
      case 'dilemma':
      case 'feedback':
        screen = (
          <DilemmaScreen
            key={`${game.stageIdx}-${game.dilemmaIdx}`}
            set={set}
            stageIdx={game.stageIdx}
            dilemmaIdx={game.dilemmaIdx}
            studentId={game.studentId}
            answer={stage.dilemmas[game.dilemmaIdx] && game.answers[stage.dilemmas[game.dilemmaIdx].id]}
            draft={game.drafts[stage.dilemmas[game.dilemmaIdx] && stage.dilemmas[game.dilemmaIdx].id]}
            onDraft={(draft) => update((g) => ({ drafts: { ...g.drafts, [stage.dilemmas[g.dilemmaIdx].id]: draft } }))}
            scores={scores}
            prevScores={computeScores(set, Object.fromEntries(Object.entries(game.answers).filter(([k]) => k !== (stage.dilemmas[game.dilemmaIdx] || {}).id)))}
            showFeedback={game.step === 'feedback'}
            onDecide={decide}
            onNext={nextAfterFeedback}
            isLastInStage={game.dilemmaIdx >= stage.dilemmas.length - 1}
          />
        );
        break;
      case 'reflection':
        screen = (
          <ReflectionScreen
            key={game.stageIdx}
            set={set}
            stageIdx={game.stageIdx}
            answers={game.answers}
            draft={game.drafts[`r:${stage.id}`] ?? game.reflections[stage.id] ?? ''}
            onDraft={(text) => update((g) => ({ drafts: { ...g.drafts, [`r:${stage.id}`]: text } }))}
            isLast={game.stageIdx >= set.stages.length - 1}
            onSave={saveReflection}
          />
        );
        break;
      case 'result':
        screen = (
          <ResultScreen
            set={set}
            scores={scores}
            nickname={game.nickname}
            submitState={submitState}
            onRetry={retrySubmit}
            onNext={() => update({ step: 'certificate' })}
          />
        );
        break;
      case 'certificate':
        screen = (
          <CertificateScreen
            set={set}
            session={session}
            game={game}
            scores={scores}
            submitState={submitState}
            onRetry={retrySubmit}
            onHome={goHome}
            preview={!!preview}
          />
        );
        break;
      default:
        screen = null;
    }
  }

  return (
    <div className="student-app">
      {preview ? (
        <div className="preview-banner no-print">
          <span>{t('preview.banner')}</span>
          <button type="button" onClick={onExitPreview}>{t('preview.exit')}</button>
        </div>
      ) : null}
      <TopBar progress={progress} bgmAllowed={session ? session.bgm !== false : true} />
      <main className="student-main">{screen}</main>
      {warp ? <WarpOverlay title={warp.title} /> : null}
      <Sheet
        open={!!savedGame}
        onClose={() => setSavedGame(null)}
        dismissible={false}
        title={t('resume.title')}
        actions={(
          <>
            <Button variant="secondary" onClick={discardSaved}>{t('resume.restart')}</Button>
            <Button onClick={resumeSaved}>{t('resume.continue')}</Button>
          </>
        )}
      >
        {savedGame ? (
          <p className="sheet-desc">
            {t('resume.desc')}
            <br />
            <strong>{savedGame.game.studentId} {savedGame.game.name}</strong> · {L(savedGame.set.title, lang)}
          </p>
        ) : null}
      </Sheet>
    </div>
  );
}
