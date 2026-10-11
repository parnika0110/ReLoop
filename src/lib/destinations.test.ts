import { describe, expect, it } from "vitest";
import { filterDestinations, INDIAN_DESTINATIONS } from "./destinations";

describe("filterDestinations", () => {
  it("filters accurately by category without fabricating entries", () => {
    const recyclers = filterDestinations("recycle");
    expect(recyclers.length).toBeGreaterThan(0);
    expect(recyclers.every((r) => r.category === "recycle")).toBe(true);
    expect(recyclers.every((r) => r.isVerified)).toBe(true);
  });

  it("filters by city query case-insensitively", () => {
    const bengaluru = filterDestinations(undefined, "bengaluru");
    expect(bengaluru.length).toBe(1);
    expect(bengaluru[0].name).toContain("Cerebra");
  });
});
