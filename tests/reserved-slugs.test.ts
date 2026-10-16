import { describe, expect, it } from "vitest";
import { isReservedSlug } from "@/lib/reserved-slugs";

describe("reserved slugs", () => {
  it("reserves every top-level route so no workspace can shadow it", () => {
    for (const slug of ["demo", "api", "sign-in", "sign-up", "invite"]) {
      expect(isReservedSlug(slug)).toBe(true);
    }
  });

  it("allows ordinary workspace slugs, including ones that merely contain a reserved word", () => {
    for (const slug of ["acme-corp", "demo-team", "my-api", "demos"]) {
      expect(isReservedSlug(slug)).toBe(false);
    }
  });
});
