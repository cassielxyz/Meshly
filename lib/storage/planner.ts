export type StorageNode = { id: string; freeBytes: number; priority?: number; healthy?: boolean };
export type Placement = { accountId: string; offset: number; size: number; part: number };
export type PlacementOptions = {
  reserveBytes?: number;
  maxPartBytes?: number;
  wholeFileFirst?: boolean;
  allowCrossAccountSplit?: boolean;
  preferredAccountId?: string;
};

const DEFAULT_RESERVE = 512 * 1024 * 1024;
const DEFAULT_MAX_PART = 2 * 1024 * 1024 * 1024;

export function planPlacement(fileSize: number, nodes: StorageNode[], options: PlacementOptions = {}): Placement[] {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) throw new Error("File size must be a positive safe integer");
  const reserve = options.reserveBytes ?? DEFAULT_RESERVE;
  const maxPart = options.maxPartBytes ?? DEFAULT_MAX_PART;
  if (reserve < 0 || maxPart <= 0) throw new Error("Invalid placement options");

  const candidates = nodes
    .filter((node) => node.healthy !== false)
    .map((node) => ({ ...node, usable: Math.max(0, node.freeBytes - reserve) }))
    .filter((node) => node.usable > 0);

  if (options.preferredAccountId) {
    const preferred = candidates.find((node) => node.id === options.preferredAccountId);
    if (!preferred) throw new Error("Selected storage account is unavailable");
    if (preferred.usable < fileSize) throw new Error("Selected storage account does not have enough available storage");
    return [{ accountId: preferred.id, offset: 0, size: fileSize, part: 0 }];
  }

  if (options.wholeFileFirst !== false || options.allowCrossAccountSplit !== true) {
    const whole = [...candidates]
      .filter((node) => node.usable >= fileSize)
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.usable - b.usable)[0];
    if (whole) return [{ accountId: whole.id, offset: 0, size: fileSize, part: 0 }];
  }

  if (options.allowCrossAccountSplit !== true) {
    throw new Error("No single storage account has enough available storage");
  }

  const total = candidates.reduce((sum, node) => sum + node.usable, 0);
  if (total < fileSize) throw new Error("Not enough pooled storage");
  const ordered = [...candidates].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || b.usable - a.usable);
  const result: Placement[] = [];
  let offset = 0;
  let remaining = fileSize;
  let part = 0;

  for (const node of ordered) {
    let capacity = node.usable;
    while (capacity > 0 && remaining > 0) {
      const size = Math.min(capacity, remaining, maxPart);
      result.push({ accountId: node.id, offset, size, part: part++ });
      offset += size;
      remaining -= size;
      capacity -= size;
    }
    if (remaining === 0) break;
  }

  if (remaining !== 0) throw new Error("Placement planner invariant failed");
  return result;
}
