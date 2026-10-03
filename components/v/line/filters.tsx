"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { CheckMark, CloseMark } from "@/components/marks";
import { SpotCells, Tip, UnderlineTab, amountText } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { EMPTY_FILTER, commitDraft, draftOf, type FilterDraft, type TrendingFilter } from "@/lib/trending";
import type { Tier } from "@/lib/data";
import { LINE_COPY } from "./lifecycle";

/* The filters, and the controls that also live in the toolbar.

   Tier chips apply at once, wherever they are: they only narrow what
   is shown, and a half-set tier is still a whole answer. The two
   toggles each narrow one pane, so they live in that pane's title strip
   and not here. The three limits are amounts, so they are edited as a
   draft and applied on Apply: bound as you type, a half-typed "2" would
   be a real $2 floor for a moment and empty a pane. */

const TIERS: readonly Tier[] = ["Free", "Fortress", "Diamond"];

/** ALL · FREE · FORTRESS · DIAMOND. ALL is on when no tier is picked;
 *  picking the last missing tier collapses the set back to ALL, since
 *  all three is no filter at all. */
export function TierChips({ tiers, onChange, className }: { tiers: readonly Tier[]; onChange: (t: Tier[]) => void; className?: string }) {
  const toggle = (t: Tier) => {
    const next = tiers.includes(t) ? tiers.filter((x) => x !== t) : [...tiers, t];
    onChange(next.length === TIERS.length ? [] : next);
  };
  return (
    <div role="group" aria-label="Tier" className={cx("chips", className)}>
      <UnderlineTab on={tiers.length === 0} onClick={() => onChange([])} className="ut">
        All
      </UnderlineTab>
      {TIERS.map((t) => (
        <UnderlineTab key={t} on={tiers.includes(t)} onClick={() => toggle(t)} className="ut">
          {t}
        </UnderlineTab>
      ))}
    </div>
  );
}

/** A checkbox that reads as a key: a hairline box that takes a bone
 *  tick. No accent fill, so there is no black-ink case to get wrong on
 *  network 2. */
export function Toggle({ on, onChange, label, tip }: { on: boolean; onChange: (v: boolean) => void; label: string; tip: string }) {
  return (
    <Tip label={tip} focusable={false} className="togw">
      <button type="button" className="tog" aria-pressed={on} onClick={() => onChange(!on)}>
        <span className="box" aria-hidden>
          {on && <CheckMark className="h-[9px] w-[9px]" />}
        </span>
        <span className="meta">{label}</span>
      </button>
    </Tip>
  );
}

export type QbState = [amount: number, setAmount: (n: number) => void, presets: readonly number[], unit: "SOL" | "ETH"];

/** Quick-buy sizes for one network. Rendered for both and shown by the
 *  cascade (.only-chain1 / .only-chain2), so network 2's first paint is
 *  already in ETH. */
export function QbPresets({ qb, className }: { qb: QbState; className?: string }) {
  const [amount, setAmount, presets, unit] = qb;
  return (
    <div role="group" aria-label={`Quick buy size, ${unit}`} className={cx("qb", className)}>
      <span className="meta">QB</span>
      {presets.map((p) => (
        <UnderlineTab key={p} on={amount === p} onClick={() => setAmount(p)} className="ut num">
          {amountText(p)}
        </UnderlineTab>
      ))}
      <span className="meta">{unit}</span>
      <span className="meta qbt" title={LABELS.QB_TITLE}>
        {LABELS.QB_TAG}
      </span>
    </div>
  );
}

type Limits = Pick<TrendingFilter, "mcMin" | "mcMax" | "liqMin">;

export function FiltersDialog({
  open,
  onClose,
  limits,
  onLimits,
  tiers,
  onTiers,
  hidden,
  onRestore,
  onRestoreAll,
  qb1,
  qb2,
}: {
  open: null | "filters" | "hidden";
  onClose: () => void;
  limits: Limits;
  onLimits: (l: Limits) => void;
  tiers: readonly Tier[];
  onTiers: (t: Tier[]) => void;
  hidden: readonly string[];
  onRestore: (entry: string) => void;
  onRestoreAll: () => void;
  qb1: QbState;
  qb2: QbState;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  /* A click is targeted at the common ancestor of its press and its
     release, so a text selection dragged from a field out onto the
     backdrop lands on the dialog too. Only a press that began on the
     backdrop may close it, or the typed draft is lost. */
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (open === "hidden") document.getElementById("line-hidden")?.focus();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="lf face-sans"
      aria-label="Filters"
      onClose={onClose}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // The dialog box is filled edge to edge by its content, so a
        // click that lands on the dialog itself landed on the backdrop.
        const fromBackdrop = pressedBackdrop.current;
        pressedBackdrop.current = false;
        if (fromBackdrop && e.target === e.currentTarget) ref.current?.close();
      }}
    >
      {open && (
        <Body
          limits={limits}
          onLimits={onLimits}
          onDone={() => ref.current?.close()}
          tiers={tiers}
          onTiers={onTiers}
          hidden={hidden}
          onRestore={onRestore}
          onRestoreAll={onRestoreAll}
          qb1={qb1}
          qb2={qb2}
        />
      )}
    </dialog>
  );
}

