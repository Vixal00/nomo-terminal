"use client";

import Image from "next/image";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { CoinAvatar, TierMark, cx } from "@/components/ui";
import { CopyMark } from "@/components/marks";
import { useToast } from "@/components/trending";
import { LABELS, RANK_HEADLINE } from "@/lib/labels";
import { TONE_CLASS, seatState } from "@/lib/seat-state";
import { signOf, useSinceLaunch } from "@/lib/trending-live";
import type { TrendingRow, Window } from "@/lib/trending";
import * as fmt from "@/lib/format";
import { COPY, type BsTab } from "./copy";
import { clockText, emOf, nullTitle, type Face } from "./fit";

/* The poster: the one loud thing on the page.

   It headlines #1 of the board as it stands (tab, window, filters), in
   the figure the board is ranked by, and it never follows the row
   focus: a poster that changed with J and K would be an inspector, and
   the table beneath it already says everything about the other rows.
   It has no motion. It changes by a hard cut when the order takes a new
   snapshot, and its time stamp says which snapshot that was. */

/** The figures the sentence prints, read at the moment the order was
 *  computed (see Screen). */
export type Snap = {
  change: number | null;
  mc: number | null;
  txns: number | null;
  buys: number | null;
  sells: number | null;
  age: number | null;
};

export type PosterEmpty =
  | { kind: "starred"; goTrending: () => void }
  | { kind: "filtered"; clear: () => void; hidden: number; showHidden: () => void };

type Headliner = { text: string; face: "rep" | "sans"; tone: string; title?: string };

/** The big figure for a tab: the ranking input itself. Market cap is
 *  set in the sans, because Republica has no tabular figures and never
 *  sits beside a price. An unscored seat gets words, never its fixture
 *  score, which the index doesn't use. */
function headliner(tab: BsTab, row: TrendingRow, value: number | null, mc: number): Headliner {
  if (tab === "z500") {
    const st = seatState(row, mc);
    if (st.numeral !== null) return { text: String(st.numeral), face: "rep", tone: TONE_CLASS[st.tone], title: st.sentence };
    if (row.seat) return { text: COPY.UNSCORED(row.seat.seatNo), face: "rep", tone: "text-muted", title: st.sentence };
    return { text: fmt.NULL, face: "rep", tone: "text-dim", title: LABELS.SEAT.NONE };
  }
  if (value === null) return { text: fmt.NULL, face: "rep", tone: "text-dim", title: nullTitle(row, tab === "top" ? "mc" : "txns") };
  if (tab === "top") return { text: fmt.usdLike(row.mcLabel)(value), face: "sans", tone: "text-bone" };
  return { text: fmt.count(value), face: "rep", tone: "text-bone" };
}

/** What the big figure is, where the headline doesn't already say it.
 *  "Most traded, last hour" names the trades figure, so on Trending and
 *  Starred there is no unit line. An unscored Z500 seat has no score, so
 *  its line names the seat instead of calling the slot an index score. */
function unitOf(tab: BsTab, row: TrendingRow, mc: number): ReactNode {
  if (tab === "top") return "Market cap";
  if (tab !== "z500") return null;
  const st = seatState(row, mc);
  return (
    <span title={st.sentence}>
      {st.numeral !== null ? "Index score" : "Z500 seat"} · {st.short}
    </span>
  );
}

/** What qualifies the big figure itself: since launch, when the coin is
 *  younger than the window, and the moment it was read. The moment is
 *  set on the figure because row 1 below keeps ticking and the poster
 *  doesn't: the time is what reconciles the two. None on Z500, whose
 *  figure is a fixture score (its sentence carries the time instead),
 *  and none on the real launch, a hand-copied snapshot that a fresh read
 *  time would present as read just now. */
