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
      if (!state.inFlight) state.inFlight = run();
    }, wait);
    state.timer.unref?.();
    return;
  }
  state.inFlight = run();
}

/** Test helper. */
export function _resetStatsTrigger(): void {
  if (state.timer) clearTimeout(state.timer);
  state.inFlight = null;
  state.lastStart = 0;
  state.pending = false;
  state.timer = null;
}
