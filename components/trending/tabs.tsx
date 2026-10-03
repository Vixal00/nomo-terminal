"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui";
import { WINDOWS, type Window } from "@/lib/trending";

/** One tab, in the swap screen's grammar: a two-pixel rule under the
 *  word, accent when it is the one, invisible when it is not, pulled a
 *  pixel down so the rule sits on the row's hairline rather than
 *  floating above it. Used for the tabs and the windows both, which is
 *  the point: one shape for one idea. (From ansem-v2's terminal.)
 *
 *  `role="tab"` for a tablist, where selection is aria-selected;
 *  otherwise it is a toggle and reports aria-pressed. */
export function UnderlineTab({
  on,
  onClick,
  role,
  controls,
  className,
  children,
}: {
  on: boolean;
  onClick: () => void;
  role?: "tab";
  /** The panel id, for role="tab". */
  controls?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === "tab" ? on : undefined}
      aria-controls={role === "tab" ? controls : undefined}
      aria-pressed={role === "tab" ? undefined : on}
      tabIndex={role === "tab" && !on ? -1 : undefined}
      onClick={onClick}
      className={cx(
        "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
        on ? "border-accent text-accent" : "border-transparent text-dim hover:text-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The four windows the fixtures have. No 1m or 30m: coinDetail has no
 *  such window, and adding one would reshuffle every coin's figures. */
export function WindowSwitch({
  value,
  onChange,
  className,
  tabClassName,
  label = "Window",
}: {
  value: Window;
  onChange: (w: Window) => void;
  className?: string;
  tabClassName?: string;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx("flex items-stretch gap-3", className)}>
      {WINDOWS.map((w) => (
        <UnderlineTab key={w} on={value === w} onClick={() => onChange(w)} className={tabClassName}>
          {w}
        </UnderlineTab>
      ))}
    </div>
  );
}
