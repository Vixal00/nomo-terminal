"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* The viewer's own lists and the one layout question JS has to answer.

   Stars and the blacklist are kept under shared key names, not
   openrow-specific ones, so a coin starred on one version of the page
   is starred on the others: the reader made one decision about the
   coin, not five. Read after mount, because the server has no storage
   and a first client render seeded from it would disagree with the
   HTML. Storage can be blocked outright (private windows, strict site
   settings); not remembering a preference is no reason to refuse it,
   so every read and write is wrapped and the list still works for the
   length of the page. */

const STARS_KEY = "ansem.terminal.stars";
const BLACKLIST_KEY = "ansem.terminal.blacklist";

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: readonly string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* Remembered for this page only. */
  }
}

/** A persisted list of strings. The ref mirrors the state so an action
 *  can compute the next list and write it once, outside the updater:
 *  React may run an updater twice, and a write inside it is a side
 *  effect in the one place side effects are not supposed to be. */
function usePersistedList(key: string) {
  const [list, setList] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const cur = useRef<string[]>([]);

  useEffect(() => {
    const stored = readList(key);
    cur.current = stored;
    setList(stored);
    setLoaded(true);
  }, [key]);

  const commit = useCallback(
    (next: string[]) => {
      cur.current = next;
      setList(next);
      writeList(key, next);
    },
    [key],
  );

  return { list, loaded, cur, commit };
}

// LOCAL: candidate for foundation
/** Starred tickers, in the order they were starred. `loaded` is false
 *  until storage has been read, so a count isn't printed as 0 during
 *  the frame where it simply isn't known yet. */
export function useStars() {
  const { list, loaded, cur, commit } = usePersistedList(STARS_KEY);
  const toggle = useCallback(
    (t: string) => {
      const prev = cur.current;
      commit(prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    },
    [cur, commit],
  );
  return { stars: list, loaded, toggle };
}

// LOCAL: candidate for foundation
/** The viewer's blacklist, in lib/trending's entry syntax: "$TICKER"
 *  hides that ticker exactly, a longer bare word hides by substring.
 *  Hiding the same entry twice is one entry, so Restore is one press. */
export function useBlacklist() {
  const { list, cur, commit } = usePersistedList(BLACKLIST_KEY);
  const hide = useCallback(
    (e: string) => {
      if (!cur.current.includes(e)) commit([...cur.current, e]);
    },
    [cur, commit],
  );
  const unhide = useCallback((e: string) => commit(cur.current.filter((x) => x !== e)), [cur, commit]);
  const restoreAll = useCallback(() => commit([]), [commit]);
  return { list, hide, unhide, restoreAll };
}

// LOCAL: candidate for foundation
/** Whether the desktop layout is in force. CSS media queries own the
 *  layout itself, so the server HTML is right at every width before any
 *  script runs; this only decides where the one inspector is mounted
 *  (the rail, or inline under a row). The server snapshot is `true`, so
 *  hydration renders the rail markup the server sent and a phone swaps
 *  it out on the next render, while CSS has already hidden the rail. */
const WIDE_QUERY = "(min-width: 1024px)";

function subscribeWide(fn: () => void) {
  const m = window.matchMedia(WIDE_QUERY);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
}

export function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}
