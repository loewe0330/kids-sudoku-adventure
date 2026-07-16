import { describe, expect, test, vi } from "vitest";
import { createUuid, sha256 } from "../lib/browserCrypto";

describe("browser crypto compatibility", () => {
  test("hashes passwords when SubtleCrypto is unavailable on an HTTP LAN origin", async () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    await expect(sha256("admin123")).resolves.toBe(
      "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"
    );
    vi.unstubAllGlobals();
  });

  test("creates an RFC 4122 UUID without randomUUID", () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    expect(createUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    vi.unstubAllGlobals();
  });
});
