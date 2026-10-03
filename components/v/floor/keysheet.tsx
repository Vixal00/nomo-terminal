"use client";

import { useEffect, useRef, type RefObject } from "react";

/* The keys, core first. The core set means the same on every version
   (components/trending/hotkeys.ts); on Floor the "focused row" those
   keys act on is the pinned coin, because keyboard movement pins, so
   the coin a key acts on is always the one in the inspector. */
const CORE: readonly (readonly [string, string])[] = [
  ["J  ↓", "Pin the next coin"],
  ["K  ↑", "Pin the previous coin"],
  ["/", "Find on map"],
  ["Esc", "Clear Find, then unpin"],
  ["B", "Buy the pinned coin (placeholder: sends nothing)"],
  ["P", "Pause or resume the simulation"],
  ["1 2 3 4", "Window 5m / 1h / 6h / 24h"],
  ["[  ]", "Previous / next tab"],
  ["H", "Hide the pinned coin in this browser"],
  ["S", "Star or unstar the pinned coin"],
];

const FLOOR: readonly (readonly [string, string])[] = [
  ["A G C", "Show all / migrated / on curve"],
  ["F", "Filters"],
  ["Home", "Pin rank 1"],
  ["Enter", "Pin the focused tile or row; in Find, the first match"],
  ["?", "These keys"],
];

export function KeySheet({ onClose, anchorRef }: { onClose: () => void; anchorRef: RefObject<HTMLElement | null> }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.focus();
    const anchor = anchorRef.current;
    // Board keys are inert while this is open (data-hotkeys-inert), so
    // its own Escape and "?" are handled here, on document, ahead of
    // useHotkeys' window listener.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "?") return;
      e.preventDefault();
      onClose();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (root.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      anchor?.focus({ preventScroll: true });
    };
  }, [anchorRef, onClose]);

  const rows = (list: typeof CORE) =>
    list.map(([k, d]) => (
      <div key={k} className="fl-key">
        <kbd className="num">{k}</kbd>
        <span>{d}</span>
      </div>
    ));

  return (
    <div ref={root} role="dialog" aria-label="Keyboard keys" tabIndex={-1} data-hotkeys-inert="" className="fl-pop fl-keys">
      <p className="meta text-muted">EVERY VERSION</p>
      <div className="fl-keylist">{rows(CORE)}</div>
      <p className="meta mt-3 text-muted">FLOOR</p>
      <div className="fl-keylist">{rows(FLOOR)}</div>
    </div>
  );
}
