/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Module: js/audio.js — Pure Web Audio API Engine (5 SFX ADSR + 3 Ambient Soundscapes)
 * Không dùng bất kỳ file MP3 ngoài nào.
 */

class SystemAudioController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.8;
    this.ambientType = 'none'; // 'none' | 'rain' | 'library' | 'tavern'
    this.ambientVolume = 0.45;
    this.ambientNodes = null;
    this.ambientTimer = null;
    this.unlocked = false;

    this.setupAutoUnlock();
  }

  setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  syncSettings(settings = {}) {
    if (typeof settings.soundEnabled === 'boolean') {
      this.enabled = settings.soundEnabled;
    }
    if (typeof settings.masterVolume === 'number') {
      this.masterVolume = Math.max(0, Math.min(1, settings.masterVolume));
    }
    if (typeof settings.ambientVolume === 'number') {
      this.ambientVolume = Math.max(0, Math.min(1, settings.ambientVolume));
      if (this.ambientNodes?.masterGain && this.ctx) {
        this.ambientNodes.masterGain.gain.setTargetAtTime(
          this.enabled ? this.ambientVolume * this.masterVolume * 0.35 : 0,
          this.ctx.currentTime,
          0.1
        );
      }
    }
    if (!this.enabled) {
      this.stopAmbient();
    }
  }

  /* ==========================================================================
     5 HIỆU ỨNG ÂM THANH SFX (CÓ ADSR ENVELOPE CHỐNG TIẾNG LÁCH TÁCH)
     ========================================================================== */

  /**
   * 1. playSlash(): Tiếng kiếm khí sắc gọn khi tick hoàn thành nhiệm vụ
   */
  playSlash() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.masterVolume;

    // Noise burst lọc qua bandpass tạo âm xé gió
    const dur = 0.16;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.32));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(4200, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(900, now + dur);
    filter.Q.value = 3.0;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.linearRampToValueAtTime(0.32 * vol, now + 0.01);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.01);

    // Metallic blade harmonic
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

    oGain.gain.setValueAtTime(0.0001, now);
    oGain.gain.linearRampToValueAtTime(0.24 * vol, now + 0.012);
    oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);

    osc.connect(oGain);
    oGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * 2. playOverdrive(): Tiếng bùng nổ năng lượng khi đạt 150%, Chí Mạng hoặc Hợp Nhất
   */
  playOverdrive() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.masterVolume;

    // Sub-bass surge
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(440, now + 0.25);
    sub.frequency.exponentialRampToValueAtTime(165, now + 0.55);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.26 * vol, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.56);

    // Arpeggio chord
    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    freqs.forEach((f, idx) => {
      const t = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18 * vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * 3. playChestOpen(): Tiếng leng keng mở rương báu vật
   */
  playChestOpen() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.masterVolume;

    const notes = [
      { f: 587.33, d: 0.0, len: 0.16 },
      { f: 880.0, d: 0.08, len: 0.16 },
      { f: 1174.66, d: 0.16, len: 0.22 },
      { f: 1479.98, d: 0.25, len: 0.42 },
      { f: 1760.0, d: 0.34, len: 0.52 }
    ];

    notes.forEach(n => {
      const t = now + n.d;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.24 * vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.len);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.len + 0.02);
    });
  }

  /**
   * 4. playLevelUp(): Tiếng thăng cấp Hạng Thợ Săn / Hoàn tất Pomodoro / Hạ Boss
   */
  playLevelUp() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.masterVolume;

    const fanfare = [
      { f: 440.0, d: 0.0, len: 0.14, type: 'triangle' },
      { f: 554.37, d: 0.12, len: 0.14, type: 'triangle' },
      { f: 659.25, d: 0.24, len: 0.14, type: 'triangle' },
      { f: 880.0, d: 0.36, len: 0.62, type: 'sawtooth' },
      { f: 1108.73, d: 0.36, len: 0.62, type: 'sine' }
    ];

    fanfare.forEach(n => {
      const t = now + n.d;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.21 * vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.len);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + n.len + 0.02);
    });
  }

  /**
   * 5. playPenaltyAlarm(): Tiếng còi cảnh báo trầm đục khi bị phạt HP hoặc rơi vào Khu Vực Phạt
   */
  playPenaltyAlarm() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = this.masterVolume;

    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.32;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, t);
      osc.frequency.linearRampToValueAtTime(110, t + 0.26);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.28 * vol, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.29);
    }
  }

  /* ==========================================================================
     3 AMBIENT SOUNDSCAPES (MƯA RƠI, THƯ VIỆN, QUÁN RƯỢU FANTASY)
     Dừng sạch tài nguyên khi tắt, không rò rỉ AudioNode.
     ========================================================================== */

  startAmbient(type = 'rain') {
    this.stopAmbient();
    if (!this.enabled || !type || type === 'none') {
      this.ambientType = 'none';
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.ambientType = type;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(
      this.ambientVolume * this.masterVolume * 0.35,
      ctx.currentTime + 0.5
    );
    masterGain.connect(ctx.destination);

    // Tạo buffer 3 giây Pink/Brown noise nền
    const bufLen = ctx.sampleRate * 3;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const out = noiseBuf.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      out[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = out[i];
      out[i] *= 2.2;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    if (type === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.7;
    } else if (type === 'library') {
      filter.type = 'lowpass';
      filter.frequency.value = 260;
    } else {
      // tavern murmur
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 1.4;
    }

    noiseSource.connect(filter);
    filter.connect(masterGain);
    noiseSource.start();

    this.ambientNodes = {
      masterGain,
      noiseSource,
      filter
    };

    // Hiệu ứng chi tiết định kỳ theo từng không gian
    this.ambientTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || !this.ambientNodes) return;
      const t = this.ctx.currentTime;

      if (type === 'rain') {
        // Hạt mưa rơi tí tách ngẫu nhiên
        if (Math.random() < 0.65) {
          const dropOsc = this.ctx.createOscillator();
          const dropGain = this.ctx.createGain();
          dropOsc.type = 'sine';
          const baseF = 1600 + Math.random() * 1400;
          dropOsc.frequency.setValueAtTime(baseF, t);
          dropOsc.frequency.exponentialRampToValueAtTime(baseF * 0.6, t + 0.04);

          dropGain.gain.setValueAtTime(0.0001, t);
          dropGain.gain.linearRampToValueAtTime(0.04, t + 0.005);
          dropGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

          dropOsc.connect(dropGain);
          dropGain.connect(masterGain);
          dropOsc.start(t);
          dropOsc.stop(t + 0.05);
        }
      } else if (type === 'library') {
        // Tiếng đồng hồ quả lắc tích tắc nhẹ
        const tickOsc = this.ctx.createOscillator();
        const tickGain = this.ctx.createGain();
        tickOsc.type = 'triangle';
        tickOsc.frequency.setValueAtTime(950, t);
        tickGain.gain.setValueAtTime(0.0001, t);
        tickGain.gain.linearRampToValueAtTime(0.035, t + 0.004);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
        tickOsc.connect(tickGain);
        tickGain.connect(masterGain);
        tickOsc.start(t);
        tickOsc.stop(t + 0.03);
      } else if (type === 'tavern') {
        // Tiếng đàn Lute Fantasy gảy ngẫu nhiên trong quán rượu
        if (Math.random() < 0.55) {
          const pentatonic = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
          const noteF = pentatonic[Math.floor(Math.random() * pentatonic.length)];
          const luteOsc = this.ctx.createOscillator();
          const luteGain = this.ctx.createGain();
          luteOsc.type = 'triangle';
          luteOsc.frequency.setValueAtTime(noteF, t);

          luteGain.gain.setValueAtTime(0.0001, t);
          luteGain.gain.linearRampToValueAtTime(0.08, t + 0.015);
          luteGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

          luteOsc.connect(luteGain);
          luteGain.connect(masterGain);
          luteOsc.start(t);
          luteOsc.stop(t + 0.68);
        }
      }
    }, 1000);
  }

  stopAmbient() {
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.ambientNodes) {
      try {
        this.ambientNodes.noiseSource.stop();
        this.ambientNodes.noiseSource.disconnect();
        this.ambientNodes.filter.disconnect();
        this.ambientNodes.masterGain.disconnect();
      } catch {
        // Ignore already stopped
      }
      this.ambientNodes = null;
    }
  }
}

export const soundEngine = new SystemAudioController();

export function playSlash() {
  soundEngine.playSlash();
}

export function playOverdrive() {
  soundEngine.playOverdrive();
}

export function playChestOpen() {
  soundEngine.playChestOpen();
}

export function playLevelUp() {
  soundEngine.playLevelUp();
}

export function playPenaltyAlarm() {
  soundEngine.playPenaltyAlarm();
}
