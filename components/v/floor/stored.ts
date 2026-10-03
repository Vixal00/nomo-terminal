"use client";

import { useCallback, useEffect, useState } from "react";

/* LOCAL: candidate for foundation. Every version keeps stars and a
   hidden list per viewer, and each writing its own copy of this is how
   one of them ends up reading storage during render and breaking
   hydration.

   A string list kept in localStorage under `key`. It starts empty on
   the server and in the first client render, so the two agree, and
   reads storage after mount. Storage can be blocked outright (a private
   window, a sandboxed frame); that is no reason to refuse the change,
   so a blocked write still changes the page for the session. */
export function useStoredList(key: string): [readonly string[], (next: readonly string[]) => void] {
  const [list, setList] = useState<readonly string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) setList(parsed.filter((x): x is string => typeof x === "string"));
    } catch {
      /* Unreadable or blocked: start empty. */
    }
  }, [key]);

  const set = useCallback(
    (next: readonly string[]) => {
      setList(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Kept for this page only. */
      }
    },
    [key],
  );

  return [list, set];
}
