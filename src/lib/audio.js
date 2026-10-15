// 효과음과 배경음을 모두 Web Audio 로 직접 합성합니다.
// 음원 파일을 쓰지 않으므로 저작권 걱정이 없고, 다운로드 용량도 없습니다.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 분위기별 배경음 설정. chords 는 MIDI 음 번호, dur 은 한 화음의 길이(초)
export const MOODS = {
  title: {
    label: '밝은 시작',
    chords: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]],
    dur: 4.2, wave: 'triangle', cutoff: 1800, bells: 0.55, bellOct: 24,
  },
  mystic: {
    label: '신비로운',
    chords: [[50, 57, 62, 65, 69], [46, 53, 62, 65, 69], [43, 50, 58, 62, 65], [45, 52, 57, 61, 64]],
    dur: 5, wave: 'sine', cutoff: 1300, bells: 0.5, bellOct: 24,
  },
  pensive: {
    label: '고민하는',
    chords: [[45, 52, 59, 60, 64], [41, 48, 55, 57, 64], [38, 45, 52, 53, 60], [40, 47, 52, 57, 59]],
    dur: 4.8, wave: 'sine', cutoff: 1100, bells: 0.3, bellOct: 12,
  },
  tense: {
    label: '긴장되는',
    chords: [[40, 47, 52, 55], [41, 48, 53, 56], [40, 47, 52, 55], [38, 45, 50, 53]],
    dur: 4.2, wave: 'triangle', cutoff: 800, bells: 0.15, bellOct: 12,
  },
  calm: {
    label: '차분한',
    chords: [[41, 48, 57, 64], [40, 47, 55, 62], [38, 45, 53, 60], [36, 43, 52, 59]],
    dur: 5.4, wave: 'sine', cutoff: 1400, bells: 0.35, bellOct: 24,
  },
  hopeful: {
    label: '희망찬',
    chords: [[48, 55, 64, 67], [47, 55, 62, 67], [45, 52, 60, 64], [41, 48, 57, 65]],
    dur: 3.6, wave: 'triangle', cutoff: 2200, bells: 0.7, bellOct: 24,
  },
  somber: {
    label: '쓸쓸한',
    chords: [[45, 52, 57, 60], [40, 47, 52, 55], [41, 48, 53, 57], [38, 45, 50, 53]],
    dur: 5.2, wave: 'sine', cutoff: 900, bells: 0.12, bellOct: 12,
  },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmBus = null;
    this.sfxBus = null;
    this.sfxOn = true;
    this.bgmOn = true;
    this.bgmAllowed = true; // 교사가 수업 설정에서 끌 수 있음
    this.wantedMood = null;
    this.current = null; // { mood, gain, filter, timer, nextTime, idx }
    this.ducked = false;
    this.unlocked = false;
    this._bindUnlock();
  }

  _bindUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this._ensure();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.unlocked = true;
      this._syncBgm();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else if (this.unlocked) this.ctx.resume().catch(() => {});
    });
  }

  _ensure() {
    if (this.ctx) return this.ctx;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch (e) {
      return null;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.bgmBus = this.ctx.createGain();
    this.bgmBus.gain.value = 0.16;
    this.bgmBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.sfxBus.connect(this.master);
    return this.ctx;
  }

  setPrefs({ sfxOn, bgmOn }) {
    if (typeof sfxOn === 'boolean') this.sfxOn = sfxOn;
    if (typeof bgmOn === 'boolean') this.bgmOn = bgmOn;
    this._syncBgm();
  }

  setBgmAllowed(allowed) {
    this.bgmAllowed = allowed !== false;
    this._syncBgm();
  }

  /** 화면에 맞는 배경음 분위기를 요청합니다. 같은 분위기면 아무 일도 하지 않습니다. */
  setMood(mood) {
    this.wantedMood = MOODS[mood] ? mood : null;
    this._syncBgm();
  }

  duck(on) {
    this.ducked = on;
    if (!this.ctx || !this.bgmBus) return;
    const t = this.ctx.currentTime;
    this.bgmBus.gain.cancelScheduledValues(t);
    this.bgmBus.gain.setTargetAtTime(on ? 0.05 : 0.16, t, 0.25);
  }

  _syncBgm() {
    const should = this.bgmOn && this.bgmAllowed && this.wantedMood && this.unlocked;
    if (!should) {
      this._stopCurrent();
      return;
    }
    if (this.current && this.current.mood === this.wantedMood) return;
    this._stopCurrent();
    this._startMood(this.wantedMood);
  }

  _stopCurrent() {
    const cur = this.current;
    if (!cur) return;
    this.current = null;
    clearInterval(cur.timer);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
    cur.gain.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => {
      try { cur.gain.disconnect(); } catch (e) { /* ignore */ }
    }, 1500);
  }

  _startMood(mood) {
    const ctx = this._ensure();
    if (!ctx) return;
    const conf = MOODS[mood];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = conf.cutoff;
    filter.Q.value = 0.4;
    filter.connect(gain);
    gain.connect(this.bgmBus);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 2);
    const cur = { mood, gain, filter, nextTime: t + 0.1, idx: 0, timer: null };
    const tick = () => {
      if (this.current !== cur || !this.ctx) return;
      while (cur.nextTime < this.ctx.currentTime + 1.5) {
        this._scheduleChord(cur, conf, cur.nextTime);
        cur.nextTime += conf.dur;
        cur.idx = (cur.idx + 1) % conf.chords.length;
      }
    };
    cur.timer = setInterval(tick, 300);
    this.current = cur;
    tick();
  }

  _scheduleChord(cur, conf, start) {
    const ctx = this.ctx;
    const chord = conf.chords[cur.idx];
    const len = conf.dur;
    chord.forEach((m, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = conf.wave;
      osc.frequency.value = mtof(m);
      osc.detune.value = (i % 2 === 0 ? -4 : 4);
      const peak = (i === 0 ? 0.22 : 0.13);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(peak, start + Math.min(1.6, len * 0.35));
      g.gain.setValueAtTime(peak, start + len * 0.7);
      g.gain.linearRampToValueAtTime(0, start + len + 1.2);
      osc.connect(g);
      g.connect(cur.filter);
      osc.start(start);
      osc.stop(start + len + 1.3);
    });
    // 화음 위에 가끔 맑은 종소리를 얹어 단조로움을 줄입니다.
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      if (Math.random() > conf.bells) continue;
      const note = chord[1 + Math.floor(Math.random() * (chord.length - 1))] + conf.bellOct;
      const bt = start + (len / steps) * s + Math.random() * 0.2;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = mtof(note);
      g.gain.setValueAtTime(0, bt);
      g.gain.linearRampToValueAtTime(0.09, bt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, bt + 2.4);
      osc.connect(g);
      g.connect(cur.gain);
      osc.start(bt);
      osc.stop(bt + 2.5);
    }
  }

  // ---------- 효과음 ----------
  _tone({ freq, to, type = 'sine', dur = 0.12, vol = 0.2, delay = 0 }) {
    if (!this.sfxOn) return;
    const ctx = this._ensure();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  tap() { this._tone({ freq: 880, dur: 0.06, vol: 0.08 }); }
  select() { this._tone({ freq: 660, to: 990, dur: 0.1, vol: 0.12 }); }
  positive() {
    [72, 76, 79, 84].forEach((m, i) => this._tone({ freq: mtof(m), type: 'triangle', dur: 0.45, vol: 0.13, delay: i * 0.07 }));
  }
  negative() {
    this._tone({ freq: mtof(57), type: 'sine', dur: 0.5, vol: 0.16 });
    this._tone({ freq: mtof(53), type: 'sine', dur: 0.6, vol: 0.14, delay: 0.16 });
  }
  error() { this._tone({ freq: 220, to: 180, type: 'triangle', dur: 0.18, vol: 0.12 }); }
  warp() { this._tone({ freq: 180, to: 1200, type: 'sine', dur: 1.1, vol: 0.12 }); }
  success() {
    [60, 64, 67, 72, 76].forEach((m, i) => this._tone({ freq: mtof(m), type: 'triangle', dur: 0.6, vol: 0.12, delay: i * 0.09 }));
  }
}

export const audio = new AudioEngine();
