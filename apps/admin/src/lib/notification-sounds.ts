/**
 * Notification Sounds — 4 preset tones for tenant preferences
 *
 * Uses Web Audio API to generate short, pleasant notification tones.
 * Each preset is synthesized on-demand (no external audio files needed).
 *
 * Presets:
 * 1. "chime"   — classic two-tone chime (default)
 * 2. "bell"    — soft bell ring
 * 3. "drop"    — water-drop pluck
 * 4. "pulse"   — modern digital pulse
 */

export type SoundPreset = 'chime' | 'bell' | 'drop' | 'pulse' | 'none';

export const SOUND_PRESETS: { key: SoundPreset; label: string; description: string }[] = [
  { key: 'chime', label: 'Chime', description: 'Classic two-tone chime' },
  { key: 'bell', label: 'Bell', description: 'Soft bell ring' },
  { key: 'drop', label: 'Drop', description: 'Water-drop pluck' },
  { key: 'pulse', label: 'Pulse', description: 'Modern digital pulse' },
  { key: 'none', label: 'None', description: 'Silent — no sound' },
];

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a notification sound preset.
 * Returns immediately; audio plays asynchronously.
 */
export function playNotificationSound(preset: SoundPreset = 'chime'): void {
  if (preset === 'none') return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (preset) {
      case 'chime':
        playChime(ctx, now);
        break;
      case 'bell':
        playBell(ctx, now);
        break;
      case 'drop':
        playDrop(ctx, now);
        break;
      case 'pulse':
        playPulse(ctx, now);
        break;
    }
  } catch {
    // Audio not available — ignore silently
  }
}

// ── Preset 1: Chime ─────────────────────────────────────────
// Two sequential sine tones: E5 → G5

function playChime(ctx: AudioContext, now: number) {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(659.25, now); // E5
  osc1.connect(gain);
  osc1.start(now);
  osc1.stop(now + 0.3);

  const gain2 = ctx.createGain();
  gain2.connect(ctx.destination);
  gain2.gain.setValueAtTime(0.3, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5
  osc2.connect(gain2);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.7);
}

// ── Preset 2: Bell ──────────────────────────────────────────
// Decaying sine with harmonics

function playBell(ctx: AudioContext, now: number) {
  const frequencies = [523.25, 1046.5, 1568.0]; // C5, C6, G6
  const volumes = [0.25, 0.12, 0.06];

  frequencies.forEach((freq, i) => {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volumes[i], now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 1.0);
  });
}

// ── Preset 3: Drop ──────────────────────────────────────────
// Quick pitch-falling pluck

function playDrop(ctx: AudioContext, now: number) {
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.4);
}

// ── Preset 4: Pulse ─────────────────────────────────────────
// Two quick digital blips

function playPulse(ctx: AudioContext, now: number) {
  for (let i = 0; i < 2; i++) {
    const t = now + i * 0.12;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}
