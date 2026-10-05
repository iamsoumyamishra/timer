"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  saveTimer,
  subscribe,
} from "../lib/timer-store";

const CENTISECOND = 10;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function splitTime(ms: number) {
  const totalCentiseconds = Math.floor(ms / CENTISECOND);

  return {
    centiseconds: totalCentiseconds % 100,
    seconds: Math.floor(totalCentiseconds / 100) % 60,
    minutes: Math.floor(totalCentiseconds / 6000) % 60,
    hours: Math.floor(totalCentiseconds / 360000),
  };
}

export function Timer() {
  const router = useRouter();
  const timer = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { durationMs, remainingMs, running, endsAt } = timer;
  const ready = durationMs > 0;

  // `null` until the first animation frame after mount, so a timer restored
  // from storage while running never renders a stale remaining value.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) {
      router.replace("/");
    }
  }, [ready, router]);

  useEffect(() => {
    if (!ready || !running || endsAt === null) {
      return;
    }

    let shown = -1;
    let frame = requestAnimationFrame(function tick() {
      const reference = Date.now();
      const remaining = Math.max(0, endsAt - reference);

      if (remaining <= 0) {
        saveTimer({ durationMs, remainingMs: 0, running: false, endsAt: null });
        return;
      }

      const centiseconds = Math.floor(remaining / CENTISECOND);

      if (centiseconds !== shown) {
        shown = centiseconds;
        setNow(reference);
      }

      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [ready, running, endsAt, durationMs]);

  function play() {
    if (running) {
      return;
    }

    const remaining = remainingMs > 0 ? remainingMs : durationMs;
    const startedAt = Date.now();

    setNow(startedAt);
    saveTimer({ ...timer, remainingMs: remaining, running: true, endsAt: startedAt + remaining });
  }

  function pause() {
    if (!running || endsAt === null) {
      return;
    }

    const remaining = Math.max(0, endsAt - Date.now());
    saveTimer({ ...timer, remainingMs: remaining, running: false, endsAt: null });
  }

  function reset() {
    saveTimer({ ...timer, remainingMs: durationMs, running: false, endsAt: null });
  }

  const remaining =
    running && endsAt !== null && now !== null ? Math.max(0, endsAt - now) : remainingMs;

  const { centiseconds, seconds, minutes, hours } = splitTime(remaining);
  const progress = durationMs > 0 ? Math.min(100, (remaining / durationMs) * 100) : 100;
  const finished = ready && !running && remaining === 0;

  const buttonClass =
    "rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-zinc-700";

  if (!ready || (running && now === null)) {
    return <div aria-hidden className="h-60 w-full max-w-md rounded-3xl" />;
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8 rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex w-full items-center justify-between">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Edit
        </Link>
        {!finished ? (
          <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
            {running ? "Running" : "Paused"}
          </span>
        ) : null}
      </div>

      {finished ? (
        <div
          role="alert"
          className="text-center text-4xl leading-none font-semibold tracking-tight text-emerald-600 sm:text-5xl dark:text-emerald-400"
        >
          Time&apos;s up
        </div>
      ) : (
        <div
          role="timer"
          aria-label="Time remaining"
          className="font-mono text-6xl leading-none font-semibold tracking-tight tabular-nums text-zinc-900 sm:text-7xl dark:text-zinc-50"
        >
          {hours > 0
            ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
            : `${pad(minutes)}:${pad(seconds)}`}
          <span className="text-3xl text-zinc-400 sm:text-4xl dark:text-zinc-500">
            .{pad(centiseconds)}
          </span>
        </div>
      )}

      <div
        aria-hidden
        className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={running ? pause : play}
          className={`${buttonClass} border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:border-emerald-400 dark:hover:bg-emerald-400`}
        >
          {running ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={reset}
          className={`${buttonClass} hover:bg-zinc-100 dark:hover:bg-zinc-800`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}