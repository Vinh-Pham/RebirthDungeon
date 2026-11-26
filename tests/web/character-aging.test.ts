import { expect, it } from "vitest";
import { ageInterval } from "../../src/game/content/character-aging";

it("crosses Pacific Saturday noon once and keeps the same boundary idempotent", () => {
  const boundary = Date.parse("2026-11-28T20:00:00Z");
  expect(ageInterval(boundary - 1, boundary - 1000).weeks).toBe(0);
  expect(ageInterval(boundary, boundary - 1)).toEqual({ boundary, weeks: 1 });
  expect(ageInterval(boundary + 1, boundary).weeks).toBe(0);
});

it("counts calendar weeks across both daylight saving transitions", () => {
  expect(ageInterval(Date.parse("2026-03-14T19:00:00Z"), Date.parse("2026-03-07T20:00:00Z")).weeks).toBe(1);
  expect(ageInterval(Date.parse("2026-11-07T20:00:00Z"), Date.parse("2026-10-31T19:00:00Z")).weeks).toBe(1);
  expect(ageInterval(Date.parse("2026-11-28T20:00:00Z"), Date.parse("2026-10-31T19:00:00Z")).weeks).toBe(4);
});

it("does not move the processed timestamp backward when the clock rolls back", () => {
  const after = Date.parse("2026-11-28T20:00:00Z");
  expect(ageInterval(after - 1, after)).toEqual({ boundary: after, weeks: 0 });
});
