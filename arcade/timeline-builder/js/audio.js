// Original, procedurally-synthesized sound effects via WebAudio — no
// external audio files, so nothing to license or fetch.
//
// To swap in real recorded audio later: change an entry in SOUND_MAP from a
// synth function to a string URL (e.g. "correct": "/arcade/timeline-builder/assets/audio/correct.mp3").
// AudioEngine.play() plays a URL through an <audio> element automatically,
// no other code needs to change.
const SOUND_MAP = {
  click: (ctx, destination) => playTone(ctx, destination, [660], { type: "square", duration: 0.05, gain: 0.05 }),
  correct: (ctx, destination) =>
    playArpeggio(ctx, destination, [523.25, 659.25, 783.99], { type: "triangle", noteDuration: 0.11, gain: 0.08 }),
  incorrect: (ctx, destination) =>
    playArpeggio(ctx, destination, [220, 164.81], { type: "sawtooth", noteDuration: 0.14, gain: 0.09 }),
  victory: (ctx, destination) =>
    playArpeggio(ctx, destination, [523.25, 659.25, 783.99, 1046.5], { type: "triangle", noteDuration: 0.16, gain: 0.09 }),
};

// Ambient background music: no track yet. Drop a URL here once one is
// available (e.g. "/arcade/timeline-builder/assets/audio/ambient.mp3") and
// startMusic()/stopMusic() below will pick it up automatically — no other
// code needs to change. Until then the music toggle stays wired up but silent.
const MUSIC_TRACK_URL = null;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.musicElement = null;
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    this.ctx = new AudioContextCtor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }

  resume() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  play(name) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.resume();
    const synth = SOUND_MAP[name];
    if (typeof synth === "function") {
      synth(ctx, this.masterGain);
    } else if (typeof synth === "string") {
      new Audio(synth).play().catch(() => {});
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  startMusic() {
    if (!this.musicEnabled || !MUSIC_TRACK_URL || this.musicElement) return;
    this.musicElement = new Audio(MUSIC_TRACK_URL);
    this.musicElement.loop = true;
    this.musicElement.volume = 0.3;
    this.musicElement.play().catch(() => {});
  }

  stopMusic() {
    if (!this.musicElement) return;
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
    this.musicElement = null;
  }
}

function playTone(ctx, destination, frequencies, { type, duration, gain }) {
  const now = ctx.currentTime;
  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(gain, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(envelope);
    envelope.connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  });
}

function playArpeggio(ctx, destination, frequencies, { type, noteDuration, gain }) {
  frequencies.forEach((freq, index) => {
    const startAt = ctx.currentTime + index * (noteDuration * 0.55);
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(gain, startAt + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + noteDuration);
    osc.connect(envelope);
    envelope.connect(destination);
    osc.start(startAt);
    osc.stop(startAt + noteDuration + 0.02);
  });
}
