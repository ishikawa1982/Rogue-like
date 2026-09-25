// =============================================================
// audio.js - Web Audio によるチップチューン（BGM・効果音）
//   外部音源なし。オシレーターとノイズだけで全部生成する。
//   自動再生制限のため、最初のユーザー操作で start() を呼ぶこと。
//   BGMは setScene('title' | 'dungeon0'〜'dungeon3' | 'shop' | 'danger' | null) で切り替える。
// =============================================================

// 音名 → 周波数（A4=440）
const NOTE = {};
(() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let oct = 1; oct <= 6; oct++) {
    names.forEach((n, i) => {
      const midi = (oct + 1) * 12 + i;
      NOTE[`${n}${oct}`] = 440 * Math.pow(2, (midi - 69) / 12);
    });
  }
})();

// 楽譜の書き方：'D4 . A4 . G4 F4' のように空白区切り。'.' は休符（前の音をのばさない）
const seq = (s) => s.trim().split(/\s+/).map(t => (t === '.' ? null : t));

// 小節ごとのルート音から、ベースライン（8ステップ/小節）を作る
//   pattern の 'r'=ルート(低) 'o'=オクターブ上 'f'=5度 '.'=休み
function bassLine(roots, pattern = 'r.o.r.o.') {
  const semis = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const names = Object.keys(semis);
  const out = [];
  for (const r of roots) {
    const fifth = names[(semis[r] + 7) % 12];
    const fifthOct = semis[r] + 7 >= 12 ? 3 : 2;
    for (const ch of pattern) {
      if (ch === 'r') out.push(`${r}2`);
      else if (ch === 'o') out.push(`${r}3`);
      else if (ch === 'f') out.push(`${fifth}${fifthOct}`);
      else out.push(null);
    }
  }
  return out;
}

