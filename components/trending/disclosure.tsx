import { cx } from "@/components/ui";
import { LABELS } from "@/lib/labels";

/** The three facts every screen states: fixture data, trades simulated
 *  in this browser, no chain connection. As hairline cells or as one
 *  line. Not a client component and no hooks, so the index (a server
 *  component) renders it without pulling the simulation into its
 *  bundle. */
export function Disclosure({
  variant = "line",
  className,
  cellClassName,
}: {
  variant?: "cells" | "line";
  className?: string;
  cellClassName?: string;
}) {
  if (variant === "line") return <p className={cx("meta", className)}>{LABELS.DISCLOSURE_LINE}</p>;
  return (
    <ul className={cx("flex items-stretch", className)} aria-label="About this data">
      {LABELS.DISCLOSURE.map((d, i) => (
        <li key={d} className={cx("meta whitespace-nowrap px-2", i > 0 && "border-l border-line", cellClassName)}>
          {d}
        </li>
      ))}
    </ul>
  );
}
