"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "@/components/ui";

/* Copied from ansem-v2's components/toast.tsx and adapted for the
   terminal in two ways:

   - A third tone, "info". A placeholder buy is neither a success nor a
     failure: nothing was attempted. A green tick over "Not sent" would
     say the opposite of its own sentence, so it gets a neutral plate
     and a dash.
   - Every tone is a token. The original wrote each colour as an RGB
     literal, which on network 2 put a spring-green plate on a
     chartreuse site. --toast-c now names the token itself and the
     plate's washes are mixed from it with color-mix, so the ok tone
     follows --color-accent across the network swap with nothing to
     keep in step by hand.

   The corner radius and the shadow are the original's and are allowed:
   a toast is the one panel that sits in front of the page rather than
   in it (globals.css, .toast-card). */

type Tone = "ok" | "fail" | "info";
type Toast = {
  id: number;
  title: string;
  body?: string;
  tone?: Tone;
  /** Set while the card is playing its exit. It stays mounted for the
   *  length of that animation, because a panel that vanishes on the
   *  frame its timer expires reads as a glitch rather than as a thing
   *  that finished. */
  leaving?: boolean;
};

/** How long a toast is up, and how long it takes to go. The first is
 *  also the length of the bar that drains along its bottom edge, so the
 *  two cannot drift apart. */
const LIFE = 4500;
const EXIT = 170;

const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--color-accent)",
  fail: "var(--color-neg)",
  // A neutral, not a verdict.
  info: "var(--color-muted)",
};

/** The tone at `pct` strength over whatever is behind it. */
const mix = (pct: number) => `color-mix(in oklab, var(--toast-c) ${pct}%, transparent)`;

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

/** Confirmations, top centre.
 *
 *  Top centre rather than a corner because this is the answer to
 *  something the reader just did, and the thing they did was in the
 *  middle of the screen. The bottom is taken by the status strip.
 *
 *  Live region rather than an alert: an answer is not an interruption,
 *  and assertive would cut across whatever a screen reader was already
 *  saying. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  /* Two steps: mark it leaving, then take it out once the exit has
     played. Both timers are held in the same map so a card dismissed by
     hand cannot be removed twice. */
  const drop = useCallback((id: number) => {
    let already = false;
    setItems((list) => {
      already = list.some((t) => t.id === id && t.leaving);
      return list.map((t) => (t.id === id ? { ...t, leaving: true } : t));
    });
    if (already) return;
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.set(
      id,
      setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, EXIT),
    );
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setItems((list) => [...list, { ...t, id }]);
      timers.current.set(
        id,
        setTimeout(() => drop(id), LIFE),
      );
    },
    [drop],
  );

  /* Cleared on unmount, so a route change while one is up cannot leave a
     timer pointing at a component that has gone. */
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => {
          const tone = t.tone ?? "ok";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => drop(t.id)}
              aria-label="Dismiss"
              style={
                {
                  "--toast-c": TONE_COLOR[tone],
                  "--toast-life": `${LIFE}ms`,
                } as React.CSSProperties
              }
              className={cx(
                "toast-card pointer-events-auto relative isolate flex max-w-[min(430px,100%)] items-center gap-3 overflow-hidden rounded-[9px] border px-3.5 py-3 text-left transition-colors",
                t.leaving ? "toast-out" : "toast-in",
                tone === "fail"
                  ? "border-neg/45 hover:border-neg/70"
                  : tone === "info"
                    ? "border-line-bright hover:border-muted"
                    : "border-accent/40 hover:border-accent/70",
              )}
            >
              <span
                aria-hidden
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border"
                style={{
                  borderColor: mix(45),
                  background: mix(14),
                  color: "var(--toast-c)",
                }}
              >
                {tone === "fail" ? (
                  <Cross className="h-[13px] w-[13px]" />
                ) : tone === "info" ? (
                  <Dash className="h-[13px] w-[13px]" />
                ) : (
                  <Tick className="h-[13px] w-[13px]" />
                )}
              </span>

              {/* Sentence case at reading weight: these are sentences,
                  not labels. */}
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-snug text-bone">{t.title}</span>
                {t.body && <span className="mt-1 block text-[12px] leading-relaxed text-muted">{t.body}</span>}
              </span>

              {/* How long is left, drawn along the bottom edge. Flat, in
                  the tone, where the original ran a gradient. */}
              <span
                aria-hidden
                className={cx("absolute inset-x-0 bottom-0 h-[2px]", !t.leaving && "toast-timer")}
                style={{ background: mix(50) }}
              />
            </button>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

/** A failure is a cross, not a triangle: the triangle warns of what
 *  might go wrong, and this reports what did not happen. */
function Cross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cx("shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="m6.4 6.4 7.2 7.2M13.6 6.4l-7.2 7.2" />
    </svg>
  );
}

function Tick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cx("shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5.6 10.4 3 3 5.8-6.6" />
    </svg>
  );
}

/** Nothing happened, drawn as nothing: a level line. */
function Dash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cx("shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 10h8" />
    </svg>
  );
}
