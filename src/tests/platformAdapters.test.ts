import { beforeEach, describe, expect, test, vi } from "vitest";
import { classifyDevice } from "../platform/web/webDeviceAdapter";
import { webPrintAdapter } from "../platform/web/webPrintAdapter";
import { createWebStorageAdapter } from "../platform/web/webStorageAdapter";
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

beforeEach(() => {
  localStorage.clear();
});

describe("platform adapters", () => {
  test("web storage adapter reads, writes, and restores fallback after corrupted JSON", async () => {
    const adapter = createWebStorageAdapter();
    await adapter.setItem("demo", { ok: true });
    await expect(adapter.getItem("demo", { ok: false })).resolves.toEqual({ ok: true });

    localStorage.setItem("demo", "{broken");
    await expect(adapter.getItem("demo", { ok: false })).resolves.toEqual({ ok: false });
    expect(localStorage.getItem("demo")).toBe(JSON.stringify({ ok: false }));
  });

  test("web print adapter delegates to window.print when available", () => {
    const originalPrint = window.print;
    const print = vi.fn();
    window.print = print;

    webPrintAdapter.printPuzzleSet();
    expect(print).toHaveBeenCalledTimes(1);

    window.print = originalPrint;
  });

  test("device adapter classifies required responsive ranges", () => {
    expect(classifyDevice(375, 667)).toBe("phone");
    expect(classifyDevice(768, 1024)).toBe("tablet-portrait");
    expect(classifyDevice(1024, 768)).toBe("tablet-landscape");
    expect(classifyDevice(1440, 900)).toBe("desktop");
  });

  test("sound helper does not create audio when disabled", () => {
    const factory = vi.fn();
    expect(playRewardSound(settings(false), "success", factory)).toBe(false);
    expect(factory).not.toHaveBeenCalled();
  });
});
