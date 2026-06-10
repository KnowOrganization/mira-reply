// Per-tool latency log + circuit breaker. No deps.
//
// Latency: in-memory ring buffer, last N samples per tool.
// Breaker: 3 errors in 60s → tool disabled for 60s. Auto-reset.

type Sample = { ts: number; ms: number; ok: boolean };
const RING = 256;

type BreakerState = {
  failures: number[]; // timestamps of recent failures
  openUntil: number; // 0 = closed
};

const samples = new Map<string, Sample[]>();
const breakers = new Map<string, BreakerState>();

const ERROR_WINDOW_MS = 60_000;
const ERROR_THRESHOLD = 3;
const OPEN_DURATION_MS = 60_000;

export function record(tool: string, ms: number, ok: boolean): void {
  let arr = samples.get(tool);
  if (!arr) {
    arr = [];
    samples.set(tool, arr);
  }
  arr.push({ ts: Date.now(), ms, ok });
  if (arr.length > RING) arr.shift();

  if (!ok) {
    let b = breakers.get(tool);
    if (!b) {
      b = { failures: [], openUntil: 0 };
      breakers.set(tool, b);
    }
    const now = Date.now();
    b.failures = b.failures.filter((t) => now - t < ERROR_WINDOW_MS);
    b.failures.push(now);
    if (b.failures.length >= ERROR_THRESHOLD) {
      b.openUntil = now + OPEN_DURATION_MS;
      b.failures = [];
    }
  }
}

export function isOpen(tool: string): boolean {
  const b = breakers.get(tool);
  if (!b) return false;
  if (b.openUntil === 0) return false;
  if (Date.now() >= b.openUntil) {
    b.openUntil = 0;
    return false;
  }
  return true;
}

export type ToolStats = {
  tool: string;
  count: number;
  errorRate: number;
  p50: number;
  p95: number;
  open: boolean;
};

export function stats(): ToolStats[] {
  const out: ToolStats[] = [];
  for (const [tool, arr] of samples.entries()) {
    if (!arr.length) continue;
    const sorted = arr.map((s) => s.ms).sort((a, b) => a - b);
    const errors = arr.filter((s) => !s.ok).length;
    out.push({
      tool,
      count: arr.length,
      errorRate: +(errors / arr.length).toFixed(3),
      p50: +sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
      p95: +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(2),
      open: isOpen(tool),
    });
  }
  return out.sort((a, b) => b.p95 - a.p95);
}
