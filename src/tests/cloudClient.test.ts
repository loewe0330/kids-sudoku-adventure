import { describe, expect, test } from "vitest";
import { resolveCloudApiUrl } from "../lib/cloudClient";

describe("cloud account endpoint resolution", () => {
  test("connects the GitHub Pages build to the cross-device cloud API", () => {
    expect(resolveCloudApiUrl("loewe0330.github.io")).toBe(
      "https://kids-sudoku-adventure-cloud.netlify.app/api/cloud"
    );
  });

  test("uses a same-origin endpoint on Netlify and stays offline locally", () => {
    expect(resolveCloudApiUrl("kids-sudoku-adventure-cloud.netlify.app")).toBe("/api/cloud");
    expect(resolveCloudApiUrl("localhost")).toBe("");
  });

  test("allows an explicit endpoint override", () => {
    expect(resolveCloudApiUrl("localhost", "https://example.test/api/cloud")).toBe(
      "https://example.test/api/cloud"
    );
  });
});
