export type TimerState = {
  durationMs: number;
  remainingMs: number;
  running: boolean;
  endsAt: number | null;
};

const STORAGE_KEY = "timer-state";

export const EMPTY_TIMER: TimerState = {
  durationMs: 0,
  remainingMs: 0,
  running: false,
  endsAt: null,
};

export function createTimer(durationMs: number): TimerState {
  return {
    durationMs,
    remainingMs: durationMs,
    running: false,
    endsAt: null,
  };
}

export function remainingAt(state: TimerState, now: number): number {
  if (state.running && state.endsAt !== null) {
    return Math.max(0, state.endsAt - now);
  }

  return Math.max(0, state.remainingMs);
}

function toNonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function sanitize(value: unknown): TimerState {
  if (typeof value !== "object" || value === null) {
    return EMPTY_TIMER;
  }

  const candidate = value as Partial<TimerState>;
  const durationMs = toNonNegativeNumber(candidate.durationMs);
  const endsAt = toNonNegativeNumber(candidate.endsAt);
  const running = candidate.running === true && durationMs > 0 && endsAt > 0;

  return {
    durationMs,
    remainingMs: Math.min(durationMs, toNonNegativeNumber(candidate.remainingMs)),
    running,
    endsAt: running ? endsAt : null,
  };
}

function parse(raw: string | null): TimerState {
  if (raw === null) {
    return EMPTY_TIMER;
  }

  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return EMPTY_TIMER;
  }
}

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedIsFresh = false;
let cachedState: TimerState = EMPTY_TIMER;

function readRaw(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getServerSnapshot(): TimerState {
  return EMPTY_TIMER;
}

// Must return a referentially stable value while storage is unchanged, so the
// parsed result is cached against the raw string.
export function getSnapshot(): TimerState {
  const raw = readRaw();

  if (!cachedIsFresh || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIsFresh = true;
    cachedState = parse(raw);
  }

  return cachedState;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function saveTimer(state: TimerState): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode, quota). The timer still
      // works for the current page, it just will not survive a reload.
    }
  }

  cachedIsFresh = false;
  cachedRaw = null;

  for (const listener of listeners) {
    listener();
  }
}