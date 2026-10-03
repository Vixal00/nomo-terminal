"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* The viewer's own lists, kept in this browser under the shared key
   names, so a coin starred or hidden on another version of the page is
   starred or hidden here too: the reader decided something about the
   coin, not about a layout. Empty on the server and at hydration, read
   after mount (the server has no storage, and a first render seeded
   from it would disagree with the HTML). Storage can be blocked
   outright; not remembering a choice is no reason to refuse it, so every
   read and write is wrapped and the choice still holds for the page. */

export const STARS_KEY = "ansem.terminal.stars";
export const BLACKLIST_KEY = "ansem.terminal.blacklist";

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** LOCAL: candidate for foundation (Broadside and Open Row carry the
 *  same hook). A persisted list of strings, and whether storage has been
 *  read yet. The ref holds the newest list so a change is computed and
 *  written once, outside a state updater, which React may run twice. */
export function useStoredList(key: string): [string[], (next: string[]) => void, boolean] {
  const [list, setList] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const cur = useRef<string[]>([]);

  useEffect(() => {
    cur.current = readList(key);
    setList(cur.current);
    setReady(true);
  }, [key]);

  const set = useCallback(
    (next: string[]) => {
      cur.current = next;
      setList(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Remembered for this page only. */
      }
    },
    [key],
  );
  return [list, set, ready];
}
