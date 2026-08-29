/**
 * Debounced, fire-and-forget statistics refresh for write paths. Callers must
 * never await this: the HTTP response returns immediately and the numbers
 * catch up within about a minute. Per process: at most one refresh in flight
 * and at most one start per MIN_INTERVAL_MS; a call during the cooldown is
 * remembered and runs once the cooldown ends.
 */
import { logError } from "../log";

const MIN_INTERVAL_MS = 60_000;

type State = { inFlight: Promise<void> | null; lastStart: number; pending: boolean; timer: ReturnType<typeof setTimeout> | null };
const g = globalThis as unknown as { __cpStatsTrigger?: State };
const state: State = g.__cpStatsTrigger ?? (g.__cpStatsTrigger = { inFlight: null, lastStart: 0, pending: false, timer: null });

async function run(): Promise<void> {
  state.lastStart = Date.now();
  state.pending = false;
  try {
    const { refreshSnapshots } = await import("./snapshot");
    await refreshSnapshots();
  } catch (err) {
    logError("stats.refresh", err);
  } finally {
    state.inFlight = null;
    if (state.pending) scheduleStatsRefresh();
  }
}

/**
 * Serverless hosts freeze a function as soon as it responds, killing any
 * background promise. `waitUntil` tells the platform to keep the instance
 * alive until the work is done. No-op outside Vercel.
 */
function keepAlive(p: Promise<unknown>): void {
  import("@vercel/functions")
    .then((m) => m.waitUntil(p))
    .catch(() => undefined);
}

/**
 * Synchronous refresh for admin actions: the moderator's click must not
 * return until the public numbers reflect it. Bounded so a slow database
 * cannot hang the action; on timeout the debounced background path runs.
 */
export async function refreshStatsNow(timeoutMs = 15_000): Promise<void> {
  if (process.env.NODE_ENV === "test" && process.env.STATS_TRIGGER_IN_TEST !== "1") return;
  state.lastStart = Date.now();
  const { refreshSnapshots } = await import("./snapshot");
  const timer = new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`stats refresh exceeded ${timeoutMs} ms`)), timeoutMs).unref?.());
  try {
    await Promise.race([refreshSnapshots(), timer]);
  } catch (err) {
    logError("stats.refresh.sync", err);
    scheduleStatsRefresh();
  }
}

export function scheduleStatsRefresh(): void {
  if (process.env.NODE_ENV === "test" && process.env.STATS_TRIGGER_IN_TEST !== "1") return;
  if (state.inFlight) {
    state.pending = true;
    return;
  }
  const wait = Math.max(0, state.lastStart + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) {
    if (state.timer) return; // already queued
    state.pending = true;
    state.timer = setTimeout(() => {
      state.timer = null;
      if (!state.inFlight) {
        state.inFlight = run();
        keepAlive(state.inFlight);
      }
    }, wait);
    state.timer.unref?.();
    return;
  }
  state.inFlight = run();
  keepAlive(state.inFlight);
}

/** Test helper. */
export function _resetStatsTrigger(): void {
  if (state.timer) clearTimeout(state.timer);
  state.inFlight = null;
  state.lastStart = 0;
  state.pending = false;
  state.timer = null;
}
