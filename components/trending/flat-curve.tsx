import { cx } from "@/components/ui";
import type { Tier } from "@/lib/data";

/* The curve bar every version uses on Trending.

   components/ui.tsx's CurveBar is built for a card on its own: a
   gradient fill, a metal band that travels for 22s, a glow when done.
   Nine of those in one table is nine animated gradients on a board that
   is meant to be read, and the brief allows a glow only for what is
   genuinely live. So this is the flat variant: a solid fill in the
   tier's own ink, no animation, no glow, no gradient. CurveBar itself is
   left alone for the screens it was drawn for.

   Colour is the tier's ink, not the accent: the accent means "look
   here", and a column of half-full green bars would say that about
   every row. Free wears the steel ink the tier tags give it.

   An untrusted curve (lib/trending.ts curveTrusted: a roster fixture
   that doesn't follow market cap) is not progress toward graduation, so
   it isn't drawn as confidently as one that is. "dim" draws it at half
   strength; "hatch" draws no fill at all, only the reserved-slot hatch
   (.door-art), for a version whose geometry would otherwise read the bar
   as distance to the line. No server-only or client-only code, so either
   kind of component can render it. */

const INK: Record<Tier, string> = {
  Free: "bg-[var(--tier-free-ink)]",
  Fortress: "bg-[var(--tier-gold-ink)]",
  Diamond: "bg-[var(--tier-ice-ink)]",
};

export function FlatCurveBar({
  curve,
  migrated,
  tier,
  trusted = true,
  untrusted = "dim",
  height = 3,
  className,
}: {
  curve: number;
  migrated: boolean;
  tier: Tier;
  trusted?: boolean;
  untrusted?: "dim" | "hatch";
  height?: number;
  className?: string;
}) {
  const pct = migrated ? 100 : Math.max(0, Math.min(99, curve));
  const hatch = !trusted && untrusted === "hatch";
  return (
    <div
      aria-hidden
      data-trusted={trusted}
      className={cx("relative w-full overflow-hidden bg-raised", hatch && "door-art", className)}
      style={{ height }}
    >
      {!hatch && (
        <div
          className={cx("absolute inset-y-0 left-0", INK[tier], !trusted && "opacity-50")}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
