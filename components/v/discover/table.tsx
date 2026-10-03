"use client";

import type { RefObject } from "react";
import { AuditDefTip, Tip } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import type { Window } from "@/lib/trending";
import { Row, type SelectHow } from "./row";

export type Empty = { text: string; sub?: string; action?: { label: string; run: () => void } };

/** The reference's table card: a 58px head, then pair rows on a 112px
 *  pitch. The head sticks to the top of the window once the chrome above
 *  has scrolled away. */
export function Table({
  cardRef,
  tickers,
  w,
  selected,
  stars,
  art,
  amt1,
  amt2,
  empty,
  onSelect,
  onBuy,
  onStar,
  onCopy,
  onHover,
  onFocusIn,
  frozen,
  pending,
}: {
  cardRef: RefObject<HTMLElement | null>;
  tickers: string[];
  w: Window;
  selected: string | null;
  stars: ReadonlySet<string>;
  art: Record<string, string>;
  amt1: string;
  amt2: string;
  empty: Empty | null;
  onSelect: (t: string, how: SelectHow) => void;
  onBuy: (t: string) => void;
  onStar: (t: string) => void;
  onCopy: (t: string) => void;
  onHover: (on: boolean) => void;
  onFocusIn: (on: boolean) => void;
  frozen: boolean;
  pending: number;
}) {
  const activeIdx = selected ? Math.max(0, tickers.indexOf(selected)) : 0;
  return (
    <section
      ref={cardRef}
      id="dc-board"
      aria-label="Pairs"
      className="dc-card dc-table"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onHover(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onHover(false);
      }}
      // Keyboard focus holds the order; a click's focus doesn't on its own.
      // Once the pointer leaves, nothing can land on a row that moved, and a
      // board held until the next click elsewhere would say "Order held"
      // for no reason the reader could see.
      onFocus={(e) => onFocusIn((e.target as HTMLElement).matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onFocusIn(false);
      }}
    >
      <div role="grid" aria-rowcount={tickers.length + 1} className="dc-gridroot">
        <div role="row" className="dc-head dc-grid">
          <div role="columnheader" className="dc-h dc-c-pair">
            Pair info
            {/* In the sticky head, so it is in view wherever the reader
                is on the board: the order only holds while the pointer or
                keyboard focus is on this card, and the head sticks for as
                long as any of the card is on screen. */}
            {frozen && (
              <span className="dc-held" title={LABELS.HELD_TITLE}>
                {LABELS.HELD(pending)}
              </span>
            )}
          </div>
          <div role="columnheader" className="dc-h dc-c-chart">
            <Tip label={LABELS.SPARK_TITLE} className="dc-h-charttip">
              <span className="sr-only">Chart, {w}</span>
              <span aria-hidden className="dc-h-blank" />
            </Tip>
          </div>
          {/* Set bare, as the reference sets them. Every figure in these
              four follows the window switch in the filter card, and the
              rank rule over this card names it. */}
          <div role="columnheader" className="dc-h dc-c-mc" title={`Market cap in US dollars, and the change over the last ${w}`}>
            Market Cap
          </div>
          <div role="columnheader" className="dc-h dc-c-liq" title="Liquidity in US dollars">
            Liquidity
          </div>
          <div role="columnheader" className="dc-h dc-c-vol" title={`Volume in US dollars, last ${w}`}>
            Volume
          </div>
          <div role="columnheader" className="dc-h dc-c-txns" title={`Trades in the last ${w}: buys / sells`}>
            TXNS
          </div>
          <div role="columnheader" className="dc-h dc-c-info">
            Token Info
            <AuditDefTip className="dc-h-fixture" align="center" />
          </div>
          <div role="columnheader" className="dc-h dc-c-act">
            Action
          </div>
        </div>

        <div role="rowgroup" className="dc-body no-anchor">
          {tickers.map((t, i) => (
            <Row
              key={t}
              ticker={t}
              index={i}
              w={w}
              selected={selected === t}
              starred={stars.has(t)}
              active={i === activeIdx}
              src={art[t]}
              amt1={amt1}
              amt2={amt2}
              onSelect={onSelect}
              onBuy={onBuy}
              onStar={onStar}
              onCopy={onCopy}
            />
          ))}
          {empty && (
            <div role="row" className="dc-empty">
              <div role="gridcell" className="dc-empty-cell">
                <span className="dc-empty-text">{empty.text}</span>
                {empty.sub && <span className="dc-empty-sub">{empty.sub}</span>}
                {empty.action && (
                  <button type="button" className="dc-textbtn" onClick={empty.action.run}>
                    {empty.action.label}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
