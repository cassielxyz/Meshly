import type { TransferProfile } from "./providers";

export type TransferSignal = "success" | "throttled" | "transient-error";

export function nextUploadConcurrency(profile: TransferProfile, current: number, signal: TransferSignal) {
  const min = 1;
  const max = Math.max(min, profile.maxActiveUploads);
  const safeCurrent = Math.min(max, Math.max(min, Math.trunc(current) || min));
  if (!profile.adaptiveConcurrency) return Math.min(max, safeCurrent);
  if (signal === "success") return Math.min(max, safeCurrent + 1);
  if (signal === "throttled") return Math.max(min, Math.ceil(safeCurrent / 2));
  return Math.max(min, safeCurrent - 1);
}

export function retryDelayMs(attempt: number, retryAfterMs?: number | null) {
  if (retryAfterMs && retryAfterMs > 0) return Math.min(60_000, retryAfterMs);
  const safeAttempt = Math.max(0, Math.min(8, Math.trunc(attempt)));
  return Math.min(30_000, 400 * 2 ** safeAttempt);
}

export function shouldRetryTransfer(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
