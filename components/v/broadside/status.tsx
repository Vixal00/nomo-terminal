"use client";

import { CORE_HOTKEYS, Disclosure, ReconCountdown, SimToggle, SpotCells, Tip } from "@/components/trending";
import { LABELS } from "@/lib/labels";

/* The core keys first, in the shared wording, then Broadside's own. */
const KEYS: [string, string][] = [
  ["J / ↓", CORE_HOTKEYS.j],
  ["K / ↑", CORE_HOTKEYS.k],
  ["/", CORE_HOTKEYS["/"]],
  ["Esc", CORE_HOTKEYS.Escape],
  ["B", CORE_HOTKEYS.b],
  ["P", CORE_HOTKEYS.p],
  ["1 2 3 4", "Window 5m / 1h / 6h / 24h"],
  ["[ / ]", `${CORE_HOTKEYS["["]} / ${CORE_HOTKEYS["]"].toLowerCase()}`],
  ["H", CORE_HOTKEYS.h],
  ["S", CORE_HOTKEYS.s],
  ["F", "Fold or unfold the poster"],
];

function KeysTip() {
  return (
    <Tip
      side="top"
      className="bs-keys"
      tipClassName="bs-keystip"
      label={
        <span className="flex flex-col gap-1">
          {KEYS.map(([k, d]) => (
            <span key={k} className="flex gap-3">
              <span className="num w-[52px] shrink-0 whitespace-nowrap text-bone">{k}</span>
              <span>{d}</span>
            </span>
          ))}
          <span className="mt-1 block border-t border-line pt-1.5">Click selects a row. {LABELS.NO_PAGE}</span>
        </span>
      }
    >
      <span className="meta cursor-help underline decoration-dotted underline-offset-2">Keys</span>
    </Tip>
  );
}

/** The bottom strip. The disclosure is always on it, whatever the
 *  width; the rest drops away in priority order as the width shrinks,
 *  set in broadside.css, so nothing is ever cut off mid-word. */
export function StatusBar({ frozen, pending }: { frozen: boolean; pending: number }) {
  return (
    <footer className="bs-status" data-held={frozen ? "" : undefined}>
      <SimToggle />
      <Disclosure variant="line" className="bs-disc" />
      <span className="bs-st-keys">
        <KeysTip />
      </span>
      {/* After the fixed items rather than beside the SIM state, so that
          appearing when the pointer reaches the board it pushes nothing
          the reader was looking at. */}
      {frozen && (
        <span className="meta text-muted whitespace-nowrap" title={LABELS.HELD_TITLE}>
          {LABELS.HELD(pending)}
        </span>
      )}
      <ReconCountdown className="bs-st-recon" />
      <SpotCells className="bs-st-spot" />
    </footer>
  );
}
