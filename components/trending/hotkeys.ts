"use client";

import { useEffect, useRef } from "react";

/** The keys every version means the same thing by.
 *
 *  Fixed across all five versions, because a trader who learns H on one
 *  should not hide a coin on one page and hold a position on the next
 *  (the first drafts had H as tab cycle, Hide and Hold, and S as Star
 *  and as a score sort). A version may bind other keys for its own
 *  controls, but never re-bind one of these to something else, and
 *  lists these first in its key help.
 *
 *    J / K        move the row focus down / up (ArrowDown / ArrowUp too)
 *    /            focus the search field
 *    Esc          clear the search, then the selection
 *    B            placeholder-buy the focused row at the quick-buy size
 *    P            pause or resume the simulation (and with it, the order)
 *    1 2 3 4      window 5m / 1h / 6h / 24h
 *    [ / ]        previous / next tab
 *    H            hide the focused coin (adds it to the blacklist)
 *    S            star or unstar the focused coin
 */
export const CORE_HOTKEYS = {
  j: "Move down",
  k: "Move up",
  "/": "Search",
  Escape: "Clear search, then selection",
  b: "Buy focused row (placeholder)",
  p: "Pause or resume",
  "1": "Window 5m",
  "2": "Window 1h",
  "3": "Window 6h",
  "4": "Window 24h",
  "[": "Previous tab",
  "]": "Next tab",
  h: "Hide focused coin",
  s: "Star focused coin",
} as const;

export type CoreKey = keyof typeof CORE_HOTKEYS;
export type HotkeyMap = Partial<Record<CoreKey | "ArrowDown" | "ArrowUp" | (string & {}), (e: KeyboardEvent) => void>>;

/** True while typing somewhere, or while a dialog or a disclosure that
 *  asked for the keys is open: a key there belongs to the field or the
 *  popup, not the board behind it. A disclosure asks by carrying
 *  `data-hotkeys-inert` while it is open (VersionMenu does). */
function inert(target: EventTarget | null): boolean {
  const el = (target as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
  if (el) {
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return true;
    if (el.closest?.("dialog[open], [contenteditable='true']")) return true;
  }
  return document.querySelector("dialog[open], [data-hotkeys-inert]") !== null;
}

/** Page-level keys. Letters are matched case-insensitively; a key with
 *  Ctrl, Cmd or Alt held is left to the browser. Inert while an input,
 *  textarea, select, contenteditable or open dialog has focus, so the
 *  search field's own Escape is the field's to handle (clear it there in
 *  onKeyDown). A handled key has its default prevented, so "/" doesn't
 *  open the browser's quick find. The map may change every render.
 *
 *  Only movement repeats while a key is held. The rest are one-shot
 *  acts, and a held H would hide a run of coins as the focus moved on,
 *  a held S flip the star on and off, a held B stack placeholder buys. */
const REPEATS = new Set(["j", "k", "ArrowDown", "ArrowUp"]);

export function useHotkeys(map: HotkeyMap, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (inert(e.target)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.repeat && !REPEATS.has(key)) {
        // Still claimed, so a held "/" doesn't reach quick find either.
        if (ref.current[key]) e.preventDefault();
        return;
      }
      const fn = ref.current[key];
      if (!fn) return;
      e.preventDefault();
      fn(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
