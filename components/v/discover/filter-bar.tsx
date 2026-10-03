"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { BarsMark, CloseMark, EthereumMark, SolanaMark } from "@/components/marks";
import { Tip, amountText, useToast } from "@/components/trending";
import { cx } from "@/components/ui";
import { LABELS } from "@/lib/labels";
import { WINDOWS, quickBuy, type Window } from "@/lib/trending";
import * as fmt from "@/lib/format";
import { COPY } from "./copy";
import { BanIcon, BoltIcon, DollarIcon, DropIcon, FunnelIcon, KeywordIcon } from "./icons";

export const AMOUNT_KEYS = ["mcMin", "mcMax", "volMin", "liqMin"] as const;
export type AmountKey = (typeof AMOUNT_KEYS)[number];
export type AmountDraft = Record<AmountKey, string>;
export const EMPTY_AMOUNTS: AmountDraft = { mcMin: "", mcMax: "", volMin: "", liqMin: "" };

type QB = [amount: number, setAmount: (n: number) => void, presets: readonly number[], unit: "SOL" | "ETH"];

/** A range control in the reference's three states: collapsed to its
 *  name, open and empty ("Min" / "Max"), open and holding values. The
 *  inputs edit the draft; nothing reaches the board until Filter is
 *  pressed (or Enter), because a half-typed "2" bound live would briefly
 *  be a real $2 floor. The foundation's filter has a floor only for
 *  volume and liquidity, so those two open to one field. */
function RangeChip({
  label,
  icon,
  keys,
  draft,
  applied,
  errors,
  setField,
  onApply,
  hint,
}: {
  label: string;
  icon: ReactNode;
  keys: readonly AmountKey[];
  draft: AmountDraft;
  applied: AmountDraft;
  errors: Partial<Record<AmountKey, string>>;
  setField: (k: AmountKey, v: string) => void;
  onApply: () => void;
  hint: string;
}) {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const has = keys.some((k) => draft[k].trim() !== "" || applied[k].trim() !== "");
  const expanded = open || has;
  const err = keys.map((k) => errors[k]).find(Boolean);

  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  return (
    <div className={cx("dc-fchip", expanded && "is-open", err && "is-err")} title={err}>
      <button
        type="button"
        className="dc-fchip-head"
        aria-expanded={expanded}
        title={hint}
        onClick={() => {
          if (!expanded) setOpen(true);
          else if (!has) setOpen(false);
          else first.current?.focus();
        }}
      >
        {icon}
        <span>{label}</span>
      </button>
      {expanded &&
        keys.map((k, i) => (
          <input
            key={k}
            ref={i === 0 ? first : undefined}
            className="dc-fin num"
            value={draft[k]}
            inputMode="decimal"
            spellCheck={false}
            autoComplete="off"
            placeholder={k.endsWith("Min") ? "Min" : "Max"}
            aria-label={`${label} ${k.endsWith("Min") ? "minimum" : "maximum"}, in dollars (20k, 1.5m)`}
            aria-invalid={errors[k] ? true : undefined}
            title={errors[k]}
            onChange={(e) => setField(k, e.target.value)}
            onBlur={(e) => {
              const inside = e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null);
              if (!inside && !keys.some((x) => draft[x].trim() || applied[x].trim())) setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setField(k, applied[k]);
                e.currentTarget.blur();
              }
            }}
          />
        ))}
    </div>
  );
}

/** Keeps a popover in the viewport, under its trigger. Fixed, not
 *  absolute, so it also escapes the filter card's sideways scroller on a
 *  phone, which would otherwise clip everything under the text field.
 *  Measured when it opens and on resize or scroll (not per frame). */
function usePlaced(open: boolean, anchor: RefObject<HTMLElement | null>, pop: RefObject<HTMLElement | null>, max = 300) {
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current;
      const p = pop.current;
      if (!a || !p) return;
      const r = a.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const width = Math.min(max, vw - 32);
      p.style.width = `${width}px`;
      p.style.left = `${Math.max(16, Math.min(r.left, vw - 16 - width))}px`;
      p.style.top = `${Math.round(r.bottom + 6)}px`;
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, pop, max]);
}