function qualifiers(tab: BsTab, row: TrendingRow, since: boolean, at: number | null): ReactNode[] {
  const out: ReactNode[] = [];
  if (since && (tab === "trending" || tab === "starred")) {
    out.push(
      <span key="since" className="whitespace-nowrap" title={LABELS.SINCE_LAUNCH_TITLE}>
        {LABELS.SINCE_LAUNCH}
      </span>,
    );
  }
  if (tab !== "z500" && !row.real && at !== null) {
    out.push(
      <span key="at" className="whitespace-nowrap">
        At <span className="num">{clockText(at)}</span>
      </span>,
    );
  }
  return out;
}

const joined = (parts: ReactNode[]) =>
  parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && " · "}
      {p}
    </Fragment>
  ));

/** The numeral and, directly under it, what qualifies it. The line is
 *  always there, empty until the first snapshot has a time, so the
 *  numeral doesn't move when the time arrives after mount. */
function Figure({ tab, w, row, num, at }: { tab: BsTab; w: Window; row: TrendingRow; num: Headliner; at: number | null }) {
  const since = useSinceLaunch(row.ticker, w);
  return (
    <>
      <span
        className={cx("num bs-num", num.tone)}
        data-face={num.face}
        title={num.title}
        style={{ "--em": emOf(num.text, num.face as Face) } as CSSProperties}
      >
        {num.text}
      </span>
      <p className="meta bs-asof">{joined(qualifiers(tab, row, since, at))}</p>
    </>
  );
}

/** The mint, copied. Every mint but the real launch's is a placeholder,
 *  and the title and the toast both say so; there is no explorer link,
 *  because a placeholder resolves to nothing. */
export function MintCopy({ row, children, className }: { row: TrendingRow; children?: ReactNode; className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={cx("meta bs-mint", className)}
      aria-label="Copy mint address"
      title={row.mintResolves ? row.mint : LABELS.MINT_PLACEHOLDER}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(row.mint);
          toast({ tone: "info", title: COPY.COPIED, body: row.mintResolves ? undefined : LABELS.MINT_PLACEHOLDER });
        } catch {
          toast({ tone: "fail", title: COPY.COPY_FAILED });
        }
      }}
    >
      {children}
      <CopyMark className="h-3 w-3" />
    </button>
  );
}

/** "1 trade", not "1 trades": the real launch has exactly one. */
const noun = (n: number | null, one: string) => (n === 1 ? one : `${one}s`);

function Sentence({
  tab,
  w,
  row,
  snap,
  since,
  at,
}: {
  tab: BsTab;
  w: Window;
  row: TrendingRow;
  snap: Snap;
  since: boolean;
  at: number | null;
}) {
  const chg = fmt.pct(snap.change);
  const flowNull = snap.buys === null || snap.sells === null;
  return (
    // Each clause holds together, so a line breaks only between them.
    <p className="bs-sentence num">
      <span>
        <span
          className="bs-chg"
          data-sign={signOf(snap.change, chg)}
          title={snap.change === null ? nullTitle(row, "change") : undefined}
        >
          {chg}
        </span>
        {since ? ` ${LABELS.SINCE_LAUNCH}` : ` in ${w}`}
      </span>
      {" · "}
      {tab === "top" ? (
        <span>
          <b>{fmt.count(snap.txns)}</b> {noun(snap.txns, "trade")}
        </span>
      ) : (
        <span>
          <b>{fmt.usdLike(row.mcLabel)(snap.mc)}</b> mcap
        </span>
      )}
      {" · "}
      {flowNull ? (
        <span data-sign="null" title={nullTitle(row, "buys")}>
          {fmt.NULL}
        </span>
      ) : (
        <span>
          <b>{fmt.count(snap.buys)}</b> {noun(snap.buys, "buy")} / <b>{fmt.count(snap.sells)}</b> {noun(snap.sells, "sell")}
        </span>
      )}
      {/* On Z500 the numeral is a fixture, so the time these ticking
          figures were read goes with them rather than on the score. */}
      {tab === "z500" && at !== null && !row.real && (
        <>
          {" · "}
          <span>at {clockText(at)}</span>
        </>
      )}
    </p>
  );
}

