/**
 * The design versions of the Trending page, in one registry.
 *
 * The index at / and every version's VersionMenu read this list, so a
 * version is added, renamed or reordered here and nowhere else.
 *
 * The contract a version builder works to:
 *
 * - The route is app/v/<slug>/page.tsx, a server shell that already
 *   exists. It resolves coin art on the server (coinArt reads the disk,
 *   so fs never reaches the client), wraps the screen in VersionShell
 *   (MarketSimProvider + ToastProvider) and imports the version's own
 *   stylesheet. Leave it as it is.
 * - The screen is components/v/<slug>/screen.tsx, a client component
 *   exporting `Screen({ art })`, where art maps a ticker to its picture.
 *   That file, and anything else under components/v/<slug>/, is the
 *   version's to write.
 * - The version's CSS is app/v/<slug>/<slug>.css, every rule scoped under
 *   `.v-<slug>` on the screen's root. Nothing goes into app/globals.css.
 * - The one-liners are the design plan's, trimmed where the critique
 *   withdrew a claim (Heatsheet's row count at a real 1440×789 viewport
 *   and its "momentum" heat, which the independently drawn windows can't
 *   support; Floor's band split; Broadside's focus-following poster; The
 *   Line's "crosses next" and its one lifecycle axis for every row, which
 *   the roster curve can't support), because the index prints them as
 *   statements about the page.
 * - Figures, ranking, filters, formatting, labels and the simulation come
 *   from lib/trending.ts, lib/trending-live.ts, lib/format.ts,
 *   lib/labels.ts and lib/seat-state.ts, and the shared controls from
 *   components/trending/. A version that needs something they lack gets
 *   it added there, not forked. See research/foundation-api.md.
 */

export type Version = {
  slug: "heatsheet" | "openrow" | "line" | "floor" | "broadside" | "discover";
  name: string;
  /** The class the screen's root carries and every rule is scoped by. */
  scope: string;
  oneLiner: string;
};

export const VERSIONS: readonly Version[] = [
  {
    slug: "heatsheet",
    name: "Heatsheet",
    scope: "v-heatsheet",
    oneLiner:
      "A keyboard-driven instrument with one line per coin: about 28 coins on a laptop screen. Filters are typed and echoed under their own columns. Tinted cells appear in two places only: the change by window on the left, and the fixture's risk figures on the right.",
  },
  {
    slug: "openrow",
    name: "Open Row",
    scope: "v-openrow",
    oneLiner:
      "A lean ranked list next to a full-height inspector. You press Buy only on the coin whose ticker is printed 44px tall directly above the key, so a re-rank can never make you buy the wrong row.",
  },
  {
    slug: "line",
    name: "The Line",
    scope: "v-line",
    oneLiner:
      "Trending split in two by the graduation line: graduated and seated coins above it, coins still on the curve below. Scored seats are placed against the Z500 entry bar and exit line; coins on the curve show their stage, with the roster curve hatched where it doesn't follow market cap.",
  },
  {
    slug: "floor",
    name: "Floor",
    scope: "v-floor",
    oneLiner:
      "Trending drawn to scale. Each coin's tile area is its share of the window's trades, which is the rule the board ranks by. A rail holds the inspector and the full ranked list.",
  },
  {
    slug: "broadside",
    name: "Broadside",
    scope: "v-broadside",
    oneLiner:
      "A wood-type poster over the Black Bull sets the number the board is ranked by in huge Republica. A dense 30px table runs beneath it.",
  },
  {
    /* The owner's scrapped "Arteria" screen, kept as close to its layout
       as the brief allows and rebranded: square where it was round, flat
       where it had gradient fills, and every cell it could not back
       either replaced with an Ansem figure or left out. Its trending
       tab ranks by turnover (see TrendingRule in lib/trending.ts). */
    slug: "discover",
    name: "Discover",
    scope: "v-discover",
    oneLiner:
      "The reference layout, rebranded: masthead, ticker tape, filter bar, tall pair rows with a chart and a token-info grid, a buy key on every row and a status strip. Trending ranks by trades for their size, so the Z500 doesn't fill the top.",
  },
];

export function versionOf(slug: Version["slug"]): Version {
  return VERSIONS.find((v) => v.slug === slug)!;
}