/** The hidden list: the viewer's own, shared with the other versions
 *  under ansem.terminal.blacklist. A disclosure, not a dialog; it holds
 *  the board's keys while open (data-hotkeys-inert). Escape closes it and
 *  puts focus back on its button. */
function BlacklistChip({
  list,
  setList,
  open,
  setOpen,
}: {
  list: string[];
  setList: (l: string[]) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [hint, setHint] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  usePlaced(open, trigger, pop);

  useEffect(() => {
    if (!open) {
      setHint(false);
      return;
    }
    input.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const add = () => {
    const e = text.trim();
    if (!e) {
      // The key answers rather than sitting grey: it says what it needs.
      setHint(true);
      input.current?.focus();
      return;
    }
    if (!list.some((x) => x.toLowerCase() === e.toLowerCase())) setList([...list, e]);
    setText("");
    setHint(false);
  };

  return (
    <div ref={root} className="dc-bl" data-hotkeys-inert={open ? "" : undefined}>
      <button
        ref={trigger}
        type="button"
        className={cx("dc-fchip dc-fchip-head dc-fchip-solo", list.length > 0 && "is-set")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <BanIcon className="dc-fic" />
        <span>Blacklist</span>
        {list.length > 0 && <span className="num dc-bl-n">{list.length}</span>}
      </button>
      <div ref={pop} id={id} hidden={!open} className="dc-pop dc-bl-pop">
        <p className="dc-pop-note">{COPY.BLACKLIST_NOTE}</p>
        {list.length === 0 ? (
          <p className="dc-pop-empty">{COPY.BLACKLIST_EMPTY}</p>
        ) : (
          <ul className="dc-bl-list">
            {list.map((e) => (
              <li key={e}>
                <span className="num">{e}</span>
                <button type="button" aria-label={`Show ${e} again`} title="Show again" onClick={() => setList(list.filter((x) => x !== e))}>
                  <CloseMark className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="dc-bl-add"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            ref={input}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) setHint(false);
            }}
            placeholder={COPY.BLACKLIST_PH}
            aria-label="Hide a ticker or keyword"
            aria-describedby={hint ? `${id}-hint` : undefined}
            spellCheck={false}
            autoComplete="off"
            className="num"
          />
          <button
            type="submit"
            aria-disabled={!text.trim() || undefined}
            title={text.trim() ? `Hide ${text.trim()}` : COPY.HIDE_EMPTY}
          >
            Hide
          </button>
        </form>
        {hint && (
          <p id={`${id}-hint`} className="dc-pop-hint" role="status">
            {COPY.HIDE_EMPTY}
          </p>
        )}
      </div>
    </div>
  );
}

/** Both networks' presets are rendered and the cascade shows one, so the
 *  first paint on network 2 is already in ether. The active size is
 *  bright and the rest dim, where the reference had P1 P2 P3. */
function QuickBuy({ qb1, qb2, qbRef }: { qb1: QB; qb2: QB; qbRef: RefObject<HTMLDivElement | null> }) {
  const group = (chain: 1 | 2, qb: QB) => {
    const [amount, setAmount, presets, unit] = qb;
    const { toUsd } = quickBuy(chain);
    return (
      <span className={cx(chain === 1 ? "only-chain1" : "only-chain2", "dc-qb-set")}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={amount === p}
            className={cx("dc-qb-p num", amount === p && "is-on")}
            title={`${amountText(p)} ${unit} ${LABELS.USD_EQ(fmt.usd(toUsd(p)))}`}
            onClick={() => setAmount(p)}
          >
            {amountText(p)}
          </button>
        ))}
        {chain === 1 ? <SolanaMark className="dc-qb-mark" /> : <EthereumMark className="dc-qb-mark" />}
      </span>
    );
  };
  return (
    <div ref={qbRef} role="group" aria-label="Quick-buy size" className="dc-qb">
      <BoltIcon className="dc-qb-bolt" />
      {group(1, qb1)}
      {group(2, qb2)}
      <span aria-hidden className="dc-qb-rule" />
      <Tip label={LABELS.QB_TITLE} focusable className="dc-qb-tag" align="end">
        <span className="meta">{LABELS.QB_TAG}</span>
      </Tip>
    </div>
  );
}

/** R4: the filter card. Left, the filters in the reference's order;
 *  right, the quick-buy size, the Filter key and the window. */
export function FilterBar({
  draft,
  applied,
  errors,
  setField,
  dirty,
  onApply,
  activeCount,
  onClear,
  search,
  setSearch,
  blacklist,
  setBlacklist,
  blOpen,
  setBlOpen,
  qb1,
  qb2,
  qbRef,
  w,
  setW,
}: {
  draft: AmountDraft;
  applied: AmountDraft;
  errors: Partial<Record<AmountKey, string>>;
  setField: (k: AmountKey, v: string) => void;
  dirty: boolean;
  onApply: () => void;
  activeCount: number;
  onClear: () => void;
  search: string;
  setSearch: (s: string) => void;
  blacklist: string[];
  setBlacklist: (l: string[]) => void;
  blOpen: boolean;
  setBlOpen: (o: boolean) => void;
  qb1: QB;
  qb2: QB;
  qbRef: RefObject<HTMLDivElement | null>;
  w: Window;
  setW: (w: Window) => void;
}) {
  const chip = { draft, applied, errors, setField, onApply };
  const toast = useToast();
  // With filters in force (the count beside the key, and Clear showing),
  // "type a limit first" would contradict the key's own badge.
  const noChanges = activeCount > 0 ? COPY.NO_CHANGES_ACTIVE : COPY.NO_CHANGES;
  return (
    <section aria-label="Filters" className="dc-card dc-filters">
      <div className="dc-filters-in">
        <div className="dc-fl">
          <span className="dc-fl-label">Filters</span>
          <RangeChip label="Market Cap" icon={<DollarIcon className="dc-fic" />} keys={["mcMin", "mcMax"]} hint="Market cap, minimum and maximum" {...chip} />
          <RangeChip label="Volume" icon={<BarsMark className="dc-fic" />} keys={["volMin"]} hint={`Minimum volume in the last ${w}`} {...chip} />
          <RangeChip label="Liquidity" icon={<DropIcon className="dc-fic" />} keys={["liqMin"]} hint="Minimum liquidity" {...chip} />
          <label className="dc-fchip is-open dc-fsearch">
            <span className="dc-fchip-head" aria-hidden>
              <KeywordIcon className="dc-fic" />
              <span>Search</span>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.preventDefault();
                if (search) setSearch("");
                else e.currentTarget.blur();
              }}
              placeholder={COPY.SEARCH_CHIP_PH}
              aria-label="Search by name, ticker or contract address. The same search as the one at the top."
              spellCheck={false}
              autoComplete="off"
              className="dc-fin dc-fin-wide"
            />
          </label>
          <BlacklistChip list={blacklist} setList={setBlacklist} open={blOpen} setOpen={setBlOpen} />
          {activeCount > 0 && (
            <button type="button" className="dc-textbtn dc-clear" onClick={onClear}>
              {COPY.CLEAR}
            </button>
          )}
        </div>

        <div className="dc-fr">
          <QuickBuy qb1={qb1} qb2={qb2} qbRef={qbRef} />
          {/* Always "Filter", as the reference labels it; the count is the
              limits in force. With nothing drafted it is dimmed but still
              answers: its title, its label and a press all say why. */}
          <button
            type="button"
            className="dc-apply"
            aria-disabled={!dirty || undefined}
            onClick={() => (dirty ? onApply() : toast({ tone: "info", title: noChanges }))}
            title={dirty ? "Apply the filters" : noChanges}
            aria-label={`${COPY.FILTER}${activeCount > 0 ? `, ${activeCount} active` : ""}. ${dirty ? "Apply the filters" : noChanges}`}
          >
            <FunnelIcon className="dc-apply-ic" />
            <span>{COPY.FILTER}</span>
            {activeCount > 0 && (
              <span className="num dc-apply-n" aria-hidden>
                {activeCount}
              </span>
            )}
          </button>
          <div role="group" aria-label="Window" className="dc-win">
            {WINDOWS.map((x) => (
              <button key={x} type="button" aria-pressed={w === x} className={cx("dc-win-b num", w === x && "is-on")} onClick={() => setW(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