function Caption({
  tab,
  w,
  row,
  snap,
  mc,
  at,
  src,
}: {
  tab: BsTab;
  w: Window;
  row: TrendingRow;
  snap: Snap;
  mc: number;
  at: number | null;
  src?: string;
}) {
  const since = useSinceLaunch(row.ticker, w);
  const st = row.seat ? seatState(row, mc) : null;
  const unit = unitOf(tab, row, mc);
  return (
    <div className="bs-cap">
      {unit && <p className="meta bs-unit">{unit}</p>}
      <div className="bs-ident">
        <span className="num text-muted">(1)</span>
        <CoinAvatar ticker={row.ticker} src={src} size={24} />
        <span className="bs-ptick">${row.ticker}</span>
        <span className="cased bs-pname" title={row.name}>
          {row.name}
        </span>
        <TierMark tier={row.tier} showFree />
        {row.real && (
          <span className="meta text-rim" title={LABELS.REAL_TITLE}>
            {LABELS.REAL}
          </span>
        )}
        <span className="only-chain1 inline-flex">
          <MintCopy row={row} />
        </span>
      </div>
      {/* The coin's age leads and is named, so it can't be read as how
          long the seat after it has been held. Each clause is unbreakable
          and carries its own trailing separator, so a narrow column breaks
          between clauses and never starts a line with a dot. On Z500 the
          unit line above already states the seat's state. */}
      <p className="meta bs-seatline">
        <span className="whitespace-nowrap">
          Age <span className="num">{fmt.ageLike(row.ageLabel)(snap.age)}</span>
          {row.seat && " ·"}
        </span>
        {row.seat && st && (
          <>
            {" "}
            <span className="whitespace-nowrap" title={st.sentence}>
              Z500 #{row.seat.seatNo}
              {tab !== "z500" && " ·"}
            </span>
            {tab !== "z500" && (
              <>
                {" "}
                <span className="whitespace-nowrap" title={st.sentence}>
                  {st.short}
                </span>
              </>
            )}
          </>
        )}
      </p>
      <Sentence tab={tab} w={w} row={row} snap={snap} since={since} at={at} />
    </div>
  );
}

export function Poster({
  tab,
  w,
  row,
  value,
  at,
  snap,
  src,
  rule,
  empty,
  onToggle,
}: {
  tab: BsTab;
  w: Window;
  row: TrendingRow | null;
  value: number | null;
  /** When the snapshot was read; null on the server and at hydration. */
  at: number | null;
  snap: Snap | null;
  src?: string;
  rule: string;
  empty: PosterEmpty | null;
  onToggle: () => void;
}) {
  const headline = empty
    ? empty.kind === "starred"
      ? COPY.STARRED_EMPTY_HEAD
      : COPY.EMPTY_HEAD
    : tab === "trending"
      ? RANK_HEADLINE.trending(w)
      : RANK_HEADLINE[tab]();
  const sub = empty ? (empty.kind === "starred" ? COPY.STARRED_EMPTY_SUB : COPY.EMPTY_SUB) : rule;
  const mc = snap?.mc ?? row?.mcUsd ?? 0;
  const num = row && !empty ? headliner(tab, row, value, mc) : null;

  return (
    <section className="bs-poster" aria-labelledby="bs-headline">
      <div className="bs-head">
        <div className="bs-ra">
          <h1 id="bs-headline" className="display bs-headline">
            <span className="bs-headline-text" style={{ "--em": emOf(headline.toUpperCase(), "rep-head") } as CSSProperties}>
              {headline}
            </span>
          </h1>
          <span className="meta bs-stamp" title={LABELS.SIM_TITLE}>
            {`${LABELS.DISCLOSURE[0]} · ${LABELS.DISCLOSURE[1]}`}
          </span>
        </div>
        <div className="bs-rb">
          <p className="bs-rule" title={sub}>
            {sub}
          </p>
          <button
            type="button"
            className="meta bs-foldbtn"
            aria-expanded="true"
            aria-controls="bs-poster-body"
            onClick={onToggle}
          >
            {COPY.FOLD}
          </button>
        </div>
      </div>

      {/* The figure's width in em goes on the body so that at 1280 and up the
          grid can reserve the figure's room and give the caption the rest,
          rather than a fixed share that wrapped the sentence beside empty
          canvas. Z500's figure has nothing to qualify it (its read time
          goes with the sentence), which the wide layout uses: its empty
          line steps out and the score takes the height. */}
      <div
        id="bs-poster-body"
        className="bs-body"
        data-noq={num && tab === "z500" ? "" : undefined}
        style={num ? ({ "--zem": emOf(num.text, num.face as Face) } as CSSProperties) : undefined}
      >
        <div className="bs-art art-fade" aria-hidden>
          <Image
            src="/art/bgimg.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1600px) 672px, 42vw"
            className="object-cover"
          />
        </div>
        <div className="bs-zone">{row && num && <Figure tab={tab} w={w} row={row} num={num} at={at} />}</div>
        {row && snap && !empty ? (
          <Caption tab={tab} w={w} row={row} snap={snap} mc={mc} at={at} src={src} />
        ) : (
          <div className="bs-cap">
            {/* An empty board always offers the way out of it, as a
                button, beside the sentence that explains it. */}
            {empty?.kind === "filtered" && (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="meta bs-textbtn" onClick={empty.clear}>
                  {COPY.CLEAR}
                </button>
                {empty.hidden > 0 && (
                  <button type="button" className="meta bs-textbtn" onClick={empty.showHidden}>
                    {COPY.SHOW_HIDDEN(empty.hidden)}
                  </button>
                )}
              </div>
            )}
            {empty?.kind === "starred" && (
              <div className="flex">
                <button type="button" className="meta bs-textbtn" onClick={empty.goTrending}>
                  {COPY.GO_TRENDING}
                </button>
              </div>
            )}
          </div>
        )}
        <span className="meta bs-caption">{COPY.ART_CAPTION}</span>
      </div>
    </section>
  );
}

