"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* The viewer's own state, kept in this browser.

   Stars and the blacklist use the shared key names, so a coin starred
   or hidden on another version of the page is starred or hidden here:
   the reader decided something about the coin, not about a layout.
   Everything starts empty on the server and at hydration and is read
   after mount, because the server has no storage and a first render
   seeded from it would disagree with the HTML. Storage can be blocked
   outright; not remembering a choice is no reason to refuse it, so
   every read and write is wrapped and the choice holds for the page. */

export const STARS_KEY = "ansem.terminal.stars";
export const BLACKLIST_KEY = "ansem.terminal.blacklist";
const POSTER_KEY = "ansem.terminal.broadside.poster";

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** LOCAL: candidate for foundation. A persisted list of strings, and
 *  whether it has been read yet (a count printed before then would be a
 *  zero the reader never had). The ref holds the newest list so a
 *  change is computed and written once, outside a state updater, which
 *  React may run twice. */
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

type PosterPref = "open" | "folded";

/** Run inline, before the poster is parsed: the reader's stored choice
 *  goes onto <html> as data-bs-poster, the way the network goes on as
 *  data-chain, so the first paint is already the one they chose. Read in
 *  an effect instead, a stored "folded" painted the open poster and then
 *  collapsed it, and the controls and the whole board jumped 144px. The
 *  attribute is on <html> because that element's attributes are the only
 *  ones hydration is told to leave alone (see app/layout.tsx), and React
 *  never renders it, so there is nothing for the two to disagree about.
 *  No attribute means the reader hasn't chosen, and the CSS decides from
 *  the viewport height. */
export const POSTER_SCRIPT = `try{var p=localStorage.getItem(${JSON.stringify(POSTER_KEY)});if(p==="open"||p==="folded")document.documentElement.dataset.bsPoster=p}catch(e){}`;

function readPoster(): PosterPref | null {
  try {
    const v = window.localStorage.getItem(POSTER_KEY);
    return v === "open" || v === "folded" ? v : null;
  } catch {
    return null;
  }
}

/** The fold toggle. The choice lives on <html>, not in React state, so
 *  the CSS reads it from the first paint (see POSTER_SCRIPT). The layout
 *  effect covers arriving here by a client-side link, when the inline
 *  script isn't run: it applies the choice before that first paint too.
 *  The attribute is removed on the way out; only this page reads it. */
export function usePosterToggle(): () => void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const p = readPoster();
    if (p) root.dataset.bsPoster = p;
    return () => {
      delete root.dataset.bsPoster;
    };
  }, []);

  // Works out what the reader sees before flipping it, so the first
  // press always does the visible thing, whatever "not chosen" showed.
  return useCallback(() => {
    const root = document.documentElement;
    const cur = root.dataset.bsPoster;
    const shown = cur === "open" || cur === "folded" ? cur : matchMedia("(max-height: 699px)").matches ? "folded" : "open";
    const next: PosterPref = shown === "open" ? "folded" : "open";
    root.dataset.bsPoster = next;
    try {
      window.localStorage.setItem(POSTER_KEY, next);
    } catch {
      /* Folded for this page only. */
    }
  }, []);
}
