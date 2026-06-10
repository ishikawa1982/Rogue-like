// =============================================================
// audio.js - Web Audio によるチップチューン（BGM・効果音）
//   外部音源なし。オシレーターとノイズだけで全部生成する。
//   自動再生制限のため、最初のユーザー操作で start() を呼ぶこと。
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

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.bgmTimer = null;
    this.noiseBuffer = null;
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

    this.startBGM();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // ---- 基本波形を1音鳴らす ----
  tone(freq, dur, { type = 'square', vol = 0.5, when = 0, dest = null, slideTo = null } = {}) {
    if (!this.ctx) return;
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
  noise(dur, { vol = 0.5, when = 0, slideTo = null } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t0);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
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
        this.tone(N['E5'], 0.06, { type: 'square', vol: 0.35 });
        this.tone(N['A5'], 0.09, { type: 'square', vol: 0.35, when: 0.06 });
        break;
      case 'coin':
        this.tone(N['B5'], 0.05, { type: 'square', vol: 0.3 });
        this.tone(N['E6'], 0.12, { type: 'square', vol: 0.3, when: 0.05 });
        break;
      case 'heal':
        this.tone(N['C5'], 0.08, { type: 'triangle', vol: 0.4 });
        this.tone(N['E5'], 0.08, { type: 'triangle', vol: 0.4, when: 0.08 });
        this.tone(N['G5'], 0.16, { type: 'triangle', vol: 0.4, when: 0.16 });
        break;
      case 'powerup':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) =>
          this.tone(N[n], 0.1, { type: 'square', vol: 0.35, when: i * 0.05 }));
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
        this.tone(N['E5'], 0.2, { type: 'sine', vol: 0.2, slideTo: NOTE['E6'] });
        break;
      case 'staff':
        this.tone(N['G5'], 0.2, { type: 'sawtooth', vol: 0.3, slideTo: NOTE['G4'] });
        break;
      case 'stairs':
        ['C5', 'D5', 'E5', 'G5'].forEach((n, i) =>
          this.tone(N[n], 0.1, { type: 'triangle', vol: 0.35, when: i * 0.07 }));
        break;
      case 'levelup':
        ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) =>
          this.tone(N[n], 0.14, { type: 'square', vol: 0.4, when: i * 0.08 }));
        break;
      case 'gameover':
        ['G4', 'F4', 'D#4', 'C4'].forEach((n, i) =>
          this.tone(N[n], 0.35, { type: 'sawtooth', vol: 0.4, when: i * 0.22 }));
        break;
      case 'win':
        ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'].forEach((n, i) =>
          this.tone(N[n], 0.18, { type: 'square', vol: 0.4, when: i * 0.12 }));
        break;
    }
  }

  // -----------------------------------------------------------
  // BGM：ちょっと不思議で軽快なループ（MOTHER風のヘンな明るさ）
  // -----------------------------------------------------------
  startBGM() {
    // ベースライン（16ステップ）
    this.bass = ['C2','C2','G2','G2','A2','A2','E2','E2','F2','F2','C2','C2','G2','G2','G2','B2'];
    // メロディ（休符は null）
    this.lead = [
      'E4', null, 'G4', 'E4', 'C4', null, 'E4', 'D4',
      'F4', null, 'A4', 'F4', 'C4', null, 'D4', 'G4',
    ];
    this._beat = 0;
    this.tempo = 0.18; // 1ステップの秒数
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  scheduler() {
    if (!this.ctx) return;
    // 先読みで音符を予約（タイマーのゆらぎに強い）
    while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
      const step = this._beat % 16;
      const when = this._nextNoteTime - this.ctx.currentTime;

      // ベース
      const b = this.bass[step];
      if (b) this.tone(NOTE[b], this.tempo * 0.9, { type: 'triangle', vol: 0.5, when, dest: this.musicGain });

      // メロディ
      const l = this.lead[step];
      if (l) this.tone(NOTE[l], this.tempo * 0.8, { type: 'square', vol: 0.32, when, dest: this.musicGain });

      // 軽いパーカッション（ノイズのハイハット）
      if (step % 2 === 0) this.noiseHat(when);

      this._nextNoteTime += this.tempo;
      this._beat++;
    }
    this.bgmTimer = setTimeout(() => this.scheduler(), 40);
  }

  noiseHat(when) {
    if (!this.ctx) return;
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

  stopBGM() {
    if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
  }
}

export const audio = new AudioEngine();
