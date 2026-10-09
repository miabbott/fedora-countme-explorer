import { describe, expect, it } from "vitest";
import { isShortLived, percentage } from "./metrics";

describe("dashboard metrics", () => {
  it("groups age buckets one and two as short-lived", () => {
    expect(isShortLived(1)).toBe(true);
    expect(isShortLived(2)).toBe(true);
    expect(isShortLived(3)).toBe(false);
  });

  it("calculates a safe rounded percentage", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(1, 0)).toBe(0);
  });
});
