"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Tier } from "@/lib/data";
import { draftOf, type FilterDraft, type Stage, type TrendingFilter, type Window } from "@/lib/trending";

/* Draft and Apply. Every field publishes a limit, and bound as the
   reader typed, a half-typed "2" would briefly be a real $2 floor and
   empty the board. So the popover edits a copy and nothing moves until
   Apply; a click outside throws the copy away. There are no top-10,
   dev or liquidity fields: the board shows none of those figures (the
   liquidity is only in the phone's sheet), and a board should not filter
   on what it doesn't show. A liquidity floor would also have dropped the
   real launch, whose liquidity was never indexed, without saying so.
   Search and hidden coins are set elsewhere and never pass through
   here. */

type Errors = Partial<Record<keyof FilterDraft, string>>;

const STAGES: { v: Stage; label: string }[] = [
  { v: "all", label: "All" },
  { v: "curve", label: "On curve" },
  { v: "migrated", label: "Migrated" },
];
const TIERS: Tier[] = ["Free", "Fortress", "Diamond"];

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="bs-toggle meta">
      {children}
    </button>
  );
}

export function FiltersPopover({
  w,
  limits,
  applied,
  onApply,
  onClose,
}: {
  w: Window;
  limits: TrendingFilter;
  applied: FilterDraft | null;
  onApply: (draft: FilterDraft) => Errors;
  /** `refocus`: hand the focus back to the trigger. */
  onClose: (refocus: boolean) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  // Reopens exactly as typed: the last applied strings where there are
  // some, the committed limits written back out where there aren't.
  const [draft, setDraft] = useState<FilterDraft>(() => ({ ...draftOf(limits), ...(applied ?? {}) }));
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      // The trigger toggles the popover itself.
      if (root.current?.contains(t) || root.current?.parentElement?.contains(t)) return;
      onClose(false);
    };
    // Capture, and marked handled, so the page's own Escape (clear the
    // search, then the selection) doesn't run as well.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  // Focus goes to the panel, not its first field: a field would open a
  // phone's keyboard over the very popover it belongs to.
  useEffect(() => {
    root.current?.focus();
  }, []);

  const set = <K extends keyof FilterDraft>(k: K, v: FilterDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const field = (k: "mcMin" | "mcMax" | "volMin", label: string) => (
    <label className="flex flex-col gap-1">
      <span className="meta">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. 20k"
        value={draft[k]}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? `${id}-${k}` : undefined}
        onChange={(e) => set(k, e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          // Handled here: Apply hands the focus to the trigger, and an
          // unhandled Enter would go on to press it and reopen the panel.
          e.preventDefault();
          apply();
        }}
        className="bs-field num"
      />
      {errors[k] && (
        <p id={`${id}-${k}`} className="meta text-neg">
          {errors[k]}
        </p>
      )}
    </label>
  );

  function apply() {
    const errs = onApply(draft);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onClose(true);
  }

  return (
    <div ref={root} role="dialog" aria-label="Filters" tabIndex={-1} data-hotkeys-inert="" className="bs-pop">
      <div className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-1">
          <legend className="meta mb-1">Stage</legend>
          <div className="flex flex-wrap gap-1">
            {STAGES.map((s) => (
              <Toggle key={s.v} on={draft.stage === s.v} onClick={() => set("stage", s.v)}>
                {s.label}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1">
          <legend className="meta mb-1">Tier</legend>
          <div className="flex flex-wrap gap-1">
            {TIERS.map((t) => (
              <Toggle
                key={t}
                on={draft.tiers.includes(t)}
                onClick={() => set("tiers", draft.tiers.includes(t) ? draft.tiers.filter((x) => x !== t) : [...draft.tiers, t])}
              >
                {t}
              </Toggle>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {field("mcMin", "Market cap ≥")}
          {field("mcMax", "Market cap ≤")}
          {field("volMin", `Volume ${w} ≥`)}
        </div>
        <div className="flex items-center gap-2 border-t border-line pt-3">
          <button type="button" onClick={apply} className="bs-apply meta">
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft((d) => ({ ...d, mcMin: "", mcMax: "", volMin: "", liqMin: "", tiers: [], stage: "all" }));
              setErrors({});
            }}
            className="meta bs-textbtn"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
