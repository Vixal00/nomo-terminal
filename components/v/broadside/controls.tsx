"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/components/ui";
import { UnderlineTab, WindowSwitch, amountText, useQuickBuy } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { activeFilterCount, quickBuy, type FilterDraft, type TrendingFilter, type Window } from "@/lib/trending";
import * as fmt from "@/lib/format";
import { BS_TABS, TAB_LABEL, type BsTab } from "./copy";
import { FiltersPopover } from "./filters";

export type QuickBuyState = ReturnType<typeof useQuickBuy>;

/** The three preset sizes. No Max and no typed amount: the page knows
 *  no balance, and a size is all a placeholder buy can use. */
export function QuickBuySizes({ qb }: { qb: QuickBuyState }) {
  const [amount, setAmount, presets] = qb;
  return (
    <>
      {presets.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={amount === p}
          onClick={() => setAmount(p)}
          className="bs-qbtn num"
        >
          {amountText(p)}
        </button>
      ))}
    </>
  );
}

/** Rendered once per network and shown by the cascade, so the first
 *  paint on network 2 already reads ETH rather than flashing SOL. */
function QuickBuy({ qb, chain }: { qb: QuickBuyState; chain: 1 | 2 }) {
  const [amount, , , unit] = qb;
  return (
    <div
      role="group"
      aria-label="Quick buy size"
      className={cx(chain === 1 ? "only-chain1" : "only-chain2", "flex items-center gap-1")}
    >
      <QuickBuySizes qb={qb} />
      <span className="meta ml-1">{unit}</span>
      <span className="meta ml-3" title={LABELS.QB_TITLE}>
        {LABELS.QB_TAG}
      </span>
      <span className="meta bs-usd ml-3">{LABELS.USD_EQ(fmt.usd(quickBuy(chain).toUsd(amount)))}</span>
    </div>
  );
}

/** The applied filters, as they were typed, for the trigger's title. */
function echo(d: FilterDraft | null, w: Window): string {
  if (!d) return "No filters";
  const parts: string[] = [];
  if (d.mcMin.trim()) parts.push(`Market cap ≥ ${d.mcMin.trim()}`);
  if (d.mcMax.trim()) parts.push(`Market cap ≤ ${d.mcMax.trim()}`);
  if (d.volMin.trim()) parts.push(`Volume ${w} ≥ ${d.volMin.trim()}`);
  if (d.tiers.length) parts.push(`Tier ${d.tiers.join(", ")}`);
  if (d.stage !== "all") parts.push(`Stage ${d.stage === "curve" ? "On curve" : "Migrated"}`);
  return parts.length ? parts.join(" · ") : "No filters";
}

const Divider = ({ className }: { className?: string }) => <span aria-hidden className={cx("bs-div", className)} />;

export function Controls({
  tab,
  onTab,
  w,
  setW,
  starCount,
  limits,
  applied,
  onApply,
  blacklist,
  onResetHidden,
  qb1,
  qb2,
}: {
  tab: BsTab;
  onTab: (t: BsTab) => void;
  w: Window;
  setW: (w: Window) => void;
  starCount: number | null;
  limits: TrendingFilter;
  applied: FilterDraft | null;
  onApply: (draft: FilterDraft) => Partial<Record<keyof FilterDraft, string>>;
  blacklist: string[];
  onResetHidden: () => void;
  qb1: QuickBuyState;
  qb2: QuickBuyState;
}) {
  const list = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Below 1024 the controls stick under the header only once the page is
  // scrolled to the list. Opened above that, the popover would run off
  // the bottom, and the touch that scrolled to it would count as a tap
  // outside and close it; so opening it first brings the list up.
  const toggle = () => {
    const el = root.current;
    if (!open && el && !matchMedia("(min-width: 1024px)").matches) {
      const stick = parseFloat(getComputedStyle(el).top) || 0;
      const y = el.getBoundingClientRect().top + window.scrollY - stick;
      if (window.scrollY < y) window.scrollTo({ top: y, behavior: "instant" });
    }
    setOpen(!open);
  };
  const n = activeFilterCount({
    mcMin: limits.mcMin,
    mcMax: limits.mcMax,
    volMin: limits.volMin,
    liqMin: limits.liqMin,
    tiers: limits.tiers,
    stage: limits.stage,
  });

  // A standard tablist: the arrows move between tabs and take the focus
  // with them, since only the selected tab is in the tab order.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = (BS_TABS.indexOf(tab) + step + BS_TABS.length) % BS_TABS.length;
    onTab(BS_TABS[i]);
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[i]?.focus());
  };

  return (
    <div ref={root} className="bs-controls">
      <div ref={list} role="tablist" aria-label="Board" className="bs-tabs" onKeyDown={onKeyDown}>
        {BS_TABS.map((t) => (
          <UnderlineTab key={t} role="tab" controls="bs-board" on={tab === t} onClick={() => onTab(t)}>
            {TAB_LABEL[t]}
            {t === "starred" && starCount !== null && <span className="num">{starCount}</span>}
          </UnderlineTab>
        ))}
      </div>
      <Divider className="bs-div-lg" />
      <div className="bs-r2">
        <WindowSwitch value={w} onChange={setW} className="bs-win" />
        <Divider />
        <div className="bs-filters">
          <button
            ref={trigger}
            type="button"
            className="meta bs-textbtn"
            aria-expanded={open}
            aria-haspopup="dialog"
            title={echo(applied, w)}
            onClick={toggle}
          >
            Filters · <span className="num">{n}</span>
          </button>
          {open && (
            <FiltersPopover
              w={w}
              limits={limits}
              applied={applied}
              onApply={onApply}
              onClose={(refocus) => {
                setOpen(false);
                // Escape and Apply close the popover from inside it, and
                // the focus it held would drop to the page. A click
                // outside has already put the focus where it landed.
                if (refocus) trigger.current?.focus();
              }}
            />
          )}
        </div>
        {blacklist.length > 0 && (
          <>
            <Divider />
            <span className="bs-hidden" title={blacklist.join(", ")}>
              <span className="meta">
                Hidden <span className="num">{blacklist.length}</span>
              </span>
              {/* A cross on a phone, where the words don't fit beside the
                  windows and Filters; the label says the same either way. */}
              <button
                type="button"
                className="meta bs-textbtn"
                aria-label="Reset hidden coins"
                title="Show every hidden coin again"
                onClick={onResetHidden}
              >
                <span className="bs-reset-long">Reset</span>
                <span aria-hidden className="bs-reset-short">
                  ×
                </span>
              </button>
            </span>
          </>
        )}
      </div>
      <div className="bs-qbwrap">
        <QuickBuy qb={qb1} chain={1} />
        <QuickBuy qb={qb2} chain={2} />
      </div>
    </div>
  );
}