const FIELDS = [
  { k: "mcMin", label: "Mcap ≥" },
  { k: "mcMax", label: "Mcap ≤" },
  { k: "liqMin", label: "Liq ≥" },
] as const;

function Body({
  limits,
  onLimits,
  onDone,
  tiers,
  onTiers,
  hidden,
  onRestore,
  onRestoreAll,
  qb1,
  qb2,
}: {
  limits: Limits;
  onLimits: (l: Limits) => void;
  onDone: () => void;
  tiers: readonly Tier[];
  onTiers: (t: Tier[]) => void;
  hidden: readonly string[];
  onRestore: (entry: string) => void;
  onRestoreAll: () => void;
  qb1: QbState;
  qb2: QbState;
}) {
  // The draft is taken once, when the dialog opens: this body mounts on
  // open and unmounts on close.
  const [draft, setDraft] = useState<FilterDraft>(() => draftOf(limits));
  const [errors, setErrors] = useState<Partial<Record<keyof FilterDraft, string>>>({});

  const apply = () => {
    const { filter, errors: errs } = commitDraft(
      { ...draftOf(EMPTY_FILTER), mcMin: draft.mcMin, mcMax: draft.mcMax, liqMin: draft.liqMin },
      limits,
    );
    // What committed is safe either way: a field that didn't parse kept
    // its last value, so it is applied now and the error says which.
    onLimits({ mcMin: filter.mcMin ?? null, mcMax: filter.mcMax ?? null, liqMin: filter.liqMin ?? null });
    setErrors(errs);
    if (Object.keys(errs).length === 0) onDone();
  };

  return (
    <div className="lfb">
      <div className="lfh">
        <span className="meta lft">Filters</span>
        <button type="button" className="icn" aria-label="Close filters" onClick={onDone}>
          <CloseMark className="h-3.5 w-3.5" />
        </button>
      </div>

      <section className="lfs only-lt1280" aria-label="Tier">
        <TierChips tiers={tiers} onChange={onTiers} />
      </section>

      <form
        className="lfs"
        aria-label="Limits"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <div className="lff">
          {FIELDS.map((f) => (
            <label key={f.k} className="fld">
              <span className="meta">{f.label}</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 20k"
                value={draft[f.k]}
                aria-invalid={errors[f.k] ? true : undefined}
                onChange={(e) => setDraft((d) => ({ ...d, [f.k]: e.target.value }))}
              />
              {errors[f.k] && <span className="err">{errors[f.k]}</span>}
            </label>
          ))}
        </div>
        <div className="lfa">
          <button type="submit" className="meta kbtn on">
            Apply
          </button>
          <button
            type="button"
            className="meta kbtn"
            onClick={() => setDraft((d) => ({ ...d, mcMin: "", mcMax: "", liqMin: "" }))}
          >
            Clear
          </button>
          <button type="button" className="meta kbtn" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>

      <section className="lfs" id="line-hidden" tabIndex={-1} aria-label="Hidden coins">
        <div className="lfsh">
          <span className="meta">Hidden</span>
          {hidden.length > 0 && (
            <button type="button" className="meta lnk" onClick={onRestoreAll}>
              Restore all
            </button>
          )}
        </div>
        {hidden.length === 0 ? (
          <p className="note">{LINE_COPY.HIDDEN_EMPTY}</p>
        ) : (
          <ul className="hid">
            {hidden.map((h) => (
              <li key={h}>
                <span className="num">{h}</span>
                <button type="button" className="meta lnk" onClick={() => onRestore(h)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lfs only-lt1024" aria-label="Quick buy">
        <QbPresets qb={qb1} className="only-chain1 flex" />
        <QbPresets qb={qb2} className="only-chain2 flex" />
        <SpotCells className="spot" />
      </section>
    </div>
  );
}
