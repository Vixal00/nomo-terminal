"use client";

import { useEffect, useId, useRef } from "react";
import { CORE_HOTKEYS } from "@/components/trending";
import { AUDIT_BANDS, BUY_SHARE_EDGES, HEAT_EDGES } from "@/lib/trending";
import { Z500 } from "@/lib/spec";
import { LABELS } from "@/lib/labels";
import { BoostMark } from "./row";

/* Keys, the command-line grammar and every band edge the sheet tints at.

   Mounted only while open, and modal: while it is up the board's keys
   are inert (useHotkeys stands down for an open <dialog>), and Escape is
   the dialog's own cancel, which closes it. */

/* In the foundation's order. Object.keys would put "1"–"4" first:
   integer-like keys always lead an object's key order. */
const CORE_ORDER: (keyof typeof CORE_HOTKEYS)[] = ["j", "k", "/", "Escape", "b", "p", "1", "2", "3", "4", "[", "]", "h", "s"];

const CORE_KEY_LABEL: Record<keyof typeof CORE_HOTKEYS, string> = {
  j: "J  ↓",
  k: "K  ↑",
  "/": "/",
  Escape: "Esc",
  b: "B",
  p: "P",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "[": "[",
  "]": "]",
  h: "H",
  s: "S",
};

const EXTRAS: [string, string][] = [
  ["G  ⇧G", "First row / last row"],
  ["Q", "Next quick-buy size"],
  ["X", "Copy the selected mint"],
  ["?", "This list"],
];

const GRAMMAR: [string, string][] = [
  ["mc>=20k  mc<=1m", "Market cap floor and ceiling, USD (k, m, b)"],
  ["vol>=5k", "Volume in the selected window"],
  ["liq>=10k", "Pool liquidity"],
  ["t10<=30  dev<=5", "Top-10 and creator share ceilings, %"],
  ["free  fortress  diamond", "Tiers; several allowed"],
  ["oncurve  migrated", "Stage; the last one wins"],
  ["-word", "Hide: $TICKER exactly, or 3+ letters inside a ticker or name. A word that hides no coin is refused. Kept in this browser"],
  ["+word", "Show a hidden entry again"],
  ["anything else", "Search ticker or name, or a mint (6+ characters)"],
];

export function KeysDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Mounted only on open, never on the server, so the media query can be
  // read while rendering. Under reduced motion the simulation commits
  // every 5 seconds instead of about once a second (lib/trending-live).
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const bands: [string, string][] = [
    ["Change", `Tints step at ±${HEAT_EDGES.join(" / ")}%, teal up, red down`],
    ["L", `${LABELS.SINCE_LAUNCH}: ${LABELS.SINCE_LAUNCH_TITLE}`],
    ["·", `Repeats the ${LABELS.SINCE_LAUNCH} figure to its left: a window longer than the coin's life`],
    ["B/S", `Teal over ${BUY_SHARE_EDGES.buy}, red under ${BUY_SHARE_EDGES.sell}`],
    ["T10", `Warn ${AUDIT_BANDS.top10.warn}, bad ${AUDIT_BANDS.top10.bad}`],
    ["DEV", `Warn ${AUDIT_BANDS.dev.warn}, bad ${AUDIT_BANDS.dev.bad}`],
    ["SNP", `Warn ${AUDIT_BANDS.snipers.warn}, bad ${AUDIT_BANDS.snipers.bad}`],
    ["BND", `Warn ${AUDIT_BANDS.bundlers.warn}, bad ${AUDIT_BANDS.bundlers.bad}`],
    ["Z500", `Bone at ${Z500.bar} and over, rim from ${Z500.exit}, red under ${Z500.exit}`],
  ];

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby={titleId} className="hs-dialog m-auto">
      <div className="hs-dialog-head">
        <h2 id={titleId} className="meta text-bone">
          Keys and grammar
        </h2>
        <button type="button" className="meta hover:text-bone" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>

      <section aria-label="Keys">
        <dl className="kd">
          {CORE_ORDER.map((k) => (
            <div key={k}>
              <dt className="num">{CORE_KEY_LABEL[k]}</dt>
              <dd>{CORE_HOTKEYS[k]}</dd>
            </div>
          ))}
          {EXTRAS.map(([k, v]) => (
            <div key={k}>
              <dt className="num">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Command line">
        <h3 className="meta">Command line</h3>
        <dl className="kd kd-wide">
          {GRAMMAR.map(([k, v]) => (
            <div key={k}>
              <dt className="num">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="kd-note">
          Limits include the value: write &gt;= or &lt;=. Enter applies the line; Esc puts it back. Press an echo under a column to
          remove that filter.
        </p>
      </section>

      <section aria-label="Bands">
        <h3 className="meta">Bands</h3>
        <dl className="kd kd-wide">
          {bands.map(([k, v]) => (
            <div key={k}>
              <dt className="num">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          {/* A title never shows on a touch screen, so the one place a
              phone can learn what the bolt on a row means is here. */}
          <div>
            <dt className="num">
              <BoostMark />
            </dt>
            <dd>Boosted: {LABELS.BOOST_TITLE}</dd>
          </div>
        </dl>
        <p className="kd-note">Nothing on these fixtures reaches the bad band.</p>
        <p className="kd-note">
          Figures commit {reduced ? "about every 5 seconds (reduced motion is on)" : "about once a second"}; a tint changes when its
          figure crosses an edge.
        </p>
      </section>
    </dialog>
  );
}
