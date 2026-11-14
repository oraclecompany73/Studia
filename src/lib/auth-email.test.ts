import { describe, expect, it } from "vitest";
import { ALLOWED_EMAIL_DOMAIN, isAllowedUniversityEmail } from "./auth-email";

describe("isAllowedUniversityEmail", () => {
  it(`accepts @${ALLOWED_EMAIL_DOMAIN} addresses`, () => {
    expect(isAllowedUniversityEmail("student@pua.edu.eg")).toBe(true);
    expect(isAllowedUniversityEmail("  Student@PUA.EDU.EG  ")).toBe(true);
  });

  it("rejects other domains and empty values", () => {
    expect(isAllowedUniversityEmail("user@gmail.com")).toBe(false);
    expect(isAllowedUniversityEmail("pua.edu.eg")).toBe(false);
    expect(isAllowedUniversityEmail("student@pua.edu.eg.evil.com")).toBe(false);
    expect(isAllowedUniversityEmail(null)).toBe(false);
    expect(isAllowedUniversityEmail("")).toBe(false);
  });
});
