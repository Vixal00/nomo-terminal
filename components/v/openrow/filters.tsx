"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { cx } from "@/components/ui";
import type { Tier } from "@/lib/data";
import {
  commitDraft,
  draftOf,
  type FilterDraft,
  type Stage,
  type TrendingFilter,
  type Window,
} from "@/lib/trending";
import { POP_FIELDS, STAGE_LABEL, fieldLabel, type PopField } from "./local";

/* Filters. Two kinds, applied two ways.

   Tier, stage, search and the blacklist are choices: they apply the
   moment they are pressed. The min/max limits are amounts, and an
   amount bound live is briefly a real limit while half typed (a "2" on
   the way to "20k" is a $2 floor that empties nothing and then
   everything). So the limits are a draft: edited as typed strings,
   committed on Apply by the foundation's commitDraft, which also says
   which field didn't parse and keeps its last good value.

   On desktop the limits open in a popover under the button. On a phone
   everything behind the button (tier, stage, hidden coins and the
   limits) opens in a bottom sheet, because the controls row there only
   has room for the window and this button. */

export type Committed = Pick<TrendingFilter, PopField>;
export type Echo = Partial<Record<PopField, string>>;
type Errors = Partial<Record<keyof FilterDraft, string>>;

/* ----------------------------------------------------------- echo */

/** A committed limit, as the reader typed it, with its field's own
 *  operator: "Mcap ≥ 20k", never a re-formatted "$20,000". */
function echoText(k: PopField, amount: string, w: Window) {
  if (k === "top10Max" || k === "devMax") {
    return `${fieldLabel(k, w).replace(/ %$/, "")} ${amount.replace(/%$/, "")}%`;
  }
  return `${fieldLabel(k, w)} ${amount}`;
}

/** Everything that narrowed the list, for the rule line and the
 *  filtered-to-zero state. The volume label is built with the current
 *  window, because volMin reads the selected window's volume. */
export function filterEcho(
  echo: Echo,
  w: Window,
  extra: { search: string; tiers?: readonly Tier[]; stage: Stage; hidden: number },
): string[] {
  const out: string[] = [];
  if (extra.search.trim()) out.push(`"${extra.search.trim()}"`);
  if (extra.tiers?.length) out.push(extra.tiers.join(", "));
  if (extra.stage !== "all") out.push(STAGE_LABEL[extra.stage]);
  for (const k of POP_FIELDS) {
    const a = echo[k];
    if (a) out.push(echoText(k, a, w));
  }
  if (extra.hidden > 0) out.push(`${extra.hidden} hidden`);
  return out;
}

/** The echo after an Apply: a field that committed takes the amount as
 *  typed, a field that errored keeps what it echoed before (commitDraft
 *  kept its previous value), and a cleared field drops out. An inverted
 *  cap range keeps the previous pair, so Mcap ≥ keeps its old echo too. */
function nextEcho(prev: Echo, draft: FilterDraft, filter: TrendingFilter, errors: Errors): Echo {
  const out: Echo = {};
  const inverted = errors.mcMax === "Below the minimum";
  for (const k of POP_FIELDS) {
    if (errors[k] || (k === "mcMin" && inverted)) {
      if (prev[k]) out[k] = prev[k];
      continue;
    }
    const v = filter[k];
    if (v !== null && v !== undefined) out[k] = draft[k].trim();
  }
  return out;
}

function pickCommitted(f: TrendingFilter): Committed {
  const out: Committed = {};
  for (const k of POP_FIELDS) {
    const v = f[k];
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------ seg */

/** A hairline segmented control, in ChainSwitch's grammar: raised when
 *  pressed, no accent. The accent is kept for the four places that mean
 *  "this one" on this page. */
export function Seg<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx("or-seg", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)} className="meta">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const TIER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Free", label: "Free" },
  { value: "Fortress", label: "Fortress" },
  { value: "Diamond", label: "Diamond" },
] as const;

export const STAGE_OPTIONS = [
  { value: "all", label: STAGE_LABEL.all },
  { value: "curve", label: STAGE_LABEL.curve },
  { value: "migrated", label: STAGE_LABEL.migrated },
] as const;

/* ---------------------------------------------------------- popover */

