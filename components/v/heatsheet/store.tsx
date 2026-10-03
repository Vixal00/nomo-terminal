"use client";

import { useCallback, useEffect, useState } from "react";

/* Viewer preferences kept in this browser.

   Every read happens after mount: the server has no storage, and a first
   client render seeded from it would disagree with the HTML it hydrates.
   Storage can also be blocked outright (a private window, cleared site
   data), so every access is wrapped: not remembering a preference is no
   reason to refuse to change it. */

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Remembered for this page only. */
  }
}

// LOCAL: candidate for foundation
/** A list of strings in localStorage as JSON. The stars and blacklist
 *  keys are deliberately not prefixed by version, so a star made here
 *  is still a star on the next version the reader opens. */
export function usePersistedList(key: string): [string[], (fn: (prev: string[]) => string[]) => void] {
  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    const raw = readStored(key);
    if (raw === null) return;
    try {
      const v: unknown = JSON.parse(raw);
      if (Array.isArray(v)) setList(v.filter((x): x is string => typeof x === "string"));
    } catch {
      /* A corrupt entry is treated as an empty list. */
    }
  }, [key]);

  const update = useCallback(
    (fn: (prev: string[]) => string[]) => {
      setList((prev) => {
        const next = fn(prev);
        writeStored(key, JSON.stringify(next));
        return next;
      });
    },
    [key],
  );

  return [list, update];
}

// LOCAL: candidate for foundation
/** One string from a fixed set, in localStorage. Anything else stored
 *  under the key (an old value, a hand edit) falls back. */
export function usePersistedString<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const raw = readStored(key);
    if (raw !== null && (allowed as readonly string[]).includes(raw)) setValue(raw as T);
    // `allowed` is a module constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      writeStored(key, v);
    },
    [key],
  );

  return [value, set];
}
