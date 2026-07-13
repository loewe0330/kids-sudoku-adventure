import type { ChildProfile } from "../types";

type RewardSoundKind = "success" | "celebration" | "threeStar" | "levelUp";

const soundPatterns: Record<RewardSoundKind, number[]> = {
  success: [523, 659],
  celebration: [523, 659, 784, 1046, 1319],
  threeStar: [659, 784, 988],
  levelUp: [523, 659, 784, 1046]
};

export const playRewardSound = (
  settings: ChildProfile["settings"],
  kind: RewardSoundKind,
  audioContextFactory: (() => AudioContext) | undefined = typeof window === "undefined"
    ? undefined
    : () => new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()
): boolean => {
  if (!settings.soundEnabled || !audioContextFactory) return false;

  const AudioContextCtor = typeof window === "undefined"
    ? undefined
    : window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor && !audioContextFactory) return false;

  try {
    const context = audioContextFactory();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    gain.connect(context.destination);

    soundPatterns[kind].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.11);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.11);
      oscillator.stop(context.currentTime + index * 0.11 + 0.16);
    });
    window.setTimeout(() => void context.close(), 700);
    return true;
  } catch {
    return false;
  }
};
