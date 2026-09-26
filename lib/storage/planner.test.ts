import { describe, expect, it } from "vitest";
import { planPlacement } from "./planner";

const GiB = 1024 ** 3;

describe("placement planner", () => {
  it("keeps a file whole when a healthy node fits", () => {
    const result = planPlacement(2 * GiB, [{ id: "a", freeBytes: 5 * GiB }, { id: "b", freeBytes: 9 * GiB }], { reserveBytes: 0 });
    expect(result).toEqual([{ accountId: "a", offset: 0, size: 2 * GiB, part: 0 }]);
  });

  it("defaults to whole-file placement and rejects cross-account splitting", () => {
    expect(() => planPlacement(4 * GiB, [{ id: "a", freeBytes: 2 * GiB }, { id: "b", freeBytes: 3 * GiB }], { reserveBytes: 0 })).toThrow(/single storage account/);
  });

  it("honors an explicitly selected account when it fits", () => {
    const result = planPlacement(2 * GiB, [{ id: "a", freeBytes: 8 * GiB }, { id: "b", freeBytes: 6 * GiB }], { reserveBytes: 0, preferredAccountId: "b" });
    expect(result).toEqual([{ accountId: "b", offset: 0, size: 2 * GiB, part: 0 }]);
  });

  it("rejects an explicitly selected account when it cannot fit the file", () => {
    expect(() => planPlacement(4 * GiB, [{ id: "a", freeBytes: 8 * GiB }, { id: "b", freeBytes: 3 * GiB }], { reserveBytes: 0, preferredAccountId: "b" })).toThrow(/Selected storage account/);
  });

  it("keeps the generic splitter available only when a provider explicitly permits distributed parts", () => {
    const result = planPlacement(4 * GiB, [{ id: "a", freeBytes: 2 * GiB, priority: 1 }, { id: "b", freeBytes: 3 * GiB, priority: 2 }], { reserveBytes: 0, maxPartBytes: 2 * GiB, allowCrossAccountSplit: true });
    expect(result.map((item) => [item.accountId, item.offset, item.size])).toEqual([["a", 0, 2 * GiB], ["b", 2 * GiB, 2 * GiB]]);
  });

  it("can stripe even when one account fits only when explicitly enabled", () => {
    const result = planPlacement(3 * GiB, [{ id: "a", freeBytes: 2 * GiB, priority: 1 }, { id: "b", freeBytes: 8 * GiB, priority: 2 }], { reserveBytes: 0, maxPartBytes: 2 * GiB, wholeFileFirst: false, allowCrossAccountSplit: true });
    expect(result.length).toBe(2);
    expect(result[0]?.accountId).toBe("a");
  });

  it("rejects insufficient pooled capacity when distributed placement is explicitly enabled", () => {
    expect(() => planPlacement(10 * GiB, [{ id: "a", freeBytes: 2 * GiB }], { reserveBytes: 0, allowCrossAccountSplit: true })).toThrow(/pooled storage/);
  });
});
