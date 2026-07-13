import { describe, expect, test, vi } from "vitest";
import { playRewardSound } from "../lib/sound";
import type { ChildProfile } from "../types";

const settings = (soundEnabled: boolean): ChildProfile["settings"] => ({
  soundEnabled,
  immediateErrorFeedback: true,
  showTimer: true,
  practiceMode: "adventure",
  successAnimationEnabled: true,
  reducedMotion: false
});

describe("reward sound", () => {
  test("does not create audio when sound is disabled", () => {
    const factory = vi.fn();
    expect(playRewardSound(settings(false), "success", factory)).toBe(false);
    expect(factory).not.toHaveBeenCalled();
  });

  test("creates a short tone when sound is enabled", () => {
    const oscillator = {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    const context = {
      currentTime: 0,
      destination: {},
      createGain: () => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        },
        connect: vi.fn()
      }),
      createOscillator: () => oscillator,
      close: vi.fn()
    } as unknown as AudioContext;

    expect(playRewardSound(settings(true), "threeStar", () => context)).toBe(true);
    expect(oscillator.start).toHaveBeenCalled();
  });

  test("plays a longer five-note celebration for a completed puzzle", () => {
    const oscillator = {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    const context = {
      currentTime: 0,
      destination: {},
      createGain: () => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      }),
      createOscillator: () => oscillator,
      close: vi.fn()
    } as unknown as AudioContext;

    expect(playRewardSound(settings(true), "celebration", () => context)).toBe(true);
    expect(oscillator.start).toHaveBeenCalledTimes(5);
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledTimes(5);
  });
});
