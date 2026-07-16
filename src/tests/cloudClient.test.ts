import { describe, expect, test } from "vitest";
import { resolveCloudApiUrl } from "../lib/cloudClient";

describe("cloud account endpoint resolution", () => {
  test("connects the GitHub Pages build to the cross-device cloud API", () => {
    expect(resolveCloudApiUrl("loewe0330.github.io")).toBe(
      "https://kids-sudoku-adventure-cloud.netlify.app/api/cloud"
    );
  });

  test("uses a same-origin endpoint on Netlify and stays offline on localhost", () => {
    expect(resolveCloudApiUrl("kids-sudoku-adventure-cloud.netlify.app")).toBe("/api/cloud");
    expect(resolveCloudApiUrl("localhost")).toBe("");
  });

  test("connects private-network devices to the shared account API", () => {
    expect(resolveCloudApiUrl("192.168.31.188")).toBe(
      "https://kids-sudoku-adventure-cloud.netlify.app/api/cloud"
    );
    expect(resolveCloudApiUrl("10.0.0.8")).toBe(
      "https://kids-sudoku-adventure-cloud.netlify.app/api/cloud"
    );
    expect(resolveCloudApiUrl("172.20.10.2")).toBe(
      "https://kids-sudoku-adventure-cloud.netlify.app/api/cloud"
    );
  });

  test("allows an explicit endpoint override", () => {
    expect(resolveCloudApiUrl("localhost", "https://example.test/api/cloud")).toBe(
      "https://example.test/api/cloud"
    );
  });
});