/** The folded strip's summary: #1 in the figure it is ranked by, with
 *  the unit where the rule doesn't give it and the same qualifiers the
 *  open poster sets under its numeral. */
function FoldSum({ tab, w, row, num, mc, at }: { tab: BsTab; w: Window; row: TrendingRow; num: Headliner; mc: number; at: number | null }) {
  const since = useSinceLaunch(row.ticker, w);
  const unit = unitOf(tab, row, mc);
  const parts = qualifiers(tab, row, since, at);
  if (unit) parts.unshift(<Fragment key="unit">{unit}</Fragment>);
  return (
    <>
      <span className="text-muted">(1)</span> <span className="text-bone">${row.ticker}</span>{" "}
      <span className={num.tone} title={num.title}>
        {num.text}
      </span>
      {parts.length > 0 && <span className="meta">{joined(parts)}</span>}
    </>
  );
}

/** The poster folded to one line: the rule, and #1 in the figure it is
 *  ranked by, set small in the table's face. No stamp: the status bar's
 *  disclosure is on screen whenever this is. */
export function FoldedStrip({
  tab,
  w,
  row,
  value,
  at,
  snap,
  rule,
  empty,
  onToggle,
}: {
  tab: BsTab;
  w: Window;
  row: TrendingRow | null;
  value: number | null;
  at: number | null;
  snap: Snap | null;
  rule: string;
  empty: PosterEmpty | null;
  onToggle: () => void;
}) {
  const mc = snap?.mc ?? row?.mcUsd ?? 0;
  const num = row && !empty ? headliner(tab, row, value, mc) : null;
  return (
    <div className="bs-fold">
      <p className="bs-rule" title={rule}>
        {rule}
      </p>
      <p className="bs-fold-sum num">
        {row && num ? (
          <FoldSum tab={tab} w={w} row={row} num={num} mc={mc} at={at} />
        ) : (
          <span className="text-muted">{empty?.kind === "starred" ? COPY.STARRED_EMPTY_HEAD : COPY.EMPTY_HEAD}</span>
        )}
      </p>
      <button type="button" className="meta bs-foldbtn" aria-expanded="false" aria-controls="bs-poster-body" onClick={onToggle}>
        {COPY.UNFOLD}
      </button>
    </div>
  );
}
