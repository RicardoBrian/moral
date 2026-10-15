// 서버(Apps Script)를 연결하기 전에 쓰는 로컬 모드.
// 모든 데이터가 이 브라우저에만 저장되므로 체험·테스트용입니다.
import { loadJSON, saveJSON } from '../lib/storage.js';
import { DEFAULT_SET, DEFAULT_SET_ID } from '../data/defaultSet.js';
import { normalizeSet, totalDilemmas } from '../data/setModel.js';
import { randomCode } from '../lib/rand.js';
import { ApiError } from './errors.js';

const K = { sets: 'mt.local.sets', sessions: 'mt.local.sessions', subs: 'mt.local.submissions', prog: 'mt.local.progress' };
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

function sets() {
  let s = loadJSON(K.sets, null);
  if (!s || typeof s !== 'object') {
    s = { [DEFAULT_SET_ID]: { ...clone(DEFAULT_SET), updatedAt: new Date().toISOString() } };
    saveJSON(K.sets, s);
  }
  return s;
}

function sessions() {
  let s = loadJSON(K.sessions, null);
  if (!s || typeof s !== 'object') {
    s = { DEMO: { code: 'DEMO', setId: DEFAULT_SET_ID, label: '체험 수업', bgm: true, active: true, createdAt: new Date().toISOString() } };
    saveJSON(K.sessions, s);
  }
  return s;
}

function summary(set) {
  return { id: set.id, title: set.title, stages: set.stages.length, dilemmas: totalDilemmas(set), updatedAt: set.updatedAt };
}

export function createLocalApi() {
  return {
    mode: 'local',

    async getSession(code) {
      await wait();
      const sess = sessions()[String(code || '').toUpperCase()];
      if (!sess) throw new ApiError('NOT_FOUND');
      if (!sess.active) throw new ApiError('CLOSED');
      const set = sets()[sess.setId];
      if (!set) throw new ApiError('SET_MISSING');
      return { session: clone(sess), set: normalizeSet(set) };
    },

    async checkin(p) {
      const all = loadJSON(K.prog, []);
      all.push({ ...p, at: new Date().toISOString() });
      saveJSON(K.prog, all.slice(-2000));
      return { ok: true };
    },

    async submit(payload) {
      await wait(400);
      const all = loadJSON(K.subs, []);
      const dup = all.find((x) => x.submissionId === payload.submissionId);
      if (dup) return { ok: true, duplicate: true, fileName: dup.fileName, pdfUrl: '' };
      const rec = {
        ...clone(payload),
        submittedAt: new Date().toISOString(),
        answers: payload.answers.map((a) => ({ ...a, reasonKo: a.reason })),
        reflections: payload.reflections.map((r) => ({ ...r, textKo: r.text })),
        fileName: `${payload.studentId}_${payload.name}.pdf (로컬 저장)`,
        pdfUrl: '',
      };
      all.push(rec);
      if (!saveJSON(K.subs, all)) throw new ApiError('STORAGE_FULL');
      return { ok: true, fileName: rec.fileName, pdfUrl: '' };
    },

    // ---------- 교사용 ----------
    async login() { await wait(); return { ok: true }; },

    async listSets() {
      await wait();
      return Object.values(sets()).map((s) => summary(normalizeSet(s)))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },

    async getSet(id) {
      await wait();
      const s = sets()[id];
      if (!s) throw new ApiError('NOT_FOUND');
      return normalizeSet(s);
    },

    async saveSet(set) {
      await wait();
      const all = sets();
      const saved = { ...normalizeSet(set), updatedAt: new Date().toISOString() };
      all[saved.id] = saved;
      if (!saveJSON(K.sets, all)) throw new ApiError('STORAGE_FULL');
      return saved;
    },

    async deleteSet(id) {
      await wait();
      const inUse = Object.values(sessions()).some((s) => s.setId === id && s.active);
      if (inUse) throw new ApiError('SET_IN_USE');
      const all = sets();
      delete all[id];
      saveJSON(K.sets, all);
      return { ok: true };
    },

    async translateSet() {
      throw new ApiError('LOCAL_NO_TRANSLATE');
    },

    async listSessions() {
      await wait();
      return Object.values(sessions()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },

    async createSession({ setId, label, bgm }) {
      await wait();
      const all = sessions();
      let code = randomCode(5);
      while (all[code]) code = randomCode(5);
      const sess = { code, setId, label: label || '', bgm: bgm !== false, active: true, createdAt: new Date().toISOString() };
      all[code] = sess;
      saveJSON(K.sessions, all);
      return sess;
    },

    async updateSession(code, patch) {
      await wait();
      const all = sessions();
      if (!all[code]) throw new ApiError('NOT_FOUND');
      const allowed = {};
      ['label', 'bgm', 'active'].forEach((k) => { if (k in patch) allowed[k] = patch[k]; });
      all[code] = { ...all[code], ...allowed };
      saveJSON(K.sessions, all);
      return all[code];
    },

    async deleteSession(code) {
      await wait();
      const all = sessions();
      delete all[code];
      saveJSON(K.sessions, all);
      return { ok: true };
    },

    async dashboard(code) {
      await wait();
      const sess = sessions()[code];
      if (!sess) throw new ApiError('NOT_FOUND');
      return {
        session: sess,
        submissions: loadJSON(K.subs, []).filter((s) => s.code === code),
        progress: loadJSON(K.prog, []).filter((p) => p.code === code),
      };
    },
  };
}