/** Closes on a press outside and on Escape (wherever focus is, and
 *  handing it back to the button), and while open the caller marks the
 *  panel data-hotkeys-inert so the board's keys stand down: with a panel
 *  over the list, J and B would act on rows the reader can't see. The
 *  Escape is marked handled, so it doesn't also clear the search. */
function usePopover(
  open: boolean,
  close: () => void,
  root: React.RefObject<HTMLElement | null>,
  btn: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close();
      btn.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, root, btn]);
}

/* ---------------------------------------------------------- filters */

type FiltersProps = {
  /** The Filters button, lent by the page so a panel that closes can
   *  hand focus back to it, including the Hidden panel beside it when
   *  its last coin is restored and it goes away. */
  btnRef: RefObject<HTMLButtonElement | null>;
  wide: boolean;
  w: Window;
  committed: Committed;
  echo: Echo;
  count: number;
  onApply: (next: Committed, echo: Echo) => void;
  /* Phone only: the immediate-apply choices that share the sheet. */
  tier: Tier | "all";
  setTier: (t: Tier | "all") => void;
  stage: Stage;
  setStage: (s: Stage) => void;
  hidden: readonly string[];
  unhide: (e: string) => void;
  restoreAll: () => void;
};

export function FiltersControl(p: FiltersProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = p.btnRef;
  const id = useId();
  const close = useRef(() => setOpen(false)).current;
  usePopover(open && p.wide, close, root, btn);

  /* Every way out hands focus back to the button. Apply and Close
     unmount the panel under the focused control, and focus left there
     falls to the page body, where the next Tab starts from the top. */
  const done = () => {
    setOpen(false);
    btn.current?.focus();
  };

  return (
    <div ref={root} className="or-pop-anchor" data-hotkeys-inert={open && p.wide ? "" : undefined}>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cx("or-ctl meta", open && "is-on")}
      >
        Filters
        {p.count > 0 && <span className="num text-bone">{p.count}</span>}
      </button>
      {open &&
        (p.wide ? (
          <div
            id={id}
            role="dialog"
            aria-label="Filters"
            className="or-pop or-pop-filters"
          >
            <Limits {...p} onDone={done} />
          </div>
        ) : (
          <Sheet id={id} onClose={done}>
            {(closeSheet) => (
              <>
                <div className="or-sheet-head">
                  <span className="meta text-bone">Filters</span>
                  <button type="button" onClick={closeSheet} className="meta hover:text-bone">
                    Close
                  </button>
                </div>
                <div className="or-sheet-sec">
                  <span className="meta">Tier</span>
                  <Seg label="Tier" options={TIER_OPTIONS} value={p.tier} onChange={p.setTier} />
                </div>
                <div className="or-sheet-sec">
                  <span className="meta">Stage</span>
                  <Seg label="Stage" options={STAGE_OPTIONS} value={p.stage} onChange={p.setStage} />
                </div>
                {p.hidden.length > 0 && (
                  <div className="or-sheet-sec is-col">
                    <HiddenList
                      hidden={p.hidden}
                      unhide={p.unhide}
                      restoreAll={p.restoreAll}
                      // The page behind a modal sheet is inert, so the
                      // Filters button can't take focus yet: the sheet's
                      // own Close does.
                      onEmptied={() => document.getElementById(id)?.querySelector<HTMLButtonElement>(".or-sheet-head button")?.focus()}
                    />
                  </div>
                )}
                <Limits {...p} onDone={closeSheet} />
              </>
            )}
          </Sheet>
        ))}
    </div>
  );
}

/** The drafted min/max fields. Mounted on open, so each opening starts
 *  from what is committed, not from an abandoned draft. */
