/**
 * SYSTEM: NGŨ HÀNH LEVELING — Web Audio API Synthesizer
 * Thuần 100% OscillatorNode & GainNode, không phụ thuộc file MP3 ngoài.
 */

class SystemAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    const savedMute = localStorage.getItem('nh_system_sound_enabled');
    if (savedMute !== null) {
      this.enabled = JSON.parse(savedMute);
    }
  }

  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('nh_system_sound_enabled', JSON.stringify(this.enabled));
    if (this.enabled) {
      this.playSlash();
    }
    return this.enabled;
  }

  /**
   * 1. playSlash(): Tiếng kiếm khí sắc bén / tick hoàn thành nhiệm vụ
   */
  playSlash() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // White noise burst lọc qua bandpass tạo âm thanh xé gió (kiếm khí)
    const bufferSize = this.ctx.sampleRate * 0.16;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(4200, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.16);
    filter.Q.value = 3.2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(now);

    // Âm kim loại ngân nhẹ (Metallic blade ring)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.06); // D6
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.22); // A5

    oscGain.gain.setValueAtTime(0.28, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * 2. playOverdrive(): Tiếng bùng nổ năng lượng khi đạt 150% hoặc Combo Ngũ Hành
   */
  playOverdrive() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub-bass power surge
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(440, now + 0.28);
    subOsc.frequency.exponentialRampToValueAtTime(220, now + 0.55);

    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.55);

    // Chuỗi hợp âm điện tử bùng nổ (Arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C5 -> G6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.055;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  }

  /**
   * 3. playChestOpen(): Tiếng leng keng mở rương báu vật (Mystery Loot Drop)
   */
  playChestOpen() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Giai điệu leng keng (Chime sparkle)
    const chimeNotes = [
      { freq: 587.33, time: 0.0, dur: 0.15 },   // D5
      { freq: 880.00, time: 0.09, dur: 0.15 },  // A5
      { freq: 1174.66, time: 0.18, dur: 0.22 }, // D6
      { freq: 1479.98, time: 0.28, dur: 0.45 }, // F#6
      { freq: 1760.00, time: 0.38, dur: 0.55 }  // A6
    ];

    chimeNotes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + note.time;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + note.dur + 0.02);
    });
  }

  /**
   * 4. playLevelUp(): Tiếng thăng cấp Hạng Thợ Săn / Hoàn thành Hầm Ngục Tập Trung
   */
  playLevelUp() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Fanfare Solo Leveling style
    const fanfare = [
      { freq: 440.00, delay: 0.00, duration: 0.14, type: 'triangle' }, // A4
      { freq: 554.37, delay: 0.12, duration: 0.14, type: 'triangle' }, // C#5
      { freq: 659.25, delay: 0.24, duration: 0.14, type: 'triangle' }, // E5
      { freq: 880.00, delay: 0.36, duration: 0.65, type: 'sawtooth' }, // A5
      { freq: 1108.73, delay: 0.36, duration: 0.65, type: 'sine' }     // C#6 harmony
    ];

    fanfare.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + item.delay;

      osc.type = item.type;
      osc.frequency.setValueAtTime(item.freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + item.duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + item.duration + 0.02);
    });
  }

  /**
   * 5. playPenaltyAlarm(): Tiếng còi cảnh báo trầm đục khi rơi vào Khu Vực Phạt
   */
  playPenaltyAlarm() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    for (let pulse = 0; pulse < 3; pulse++) {
      const start = now + pulse * 0.34;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, start); // E3 trầm đục
      osc.frequency.linearRampToValueAtTime(110, start + 0.28); // A2

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.32, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.31);
    }
  }
}

// Khởi tạo instance toàn cục và các hàm wrapper theo đúng kiến trúc yêu cầu
const soundEngine = new SystemAudioEngine();

function playSlash() {
  soundEngine.playSlash();
}

function playOverdrive() {
  soundEngine.playOverdrive();
}

function playChestOpen() {
  soundEngine.playChestOpen();
}

function playLevelUp() {
  soundEngine.playLevelUp();
}

function playPenaltyAlarm() {
  soundEngine.playPenaltyAlarm();
}
