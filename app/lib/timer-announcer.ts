export type Announcement = {
  /** Remaining time at which to speak, in milliseconds. */
  atMs: number;
  /** What gets read aloud. */
  text: string;
};

/**
 * Ordered longest to shortest. Crossing detection relies on this order, so each
 * threshold is announced as the countdown passes it, and a long background gap
 * replays the missed thresholds in the order they elapsed.
 */
export const ANNOUNCEMENTS: readonly Announcement[] = [
  { atMs: 2 * 60 * 60 * 1000, text: "2 hours is remaining" },
  { atMs: 60 * 60 * 1000, text: "1 hour is remaining" },
  { atMs: 30 * 60 * 1000, text: "30 minutes is remaining" },
  { atMs: 15 * 60 * 1000, text: "15 minutes is remaining" },
  { atMs: 5 * 60 * 1000, text: "5 minutes is remaining" },
  { atMs: 60 * 1000, text: "1 minute is remaining" },
  { atMs: 30 * 1000, text: "30 seconds is remaining" },
] as const;

export const SPENT_TEXT = "Time is up";

/**
 * Announcements whose threshold the countdown just passed.
 *
 * Detect crossings rather than "remaining is below X": a page that loads with
 * 29 minutes left has not reached the 30 minute mark, and must stay silent.
 * Passing `previousMs` exactly means nothing is announced for it, so a timer
 * that starts exactly on a threshold stays quiet at the start.
 */
export function announcementsBetween(previousMs: number, remainingMs: number): Announcement[] {
  if (remainingMs > previousMs) {
    return [];
  }

  return ANNOUNCEMENTS.filter(
    (announcement) => previousMs > announcement.atMs && remainingMs <= announcement.atMs,
  );
}

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

/**
 * English voice, preferring a local one since it starts faster and needs no
 * network round trip.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices();
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));

  return english.find((voice) => voice.localService) ?? english[0] ?? null;
}

let voice: SpeechSynthesisVoice | null = null;
let voicesBound = false;

function onVoicesChanged(): void {
  voice = pickVoice();
}

/**
 * Voices load asynchronously, so read the current list and bind the later
 * update event too.
 */
export function primeVoice(): void {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
    return;
  }

  onVoicesChanged();

  if (!voicesBound) {
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    voicesBound = true;
  }
}

function createUtterance(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const resolved = voice ?? pickVoice();

  if (resolved !== null) {
    utterance.voice = resolved;
    utterance.lang = resolved.lang;
  } else {
    utterance.lang = "en-US";
  }

  return utterance;
}

/**
 * Speaks a batch in order. One cancel up front, then queue every utterance, so
 * a batch of missed thresholds is heard in sequence rather than cutting the
 * first one off when the second is queued.
 */
export function speakAll(texts: readonly string[]): void {
  if (texts.length === 0) {
    return;
  }

  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
    return;
  }

  window.speechSynthesis.cancel();

  for (const text of texts) {
    window.speechSynthesis.speak(createUtterance(text));
  }
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
    return;
  }

  window.speechSynthesis.cancel();
}