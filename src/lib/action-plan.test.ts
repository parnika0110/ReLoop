import { describe, expect, it } from "vitest";
import { getActionPlanForPathway, PATHWAY_ACTION_TEMPLATES } from "./action-plan";
import { NEXT_LIFE_PATHS } from "@/types/score";

describe("getActionPlanForPathway", () => {
  it("provides tailored, non-empty action items for all 6 pathways", () => {
    for (const path of NEXT_LIFE_PATHS) {
      const items = getActionPlanForPathway(path);
      expect(items.length).toBeGreaterThanOrEqual(3);
      for (const item of items) {
        expect(item.title.length).toBeGreaterThan(5);
        expect(item.description.length).toBeGreaterThan(10);
      }
    }
  });

  it("includes safety precautions on recycling", () => {
    const recyclePlan = getActionPlanForPathway("recycle");
    expect(recyclePlan.some((i) => i.id === "inspect_battery_swelling")).toBe(true);
    expect(recyclePlan.some((i) => i.id === "locate_authorized_dismantler")).toBe(true);
  });
});
