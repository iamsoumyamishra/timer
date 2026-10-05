"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  createTimer,
  getServerSnapshot,
  getSnapshot,
  saveTimer,
  subscribe,
} from "../lib/timer-store";

type Draft = { hours: string; minutes: string; seconds: string };

const FIELDS = [
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
] as const;

const PRESETS = [
  { label: "5m", draft: { hours: "0", minutes: "5", seconds: "0" } },
  { label: "10m", draft: { hours: "0", minutes: "10", seconds: "0" } },
  { label: "15m", draft: { hours: "0", minutes: "15", seconds: "0" } },
  { label: "30m", draft: { hours: "0", minutes: "30", seconds: "0" } },
  { label: "1h", draft: { hours: "1", minutes: "0", seconds: "0" } },
  { label: "2h", draft: { hours: "2", minutes: "0", seconds: "0" } },
] as const;

const DEFAULT_DRAFT: Draft = { hours: "0", minutes: "5", seconds: "0" };

function parseNonNegativeInt(raw: string): number {
  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function TimerSettings() {
  const router = useRouter();
  const { timer } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggested = useMemo<Draft>(() => {
    if (timer.durationMs <= 0) {
      return DEFAULT_DRAFT;
    }

    const totalSeconds = Math.round(timer.durationMs / 1000);

    return {
      hours: String(Math.floor(totalSeconds / 3600)),
      minutes: String(Math.floor(totalSeconds / 60) % 60),
      seconds: String(totalSeconds % 60),
    };
  }, [timer.durationMs]);

  const value = draft ?? suggested;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Fields are summed rather than clamped, so 90 minutes becomes 1h 30m.
    const totalSeconds =
      parseNonNegativeInt(value.hours) * 3600 +
      parseNonNegativeInt(value.minutes) * 60 +
      parseNonNegativeInt(value.seconds);

    if (totalSeconds <= 0) {
      setError("Enter a duration greater than zero.");
      return;
    }

    setError(null);
    saveTimer(createTimer(totalSeconds * 1000));
    router.push("/timer");
  }

  const inputClass =
    "w-20 rounded-xl border border-zinc-300 bg-white px-2 py-3 text-center font-mono text-2xl tabular-nums text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none sm:w-24 sm:px-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col items-center gap-8 rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Set timer</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        {FIELDS.map((field, index) => (
          <div key={field.key} className="flex items-center gap-2 sm:gap-3">
            {index > 0 ? (
              <span aria-hidden className="pt-5 text-2xl text-zinc-400">
                :
              </span>
            ) : null}

            <label className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {field.label}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={value[field.key]}
                onChange={(event) =>
                  setDraft({ ...value, [field.key]: event.target.value })
                }
                className={inputClass}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setDraft({ ...preset.draft });
              setError(null);
            }}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-emerald-700 hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:border-emerald-400 dark:hover:bg-emerald-400"
      >
        Start timer
      </button>
    </form>
  );
}