// -------------------------------------------------------------
// 曲データ
//   tempo: 1ステップの秒数 / lead・bass: 音符列 / leadType: 波形
//   hat・kick: 8ステップ単位のリズム（'x'で鳴る）
// -------------------------------------------------------------
const TRACKS = {
  // タイトル：勇ましく、少しさびしい冒険のはじまり（Dマイナー）
  title: {
    tempo: 0.19, leadType: 'square', leadVol: 0.30,
    lead: seq(`
      D4 . A4 . G4 F4 E4 F4   D4 . . . A3 . D4 E4
      F4 . G4 . A4 . C5 A#4   A4 . . . . . . .
      A#4 . A4 . G4 . F4 G4   A4 . F4 . D4 . E4 F4
      E4 . C4 . D4 E4 F4 E4   D4 . . . . . . .`),
    bass: bassLine(['D', 'D', 'F', 'A', 'A#', 'F', 'C', 'D'], 'r.f.o.f.'),
    hat: 'x.x.x.x.', kick: 'x...x...',
  },
  // 1〜3F 石回廊：軽快な冒険（Aマイナー）
  dungeon0: {
    tempo: 0.17, leadType: 'square', leadVol: 0.26,
    lead: seq(`
      A4 . C5 . B4 A4 G4 .    A4 . E4 . . . . .
      F4 . A4 . G4 F4 E4 .    D4 . E4 . . . . .
      A4 . C5 . D5 C5 B4 .    C5 . A4 . . . . .
      F4 . E4 . D4 . C4 D4    E4 . . . . . . .`),
    bass: bassLine(['A', 'A', 'F', 'G', 'A', 'A', 'F', 'E'], 'r.o.r.o.'),
    hat: 'x.x.x.x.', kick: 'x...x...',
  },
  // 4〜6F 地下墓所：静かで不気味（Eマイナー、三角波）
  dungeon1: {
    tempo: 0.22, leadType: 'triangle', leadVol: 0.42,
    lead: seq(`
      E4 . . G4 . . F4 .      E4 . . . B3 . . .
      E4 . . G4 . . A4 .      G4 . F4 . E4 . . .
      C5 . . B4 . . A4 .      G4 . . . F4 . . .
      E4 . G4 . F4 . D#4 .    E4 . . . . . . .`),
    bass: bassLine(['E', 'E', 'C', 'B', 'A', 'B', 'C', 'E'], 'r...f...'),
    hat: '....x...', kick: 'x.......',
  },
  // 7〜9F 苔むした遺跡：神秘的（Dドリア）
  dungeon2: {
    tempo: 0.18, leadType: 'square', leadVol: 0.24,
    lead: seq(`
      D4 . F4 G4 A4 . G4 .    F4 . D4 . C4 . D4 .
      D4 . F4 G4 A4 . C5 .    A4 . G4 . . . . .
      A#4 . A4 . G4 . F4 .    E4 . F4 . G4 . A4 .
      A4 . G4 . F4 . E4 .     D4 . . . . . . .`),
    bass: bassLine(['D', 'D', 'C', 'C', 'A#', 'C', 'A', 'D'], 'r.f.r.f.'),
    hat: 'x.x.x.x.', kick: 'x.....x.',
  },
  // 10〜12F アルカナの深層：緊張感（C#マイナー）
  dungeon3: {
    tempo: 0.15, leadType: 'square', leadVol: 0.24,
    lead: seq(`
      C#5 . G#4 . C#5 . E5 .   D#5 . C#5 . B4 . G#4 .
      A4 . C#5 . E5 . A5 .     G#5 . E5 . D#5 . . .
      B4 . D#5 . F#5 . B5 .    A5 . G#5 . F#5 . E5 .
      D#5 . E5 . D#5 . C#5 .   G#4 . . . . . . .`),
    bass: bassLine(['C#', 'C#', 'A', 'A', 'B', 'B', 'G#', 'G#'], 'r.o.r.o.'),
    hat: 'xxxxxxxx', kick: 'x...x...',
  },
  // お店：にぎやか（Fメジャー）
  shop: {
    tempo: 0.16, leadType: 'square', leadVol: 0.26,
    lead: seq(`
      A4 . C5 . A4 . F4 .      G4 . A4 A#4 C5 . . .
      D5 . C5 . A#4 . A4 .     G4 . . . C4 . . .
      A4 . C5 . F5 . C5 .      D5 . C5 . A#4 . A4 .
      G4 . A4 . A#4 . G4 .     F4 . . . . . . .`),
    bass: bassLine(['F', 'F', 'A#', 'C', 'F', 'D', 'G', 'C'], 'r.f.r.f.'),
    hat: '..x...x.', kick: 'x...x...',
  },
  // 危険（モンスターハウス・店主激怒）：速くて激しい（Eマイナー）
  danger: {
    tempo: 0.12, leadType: 'sawtooth', leadVol: 0.20,
    lead: seq(`
      E5 . E5 D5 E5 . G5 .     F#5 . E5 . D5 . B4 .
      E5 . E5 D5 E5 . A5 .     G5 . F#5 . E5 . . .
      C5 . C5 B4 C5 . E5 .     D5 . D5 C5 D5 . F#5 .
      E5 . D5 . C5 . B4 .      E5 . . . . . . .`),
    bass: bassLine(['E', 'E', 'E', 'E', 'C', 'D', 'C', 'B'], 'rorororo'),
    hat: 'xxxxxxxx', kick: 'x.x.x.x.',
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.bgmTimer = null;
    this.noiseBuffer = null;
    this.scene = null;      // 鳴らしたい曲
    this.track = null;      // 鳴っている曲
    this._beat = 0;
    this._nextNoteTime = 0;
  }

  // 最初のユーザー操作で呼ぶ
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    // ノイズ用バッファ（打撃・消滅音）
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // 場面の曲を指定（同じ曲なら何もしない）
  setScene(name) {
    if (name === this.scene) return;
    this.scene = name;
    this.track = name ? TRACKS[name] || null : null;
    this._beat = 0;
    if (this.ctx) this._nextNoteTime = this.ctx.currentTime + 0.08;
  }

  // ---- 基本波形を1音鳴らす ----
  tone(freq, dur, { type = 'square', vol = 0.5, when = 0, dest = null, slideTo = null } = {}) {
    if (!this.ctx || !freq) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    // パッと立ち上がってスッと減衰（ファミコンのエンベロープ風）
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // ---- ノイズを鳴らす ----
  noise(dur, { vol = 0.5, when = 0, slideTo = null, freq = 1400, dest = null } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, t0);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  arp(notes, step, opts = {}) {
    notes.forEach((n, i) => this.tone(NOTE[n], opts.dur || step * 1.4, { type: 'square', vol: 0.35, ...opts, when: i * step }));
  }

  // ---- 効果音 ----
  play(name) {
    if (!this.ctx) return;
    const N = NOTE;
    switch (name) {
      case 'step':
        this.tone(120, 0.05, { type: 'triangle', vol: 0.10 });
        break;
      case 'hit':
        this.tone(330, 0.07, { type: 'square', vol: 0.4, slideTo: 180 });
        this.noise(0.08, { vol: 0.25, slideTo: 400 });
        break;
      case 'crit':
        this.tone(N['C5'], 0.06, { type: 'square', vol: 0.4 });
        this.tone(N['G5'], 0.10, { type: 'square', vol: 0.4, when: 0.06 });
        this.noise(0.12, { vol: 0.35, slideTo: 300 });
        break;
      case 'hurt':
        this.tone(200, 0.18, { type: 'sawtooth', vol: 0.4, slideTo: 90 });
        this.noise(0.10, { vol: 0.3, slideTo: 200 });
        break;
      case 'kill':
        this.noise(0.22, { vol: 0.4, slideTo: 120 });
        this.tone(180, 0.2, { type: 'square', vol: 0.25, slideTo: 70 });
        break;
      case 'pickup':
        this.arp(['E5', 'A5'], 0.06, { dur: 0.09 });
        break;
      case 'coin':
        this.tone(N['B5'], 0.05, { type: 'square', vol: 0.3 });
        this.tone(N['E6'], 0.12, { type: 'square', vol: 0.3, when: 0.05 });
        break;
      case 'buy':
        this.arp(['B5', 'E6', 'B5', 'E6'], 0.05, { vol: 0.28, dur: 0.08 });
        break;
      case 'heal':
        this.arp(['C5', 'E5', 'G5'], 0.08, { type: 'triangle', vol: 0.4, dur: 0.16 });
        break;
      case 'powerup':
        this.arp(['C5', 'E5', 'G5', 'C6'], 0.05, { dur: 0.1 });
        break;
      case 'poison':
        this.tone(N['E4'], 0.25, { type: 'sawtooth', vol: 0.3, slideTo: N['A3'] });
        break;
      case 'eat':
        this.tone(160, 0.06, { type: 'triangle', vol: 0.4 });
        this.tone(140, 0.06, { type: 'triangle', vol: 0.4, when: 0.09 });
        this.tone(120, 0.08, { type: 'triangle', vol: 0.4, when: 0.18 });
        break;
      case 'equip':
        this.tone(N['A4'], 0.05, { type: 'square', vol: 0.3 });
        this.tone(N['D5'], 0.10, { type: 'square', vol: 0.3, when: 0.05 });
        break;
      case 'scroll':
        this.noise(0.3, { vol: 0.25, slideTo: 3000 });
        this.tone(N['E5'], 0.2, { type: 'sine', vol: 0.2, slideTo: N['E6'] });
        break;
      case 'identify':
        this.arp(['G5', 'B5', 'D6'], 0.06, { type: 'triangle', vol: 0.35, dur: 0.12 });
        break;
      case 'zap':
        this.tone(N['G5'], 0.2, { type: 'sawtooth', vol: 0.3, slideTo: N['G4'] });
        break;
      case 'fizzle':
        this.tone(N['C4'], 0.15, { type: 'square', vol: 0.2, slideTo: N['C3'] });
        break;
      case 'thunder':
        this.noise(0.5, { vol: 0.55, freq: 900, slideTo: 80 });
        this.tone(90, 0.4, { type: 'sawtooth', vol: 0.3, slideTo: 40 });
        break;
      case 'warp':
        this.tone(N['C4'], 0.3, { type: 'sine', vol: 0.3, slideTo: N['C6'] });
        this.tone(N['G4'], 0.3, { type: 'triangle', vol: 0.2, slideTo: N['G5'], when: 0.05 });
        break;
      case 'arrow':
        this.noise(0.12, { vol: 0.3, freq: 3000, slideTo: 800 });
        break;
      case 'fire':
        this.noise(0.45, { vol: 0.5, freq: 600, slideTo: 200 });
        this.tone(120, 0.35, { type: 'sawtooth', vol: 0.25, slideTo: 60 });
        break;
      case 'steal':
        this.arp(['E5', 'C5', 'A4'], 0.05, { vol: 0.3, dur: 0.08 });
        break;
      case 'pot':
        this.tone(N['C5'], 0.08, { type: 'triangle', vol: 0.4 });
        this.tone(N['F4'], 0.2, { type: 'triangle', vol: 0.35, when: 0.08, slideTo: N['C6'] });
        break;
      case 'break':
        this.noise(0.25, { vol: 0.5, freq: 2500, slideTo: 600 });
        this.tone(N['A5'], 0.05, { type: 'square', vol: 0.2, when: 0.02 });
        this.tone(N['E6'], 0.05, { type: 'square', vol: 0.2, when: 0.07 });
        break;
      case 'talk':
        this.tone(N['A5'], 0.04, { type: 'square', vol: 0.15 });
        this.tone(N['E5'], 0.04, { type: 'square', vol: 0.15, when: 0.06 });
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          this.tone(N['A5'], 0.1, { type: 'square', vol: 0.3, when: i * 0.2 });
          this.tone(N['E5'], 0.1, { type: 'square', vol: 0.3, when: i * 0.2 + 0.1 });
        }
        break;
      case 'stairs':
        this.arp(['C5', 'D5', 'E5', 'G5'], 0.07, { type: 'triangle', dur: 0.1 });
        break;
      case 'levelup':
        this.arp(['C5', 'E5', 'G5', 'C6', 'E6'], 0.08, { vol: 0.4, dur: 0.14 });
        break;
      case 'gameover':
        this.arp(['G4', 'F4', 'D#4', 'C4'], 0.22, { type: 'sawtooth', vol: 0.4, dur: 0.35 });
        break;
      case 'win':
        this.arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'], 0.12, { vol: 0.4, dur: 0.18 });
        break;
    }
  }

  // -----------------------------------------------------------
  // BGM：先読みで音符を予約（タイマーのゆらぎに強い）
  // -----------------------------------------------------------
  scheduler() {
    if (!this.ctx) return;
    while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
      const tr = this.track;
      if (!tr) {
        this._nextNoteTime = this.ctx.currentTime + 0.1;
        break;
      }
      const when = Math.max(0, this._nextNoteTime - this.ctx.currentTime);
      const i = this._beat;
      const b = tr.bass[i % tr.bass.length];
      if (b) this.tone(NOTE[b], tr.tempo * 0.9, { type: 'triangle', vol: 0.5, when, dest: this.musicGain });
      const l = tr.lead[i % tr.lead.length];
      if (l) this.tone(NOTE[l], tr.tempo * 0.85, { type: tr.leadType, vol: tr.leadVol, when, dest: this.musicGain });
      const s = i % 8;
      if (tr.hat[s] === 'x') this.noiseHat(when);
      if (tr.kick[s] === 'x') this.kick(when);
      this._nextNoteTime += tr.tempo;
      this._beat++;
    }
    this.bgmTimer = setTimeout(() => this.scheduler(), 40);
  }

  noiseHat(when) {
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start(t0); src.stop(t0 + 0.05);
  }

  kick(when) {
    this.tone(140, 0.12, { type: 'sine', vol: 0.55, when, dest: this.musicGain, slideTo: 45 });
  }

  stopBGM() {
    if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
  }
}

export const audio = new AudioEngine();
