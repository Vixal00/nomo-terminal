"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

/** LOCAL: candidate for foundation. The shared Tip with its side chosen
 *  when it opens, for tips inside board rows. A row cell can't paint
 *  over the sticky column head or the fixed status bar (both sit above
 *  every cell), so a tip that opens toward either is covered, and some
 *  of these tips carry the only statement of a caveat. It opens downward
 *  when it fits between the anchor and the status bar's top, else upward
 *  when it fits between the head's bottom and the anchor, else toward
 *  whichever side has more room. Measured before paint, so it never
 *  shows on the wrong side first. Same markup and look as Tip. */
export function RowTip({
  label,
  children,
  align = "start",
  focusable = true,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  focusable?: boolean;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"top" | "bottom">("bottom");
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;
    const root = anchor.closest(".v-discover");
    const a = anchor.getBoundingClientRect();
    const h = tip.offsetHeight + 8; // the tip's 6px gap, and a little air
    const head = root?.querySelector(".dc-head")?.getBoundingClientRect();
    const status = root?.querySelector(".dc-status")?.getBoundingClientRect();
    const topLimit = Math.max(0, head && head.height > 0 && head.bottom <= a.top + 1 ? head.bottom : 0);
    const bottomLimit = status && status.height > 0 ? Math.min(status.top, window.innerHeight) : window.innerHeight;
    const below = bottomLimit - a.bottom;
    const above = a.top - topLimit;
    const next = h <= below ? "bottom" : h <= above ? "top" : above > below ? "top" : "bottom";
    if (next !== side) setSide(next);
  }, [open, side]);

  return (
    <span
      ref={anchorRef}
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
        ref={tipRef}
        id={id}
        role="tooltip"
        hidden={!open}
        data-side={side}
        className={cx(
          "pointer-events-none absolute z-50 w-max max-w-[280px] border border-line-bright bg-raised px-2.5 py-2 text-left font-sans text-[11.5px] normal-case leading-snug tracking-normal text-muted",
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}
