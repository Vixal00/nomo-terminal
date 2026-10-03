"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { cx } from "@/components/ui";
import type { Tier } from "@/lib/data";
import { commitDraft, draftOf, type FilterDraft, type TrendingFilter } from "@/lib/trending";

const TIERS: readonly Tier[] = ["Free", "Fortress", "Diamond"];

export type FilterErrors = Partial<Record<keyof FilterDraft, string>>;

/* Draft and Apply. Every limit here publishes to the board, and bound
   to the board as it is typed, a half-typed "2" in a minimum is briefly
   a real $2 floor that empties the map and re-lays it out. So the
   fields edit a copy and nothing moves until Apply.

   Mounted only while open, so each opening starts from the committed
   filter and a cancelled draft leaves nothing behind. Stage lives in
   the Show control and search in Find; the draft carries the current
   stage through so Apply doesn't reset it. */
export function FilterPopover({
  filter,
  anchorLeft,
  anchorRef,
  onApply,
  onClose,
}: {
  filter: TrendingFilter;
  /** Left edge in px within the control strip's wrapper, or null to
   *  span the strip (phones). */
  anchorLeft: number | null;
  anchorRef: RefObject<HTMLElement | null>;
  onApply: (next: TrendingFilter, draft: FilterDraft, errors: FilterErrors) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FilterDraft>(() => draftOf(filter));
  const [errors, setErrors] = useState<FilterErrors>({});
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    // The popover itself takes focus, not its first control: a focus
    // ring on the first tier toggle read as "Free" being selected, right
    // over the hint that none pressed means every tier. Tab from here
    // reaches the toggles in order.
    root.current?.focus();
    const anchor = anchorRef.current;
    // On document, so it runs before useHotkeys' window listener, and
    // marked handled: closing the popover must not also unpin.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
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

  const set = <K extends keyof FilterDraft>(k: K, v: FilterDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const apply = () => {
    const full: FilterDraft = { ...draft, search: "", stage: filter.stage ?? "all" };
    const { filter: next, errors: errs } = commitDraft(full, filter);
    onApply(next, full, errs);
    if (Object.keys(errs).length) setErrors(errs);
    else onClose();
  };

  const reset = () => {
    setDraft(draftOf({ stage: filter.stage, blacklist: filter.blacklist }));
    setErrors({});
  };

  const field = (k: "mcMin" | "mcMax" | "liqMin", label: string) => (
    <label className="fl-f">
      <span className="meta">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={draft[k]}
        placeholder="e.g. 50k"
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${id}-${k}` : undefined}
        onChange={(e) => set(k, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply();
        }}
        className="num fl-in"
      />
      {errors[k] && (
        <span id={`${id}-${k}`} className="fl-err">
          {errors[k]}
        </span>
      )}
    </label>
  );

  return (
    <div
      ref={root}
      role="dialog"
      aria-label="Filters"
      tabIndex={-1}
      data-hotkeys-inert=""
      className="fl-pop fl-filters"
      style={anchorLeft === null ? undefined : { left: anchorLeft }}
    >
      <div className="fl-pop-h">
        <span className="meta text-muted">FILTERS</span>
        <span className="meta">Nothing changes until Apply</span>
      </div>

      <div className="fl-f">
        <span className="meta">Tiers</span>
        <div className="fl-tiers" role="group" aria-label="Tiers">
          {TIERS.map((t) => {
            const on = draft.tiers.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => set("tiers", on ? draft.tiers.filter((x) => x !== t) : [...draft.tiers, t])}
                className={cx("fl-tier", on && "is-on")}
              >
                {t}
              </button>
            );
          })}
        </div>
        <span className="fl-hint">None pressed means every tier.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {field("mcMin", "Market cap min")}
        {field("mcMax", "Market cap max")}
      </div>
      {field("liqMin", "Liquidity min")}

      <label className="fl-f">
        <span className="meta">Hidden in this browser</span>
        <textarea
          rows={2}
          value={draft.blacklist}
          spellCheck={false}
          onChange={(e) => set("blacklist", e.target.value)}
          className="num fl-in fl-ta"
        />
        <span className="fl-hint">Comma separated. $TICKER hides one ticker; a word of 3+ letters hides names containing it.</span>
      </label>

      <div className="fl-pop-f">
        <button type="button" onClick={reset} className="meta fl-btn-q">
          Reset
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onClose} className="meta fl-btn-q">
          Cancel
        </button>
        <button type="button" onClick={apply} className="meta fl-btn">
          Apply
        </button>
      </div>
    </div>
  );
}
