import { describe, expect, it } from "vitest";
import { takeRateLimit } from "./rate-limit";

describe("takeRateLimit", () => {
  it("allows up to the limit then blocks within the window", () => {
    const key = `test:${Math.random()}`;
    expect(takeRateLimit(key, 2, 60_000)).toBe(true);
    expect(takeRateLimit(key, 2, 60_000)).toBe(true);
    expect(takeRateLimit(key, 2, 60_000)).toBe(false);
  });
});
