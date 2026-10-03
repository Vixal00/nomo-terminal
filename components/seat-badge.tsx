import { SheenTag, cx } from "./ui";
import { ROUTES, type Route } from "@/lib/spec";
import type { Seat } from "@/lib/z500";

/* The seat, as a credential.
 *
 * design/z500-spec.md §6: a seat appears on the token's page, in the
 * terminal and in the weekly report with a route marker, and the badge
 * cannot be exported, bought or transferred. So it is drawn once, here,
 * and every surface that shows a seat shows this — one shape for one
 * credential, and nothing to copy elsewhere.
 */

/** The route, as a tag on the tier tags' machinery (owner's word: the
 *  bracketed word it replaced read as a status, and a route is a
 *  credential). Fortress and Diamond wear their tier's ramp and glyph,
 *  because a Fortress seat is a Fortress launch; Merit and External
 *  have a pair of their own. How the route is earned is on hover. */
/** Exported because the weekly report joins a route's seal to a cell
 *  of its own and needs the same ramp and glyph box. The component
 *  that does it cannot live here: this module is imported by a server
 *  component, and that one needs a hook. */
export const ROUTE_TAG: Record<Route, { cls: string; box: string }> = {
  Fortress: { cls: "tier-fortress", box: "w-[10px]" },
  Diamond: { cls: "tier-ice", box: "w-[8.7px]" },
  Merit: { cls: "tier-merit", box: "w-[7.4px]" },
  External: { cls: "tier-external", box: "w-[7px]" },
};

export function RouteMark({
  route,
  spent,
  className,
}: {
  route: Route;
  /** The route a seat WAS held on, after it has been removed. Drained
   *  of its colour, because a route mark is a live credential and a
   *  removed seat's is not — printed at full strength beside the
   *  reason it was taken away, it read as though the token still held
   *  it. Grey is the one statement the ramp machinery can make about a
   *  thing that is over. */
  spent?: boolean;
  className?: string;
}) {
  const r = ROUTES.find((x) => x.id === route)!;
  const tag = ROUTE_TAG[route];
  return (
    <SheenTag
      cls={tag.cls}
      box={tag.box}
      label={route}
      title={spent ? `${route} route, no longer held` : r.how}
      className={cx(spent && "opacity-55 grayscale", className)}
    />
  );
}

/** The seat number and route together, as one credential.
 *
 *  This was a green rectangle with "Z500 #17 · MERIT" inside it — one
 *  hairline, one colour, a middot doing the work of a join — while
 *  every other tag on the site sits on the plate-and-ink machinery
 *  with its own ramp, its own masked glyph and the hand-stopped sheen.
 *  A seat is the strongest credential the index gives out and it was
 *  the plainest mark on the page.
 *
 *  So it is built like a plate now: a raised cell carrying the
 *  permanent part — the number, which never changes (§2) — joined
 *  flush to the route's own seal, which says how it was earned and
 *  wears that route's ramp and glyph. Two facts, two cells, one
 *  object.
 *
 *  The outer span carries the radius and clips: the seal keeps its own
 *  corners and the clip takes the two that meet the number plate, so
 *  nothing has to fight Tailwind's rounding utilities for them. */
export function SeatBadge({
  seat,
  className,
}: {
  seat: Pick<Seat, "seatNo" | "route">;
  className?: string;
}) {
  const tag = ROUTE_TAG[seat.route];
  return (
    <span
      className={cx("inline-flex shrink-0 items-stretch overflow-hidden rounded-[5px] align-middle", className)}
      title={`Z500 seat ${seat.seatNo}, ${seat.route} route`}
    >
      <span className="flex items-center gap-[5px] bg-raised py-[4px] pl-[7px] pr-[7px] font-mono text-[8.5px] font-semibold uppercase leading-none tracking-[0.1em]">
        <span className="text-dim">Z500</span>
        <span className="num text-bone">#{seat.seatNo}</span>
      </span>
      <SheenTag cls={tag.cls} box={tag.box} label={seat.route} square />
    </span>
  );
}