function Limits(p: FiltersProps & { onDone: () => void }) {
  const [draft, setDraft] = useState<FilterDraft>(() => draftOf(p.committed));
  const [errors, setErrors] = useState<Errors>({});
  const first = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    if (p.wide) first.current?.focus();
  }, [p.wide]);

  const apply = () => {
    const { filter, errors: errs } = commitDraft(draft, p.committed);
    p.onApply(pickCommitted(filter), nextEcho(p.echo, draft, filter, errs));
    setErrors(errs);
    if (Object.keys(errs).length === 0) p.onDone();
  };

  const field = (k: PopField, i: number) => {
    const err = errors[k];
    const fid = `${uid}-${k}`;
    return (
      <label key={k} className="or-field" htmlFor={fid}>
        <span className="meta">{fieldLabel(k, p.w)}</span>
        <input
          ref={i === 0 ? first : undefined}
          id={fid}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={draft[k]}
          placeholder={k === "top10Max" || k === "devMax" ? "e.g. 30" : "e.g. 20k"}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${fid}-e` : undefined}
          onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          className="or-input num"
        />
        {err && (
          <span id={`${fid}-e`} className="or-err">
            {err}
          </span>
        )}
      </label>
    );
  };

  return (
    <div className="or-limits">
      <p className="or-note">Limits apply when you press Apply. Amounts take k, m and b.</p>
      <div className="or-fields">{POP_FIELDS.map(field)}</div>
      <div className="or-limits-foot">
        <button
          type="button"
          onClick={() => {
            setDraft((d) => ({ ...d, mcMin: "", mcMax: "", volMin: "", liqMin: "", top10Max: "", devMax: "" }));
            setErrors({});
          }}
          className="or-btn meta"
        >
          Reset
        </button>
        <button type="button" onClick={apply} className="or-btn or-btn-strong meta">
          Apply
        </button>
      </div>
    </div>
  );
}

/** A modal bottom sheet. A real <dialog> opened with showModal(), so the
 *  page behind it is inert and the board's keys stand down on their own
 *  (hotkeys.ts ignores keys while a dialog is open). Never
 *  position: relative (an open dialog with it lands off screen on a
 *  scrolled page). A press on the backdrop closes it.

 *  Every way out goes through dialog.close(), and the dialog's own
 *  "close" event is the one place the caller hears about it. Unmounting
 *  a dialog that is still open skips the browser's focus return. */
function Sheet({ id, onClose, children }: { id: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const close = () => ref.current?.close();
  return (
    <dialog
      ref={ref}
      id={id}
      aria-label="Filters"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="or-sheet mx-auto mb-0 mt-auto w-full max-w-none"
    >
      <div className="or-sheet-body">{children(close)}</div>
    </dialog>
  );
}

/* ----------------------------------------------------------- hidden */

/** A restore removes the button that was pressed, so focus is placed
 *  on purpose each time: the next entry's Restore (or the one above, at
 *  the end), and once the list is empty, wherever the caller says. */
function HiddenList({
  hidden,
  unhide,
  restoreAll,
  onEmptied,
}: {
  hidden: readonly string[];
  unhide: (e: string) => void;
  restoreAll: () => void;
  onEmptied: () => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  const restoreOne = (e: string, i: number) => {
    unhide(e);
    if (hidden.length === 1) {
      onEmptied();
      return;
    }
    requestAnimationFrame(() => {
      const btns = list.current?.querySelectorAll<HTMLButtonElement>("button");
      btns?.[Math.min(i, btns.length - 1)]?.focus();
    });
  };
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="meta">
          Hidden <span className="num text-muted">{hidden.length}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            restoreAll();
            onEmptied();
          }}
          className="meta text-muted hover:text-bone"
        >
          Restore all
        </button>
      </div>
      <ul ref={list} className="or-hidden-list">
        {hidden.map((e, i) => (
          <li key={e}>
            <span className="num text-[12px] text-bone">{e}</span>
            <button type="button" onClick={() => restoreOne(e, i)} className="meta hover:text-bone">
              Restore
            </button>
          </li>
        ))}
      </ul>
      <p className="or-note">Kept in this browser.</p>
    </>
  );
}

export function HiddenControl({
  hidden,
  unhide,
  restoreAll,
  onEmptied,
  className,
}: {
  hidden: readonly string[];
  unhide: (e: string) => void;
  restoreAll: () => void;
  onEmptied: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useRef(() => setOpen(false)).current;
  usePopover(open, close, root, btn);

  // Restoring the last entry leaves nothing to show; the button goes
  // with it, so the panel must too.
  useEffect(() => {
    if (hidden.length === 0) setOpen(false);
  }, [hidden.length]);

  return (
    <div ref={root} className={cx("or-pop-anchor", className)} data-hotkeys-inert={open ? "" : undefined}>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cx("or-ctl meta", open && "is-on")}
      >
        Hidden <span className="num text-bone">{hidden.length}</span>
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Hidden coins"
          className="or-pop or-pop-hidden"
        >
          <HiddenList hidden={hidden} unhide={unhide} restoreAll={restoreAll} onEmptied={onEmptied} />
        </div>
      )}
    </div>
  );
}
