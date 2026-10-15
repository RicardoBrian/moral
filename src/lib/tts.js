import { SPEECH_LANG } from './localize.js';
import { audio } from './audio.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let listeners = new Set();
let speakingId = null;

export function ttsSupported() {
  return !!synth && typeof window.SpeechSynthesisUtterance === 'function';
}

function emit() {
  listeners.forEach((fn) => fn(speakingId));
}

export function onTtsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function pickVoice(langCode) {
  try {
    const voices = synth.getVoices() || [];
    const prefix = langCode.slice(0, 2);
    return voices.find((v) => v.lang === langCode) || voices.find((v) => (v.lang || '').startsWith(prefix)) || null;
  } catch (e) {
    return null;
  }
}

export function stopSpeaking() {
  if (!ttsSupported()) return;
  try { synth.cancel(); } catch (e) { /* ignore */ }
  if (speakingId !== null) {
    speakingId = null;
    audio.duck(false);
    emit();
  }
}

/** id 는 어떤 읽기 버튼이 재생 중인지 표시하는 데 씁니다. */
export function speak(text, lang, id) {
  if (!ttsSupported() || !text) return false;
  stopSpeaking();
  const u = new window.SpeechSynthesisUtterance(text);
  const code = SPEECH_LANG[lang] || 'ko-KR';
  u.lang = code;
  const v = pickVoice(code);
  if (v) u.voice = v;
  u.rate = lang === 'ko' ? 1.0 : 0.95;
  const done = () => {
    if (speakingId === id) {
      speakingId = null;
      audio.duck(false);
      emit();
    }
  };
  u.onend = done;
  u.onerror = done;
  speakingId = id;
  audio.duck(true);
  emit();
  try {
    synth.speak(u);
  } catch (e) {
    done();
    return false;
  }
  return true;
}
