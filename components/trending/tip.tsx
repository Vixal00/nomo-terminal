"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { LABELS } from "@/lib/labels";

/** A tooltip that a keyboard can reach.
 *
 *  The id comes from useId: ids made with Math.random() disagreed
 *  between the server and the client and broke hydration once already.
 *  Shown on hover and on focus, hidden on leave, blur and Escape, and
 *  tied to its trigger with aria-describedby so a screen reader reads it
 *  with the thing it describes. The wrapper takes focus itself unless
 *  `focusable` is false (when the child is already a button or link,
 *  wrap that child and pass false). */
export function Tip({
  label,
  children,
  side = "bottom",
  align = "start",
  focusable = true,
  className,
  tipClassName,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  focusable?: boolean;
  className?: string;
  tipClassName?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cx("relative inline-flex", className)}
      aria-describedby={id}
      tabIndex={focusable ? 0 : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cx(
          "pointer-events-none absolute z-50 w-max max-w-[280px] border border-line-bright bg-raised px-2.5 py-2 text-left font-sans text-[11.5px] normal-case leading-snug tracking-normal text-muted",
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
          tipClassName,
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** The token-info group's head: "FIXTURE", with the definitions behind
 *  it. One label for the group rather than one per figure, and the
 *  sniper and bundler definitions travel with it because both figures
 *  would otherwise indict the platform's own launch transaction. */
export function AuditDefTip({ className, side, align }: { className?: string; side?: "top" | "bottom"; align?: "start" | "center" | "end" }) {
  return (
    <Tip label={LABELS.AUDIT_DEF} side={side} align={align} className={className}>
      <span className="meta cursor-help underline decoration-dotted underline-offset-2">{LABELS.AUDIT_HEAD}</span>
    </Tip>
  );
}
