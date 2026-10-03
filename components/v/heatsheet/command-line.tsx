"use client";

import { useSyncExternalStore, type RefObject } from "react";
import { cx } from "@/components/ui";
import { CloseMark } from "@/components/marks";
import { amountText } from "@/components/trending";
import { quickBuy } from "@/lib/trending";
import { LABELS } from "@/lib/labels";
import * as fmt from "@/lib/format";
import type { QueryError } from "./parse-query";

/* The command line: filters are typed, applied on Enter, and echoed
   under the column each one limits.

   The line is a draft. Nothing applies while typing: bound as it is
   typed, a half-typed "mc>=2" is briefly a real $2 floor and the board
   empties and refills under the reader. */

export type ColumnSet = "size" | "perf" | "risk";
export const COLUMN_SETS: readonly ColumnSet[] = ["size", "perf", "risk"];

type QB = { amount: number; setAmount: (n: number) => void; presets: readonly number[] };

const PHONE = "(max-width: 899px)";
const onPhoneChange = (fn: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
};

/** The placeholder says it is an example before it shows one: a bare
 *  "mc>=20k fortress" after the prompt reads as a filter in force. The
 *  desktop wording also names the / key, which a phone doesn't have.
 *  Read after hydration (the server snapshot is the desktop wording), so
 *  the markup the server sent still matches the first client render. */
function usePlaceholder() {
  const phone = useSyncExternalStore(onPhoneChange, () => window.matchMedia(PHONE).matches, () => false);
  return phone ? "Filter, e.g. mc>=20k fortress" : "Filter, e.g. mc>=20k liq>=5k fortress -cat   / to type · Enter to apply";
}

export function CommandLine({
  inputRef,
  draft,
  setDraft,
  committedText,
  onCommit,
  errors,
  count,
  qb1,
  qb2,
  set,
  setSet,
  onKeys,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  draft: string;
  setDraft: (s: string) => void;
  committedText: string;
  onCommit: (text: string) => void;
  errors: QueryError[];
  count: { k: number; n: number; N: number; h: number };
  qb1: QB;
  qb2: QB;
  set: ColumnSet;
  setSet: (s: ColumnSet) => void;
  onKeys: () => void;
}) {
  const placeholder = usePlaceholder();
  const presets = (q: QB, unit: string) =>
    q.presets.map((p) => (
      <button
        key={p}
        type="button"
        aria-pressed={q.amount === p}
        className="qb num"
        onClick={() => q.setAmount(p)}
        aria-label={`Quick-buy size ${amountText(p)} ${unit}`}
      >
        {amountText(p)}
      </button>
    ));

  return (
    <div className="cl">
      <span aria-hidden className="cl-prompt">
        &gt;
      </span>
      <input
        ref={inputRef}
        type="text"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-label="Filter the board"
        className="cl-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(draft);
          } else if (e.key === "Escape") {
            // Hotkeys are inert inside a field, so the field's own Escape
            // is handled here: first put the line back, then leave it.
            e.preventDefault();
            if (draft !== committedText) setDraft(committedText);
            else e.currentTarget.blur();
          }
        }}
      />
      {draft && (
        <button type="button" className="cl-clear text-dim hover:text-bone" aria-label="Clear the line" onClick={() => onCommit("")}>
          <CloseMark className="h-[10px] w-[10px]" />
        </button>
      )}
      {errors.length > 0 && (
        <span className="meta cl-err text-rim" role="status" title={errors.map((e) => e.message).join(" · ")}>
          {errors[0].message}
        </span>
      )}
      <span className="meta cl-count hs-d">
        <span className="cl-full">
          {count.k > 0 && `${count.k} ${count.k === 1 ? "filter" : "filters"} · `}
          <span className="num">{count.n}</span> of <span className="num">{count.N}</span>
          {count.h > 0 && ` · ${count.h} hidden`}
        </span>
        <span className="cl-short">
          <span className="num">
            {count.n}/{count.N}
          </span>
        </span>
      </span>
      <button type="button" className="meta cl-keys hs-m" onClick={onKeys} aria-label="Keys and grammar">
        ?
      </button>
      <span aria-hidden className="hs-break" />
      <div role="group" aria-label="Columns" className="cl-set hs-m">
        {COLUMN_SETS.map((s) => (
          <button key={s} type="button" aria-pressed={set === s} className="meta" onClick={() => setSet(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="cl-qb" role="group" aria-label="Quick-buy size">
        <span className="meta hs-d" title={LABELS.QB_TITLE}>
          QB
        </span>
        <span className="only-chain1 inline-flex items-center gap-1">{presets(qb1, "SOL")}</span>
        <span className="only-chain2 inline-flex items-center gap-1">{presets(qb2, "ETH")}</span>
        <span className="meta">
          <span className="only-chain1">{quickBuy(1).unit}</span>
          <span className="only-chain2">{quickBuy(2).unit}</span>
        </span>
        <span className="meta" title={LABELS.QB_TITLE}>
          {LABELS.QB_TAG}
        </span>
        <span className={cx("cl-usd hs-d")}>
          <span className="only-chain1">{LABELS.USD_EQ(fmt.usd(quickBuy(1).toUsd(qb1.amount)))}</span>
          <span className="only-chain2">{LABELS.USD_EQ(fmt.usd(quickBuy(2).toUsd(qb2.amount)))}</span>
        </span>
      </div>
    </div>
  );
}
