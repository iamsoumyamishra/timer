import { Timer } from "../components/timer";

export default function TimerPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-zinc-950">
      <h1 className="sr-only">Timer</h1>
      <Timer />
    </main>
  );
}