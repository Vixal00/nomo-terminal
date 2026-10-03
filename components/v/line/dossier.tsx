"use client";

import { CoinAvatar, BoostChip, GlyphBadge, cx } from "@/components/ui";
import { SeatBadge } from "@/components/seat-badge";
import { CheckMark, CloseMark, CopyMark, SolscanMark } from "@/components/marks";
import { AuditDefTip, FlatCurveBar, amountText, usePlaceholderBuy, useToast } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { FORTRESS, LAUNCH_COST, ROUTES, Z500 } from "@/lib/spec";
import { seatState } from "@/lib/seat-state";
import { WINDOWS, auditBand, quickBuy, type TrendingRow, type Window } from "@/lib/trending";
import { signOf, useLiveCell, useLiveValue, useMarketSim, useSinceLaunch, type Cell } from "@/lib/trending-live";
import * as fmt from "@/lib/format";
import { LINE_COPY, TIER_GLYPH, gateAttr, meritGates, pathStep } from "./lifecycle";
import { ScoreBar, curvePct } from "./row";

/* The selected coin, read along its path.

   The board says where a coin is relative to the line; this says what
   the line means for it: which of the six steps it has done, what the
   next one asks of it, and the figures behind that. It is the same
   component in the rail (1400 and up), the drawer (1024 to 1399) and
   under the card (below 1024), so the three can't drift apart.

   Token-info figures (holders, top 10, dev, snipers, bundlers) appear
   only here, under the one FIXTURE head, never in a row. */

export type QbPair = { 1: { amount: number; unit: string }; 2: { amount: number; unit: string } };

export function Dossier({
  ticker,
  src,
  w,
  variant,
  starred,
  qb,
  onStar,
  onHide,
  onClose,
}: {
  ticker: string;
  src?: string;
  w: Window;
  variant: "rail" | "drawer" | "inline";
  starred: boolean;
  qb: QbPair;
  onStar: () => void;
  onHide: () => void;
  onClose?: () => void;
}) {
  const sim = useMarketSim();
  const row = sim.row(ticker);
  if (!row) return null;
  return (
    <article className="dos face-sans" data-variant={variant} aria-label={`$${ticker} dossier`}>
      <Head row={row} src={src} w={w} starred={starred} onStar={onStar} onHide={onHide} onClose={onClose} />
      <Path row={row} w={w} />
      <Stats row={row} w={w} />
      <Market row={row} w={w} />
      <Fixture row={row} />
      {row.boost && (
        <div className="blk boost">
          <span title={LABELS.BOOST_TITLE}>
            <BoostChip points={row.boost.points} bare />
          </span>
          <span className="meta" title={LABELS.BOOST_TITLE}>
            Paid placement
          </span>
        </div>
      )}
      <Mint row={row} />
      <Buy ticker={row.ticker} qb={qb} />
      <p className="dfoot">{LABELS.NO_PAGE}</p>
    </article>
  );
}

/* ----------------------------------------------------------- Legend */

/** The path with no coin on it, for the rail before anything is picked.
 *  The same six steps the dossier walks a coin through, each stated as
 *  the rule rather than as a coin's progress, so the first thing the
 *  rail says is what the line on the board means. Every figure is a
 *  spec constant. */
export function PathLegend() {
  const rules = [
    <>
      <p>
        <span className="only-chain1">
          <span className="num fig">{LAUNCH_COST.airdropBuySol} SOL</span> airdrop buy
        </span>
        <span className="only-chain2">
          <span className="num fig">{LAUNCH_COST.airdropBuyEth} ETH</span> airdrop buy
        </span>{" "}
        <span className="meta">{LABELS.AS_DOCUMENTED}</span>
      </p>
      <p>{LABELS.AIRDROP_RESERVE}</p>
    </>,
    <>
      <p>{LABELS.CURVE_FORTRESS}</p>
      <p className="dim">{LABELS.CURVE_CAVEAT}</p>
    </>,
    <p>The curve completes. Graduated coins sit above the line.</p>,
    <p>{`${Z500.graceHours}h after graduation, on every route.`}</p>,
    <p>{LINE_COPY.AFTER_GRAD_TIP}</p>,
    <p>{LINE_COPY.INDEX_RULE}</p>,
  ];
  return (
    <div className="dos legend">
      <p className="blk rail-empty">{LINE_COPY.RAIL_EMPTY}</p>
      <ol className="blk path" aria-label="The path to a Z500 seat">
        {STEPS.map((name, i) => (
          <li key={name} data-step="later">
            <span className="pm" aria-hidden />
            <span className="meta pn">{String(i + 1).padStart(2, "0")}</span>
            <span className="meta pname">{name}</span>
            <div className="pd">{rules[i]}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------- Head */

function Head({
  row,
  src,
  w,
  starred,
  onStar,
  onHide,
  onClose,
}: {
  row: TrendingRow;
  src?: string;
  w: Window;
  starred: boolean;
  onStar: () => void;
  onHide: () => void;
  onClose?: () => void;
}) {
  const t = row.ticker;
  const price = useLiveCell(t, w, "price", fmt.price);
  const chg = useLiveCell(t, w, "change", fmt.pct);
  const since = useSinceLaunch(t, w);
  const g = TIER_GLYPH[row.tier];
  return (
    <header className="blk dh">
      <div className="d1">
        <CoinAvatar ticker={t} src={src} size={32} />
        <div className="did">
          <div className="dtl">
            <span className="dt">${t}</span>
            <GlyphBadge cls={g.cls} box={g.box} label={row.tier} />
          </div>
          <span className="nm cased" title={row.name}>
            {row.name}
          </span>
        </div>
        <div className="dact">
          <button type="button" className="meta dbtn" aria-pressed={starred} onClick={onStar}>
            {starred ? "Starred" : "Star"}
          </button>
          <button type="button" className="meta dbtn" onClick={onHide}>
            Hide
          </button>
          {onClose && (
            <button type="button" className="dclose" aria-label="Close the dossier" onClick={onClose}>
              <CloseMark className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="d2">
        <span ref={price.ref} {...price.data} className="num dp" title={row.real ? LABELS.REAL_TITLE : undefined}>
          {price.text}
        </span>
        <span
          ref={chg.ref}
          {...chg.data}
          className="num dp sg"
          title={chg.text === fmt.NULL ? (row.real ? LABELS.NOT_INDEXED : LABELS.CHANGE_NULL_TITLE) : undefined}
        >
          {chg.text}
        </span>
        <span className="meta" title={since ? LABELS.SINCE_LAUNCH_TITLE : undefined}>
          {since ? LABELS.SINCE_LAUNCH : w}
        </span>
        {row.seat && <SeatBadge seat={row.seat} className="dseat" />}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------- Path */

const STEPS = ["Launch", "Curve", "Graduation", "Grace", "Seat", "Index"] as const;

function Path({ row, w }: { row: TrendingRow; w: Window }) {
  const here = pathStep(row);
  const details = [
    <LaunchStep key="1" row={row} />,
    <CurveStep key="2" row={row} w={w} />,
    <GradStep key="3" row={row} />,
    <p key="4">{`${Z500.graceHours}h after graduation`}</p>,
    <SeatStep key="5" row={row} w={w} />,
    <IndexStep key="6" row={row} w={w} />,
  ];
  return (
    <ol className="blk path" aria-label="Path to a Z500 seat">
      {STEPS.map((name, i) => {
        const n = i + 1;
        const state = n < here ? "done" : n === here ? "here" : "later";
        return (
          <li key={name} data-step={state} aria-current={state === "here" ? "step" : undefined}>
            <span className="pm" aria-hidden>
              {state === "done" ? <CheckMark className="pchk" /> : state === "here" ? <span className="node-sq here" /> : null}
            </span>
            <span className="meta pn">{String(n).padStart(2, "0")}</span>
            <span className="meta pname">{name}</span>
            <div className="pd">{details[i]}</div>
          </li>
        );
      })}
    </ol>
  );
}

function LaunchStep({ row }: { row: TrendingRow }) {
  return (
    <>
      <p>
        <span className="only-chain1">
          <span className="num fig">{LAUNCH_COST.airdropBuySol} SOL</span> airdrop buy
        </span>
        <span className="only-chain2">
          <span className="num fig">{LAUNCH_COST.airdropBuyEth} ETH</span> airdrop buy
        </span>{" "}
        <span className="meta">{LABELS.AS_DOCUMENTED}</span>
      </p>
      <p>{LABELS.AIRDROP_RESERVE}</p>
      {row.migrated && (
        <p>
          Airdropped <span className="num fig">{fmt.usd(row.airdroppedUsd)}</span>{" "}
          <span className="meta" title={LINE_COPY.AIRDROP_TITLE}>
            {LABELS.AUDIT_HEAD}
          </span>
        </p>
      )}
    </>
  );
}

function CurveStep({ row, w }: { row: TrendingRow; w: Window }) {
  if (row.migrated) return <p>Completed</p>;
  if (row.real) return <RealCurve row={row} w={w} />;
  if (row.tier === "Fortress") return <FortressCurve row={row} w={w} />;
  return (
    <>
      <div className="dbar">
        <FlatCurveBar curve={row.curve} migrated={false} tier={row.tier} trusted={row.curveTrusted} untrusted="hatch" height={4} />
      </div>
      <p>
        <span className="num fig">{curvePct(row.curve)}</span> · {LINE_COPY.ROSTER_TAG}
      </p>
      <p className="dim">{LABELS.CURVE_CAVEAT}</p>
    </>
  );
}

function RealCurve({ row, w }: { row: TrendingRow; w: Window }) {
  const c = useLiveCell(row.ticker, w, "curve", curvePct, { flash: false });
  return (
    <p>
      <span ref={c.ref} {...c.data} className="num fig">
        {c.text}
      </span>{" "}
      <span className="meta" title={LABELS.REAL_TITLE}>
        {LABELS.REAL}
      </span>
    </p>
  );
}

/** The one curve the page can vouch for: a Fortress curve is read off
 *  market cap, $100K to $1M, so it moves with the simulated cap. The SOL
 *  figure is arithmetic on the curve, not a documented fill, and says
 *  so; it is network 1's unit, so network 2 doesn't print it. */
function FortressCurve({ row, w }: { row: TrendingRow; w: Window }) {
  const t = row.ticker;
  const bar = useLiveValue<HTMLDivElement>(t, w, "curve", (el, v) => {
    const f = el.querySelector<HTMLElement>("[data-trusted] > div");
    if (f && v !== null) f.style.width = `${Math.min(99, v)}%`;
  });
  const mc = useLiveCell(t, w, "mc", fmt.usdLike(row.mcLabel));
  const sol = useLiveCell(t, w, "curve", (v) => fmt.count(v === null ? null : Math.round((v / 100) * FORTRESS.graduateSol)), {
    flash: false,
  });
  return (
    <>
      <div ref={bar.ref} className="dbar">
        <FlatCurveBar curve={bar.value ?? row.curve} migrated={false} tier="Fortress" trusted height={4} />
      </div>
      <p>
        <span ref={mc.ref} {...mc.data} className="num fig">
          {mc.text}
        </span>{" "}
        of {fmt.usd(FORTRESS.openMcapUsd)} → {fmt.usd(FORTRESS.graduateMcapUsd)}
      </p>
      <p className="only-chain1">
        ≈{" "}
        <span ref={sol.ref} {...sol.data} className="num fig">
          {sol.text}
        </span>{" "}
        of {fmt.count(FORTRESS.graduateSol)} SOL{" "}
        <span className="meta tiph" title={LINE_COPY.DERIVED_SOL_TITLE}>
          {LINE_COPY.DERIVED_SOL}
        </span>
      </p>
    </>
  );
}

function GradStep({ row }: { row: TrendingRow }) {
  if (row.migrated) return <p>Graduated</p>;
  if (row.tier === "Fortress") return <p>At a {fmt.usd(FORTRESS.graduateMcapUsd)} market cap</p>;
  return <p>When the curve completes</p>;
}

function SeatStep({ row, w }: { row: TrendingRow; w: Window }) {
  const seat = row.seat;
  if (seat) {
    return (
      <>
        <p className="srow">
          <SeatBadge seat={seat} />
          {seat.weeksSeated !== null && (
            <span>
              Seated <span className="num fig">{seat.weeksSeated}w</span>
            </span>
          )}
        </p>
        {row.fixes.includes("D10") && <p className="rim">{LINE_COPY.D10_NOTE}</p>}
      </>
    );
  }
  if (row.migrated) return <p className="dim">{seatState(row).sentence}</p>;
  if (row.tier !== "Free") return <p>{ROUTES.find((r) => r.id === row.tier)?.how}</p>;
  return <MeritSeat row={row} w={w} />;
}

function MeritSeat({ row, w }: { row: TrendingRow; w: Window }) {
  const liq = useLiveCell(row.ticker, w, "liquidity", fmt.usd);
  const mark = useLiveValue<HTMLSpanElement>(row.ticker, w, "liquidity", (el, v) => {
    const g = gateAttr(meritGates(row, v).liq.ok);
    if (el.dataset.gate !== g) el.dataset.gate = g;
  });
  const g = meritGates(row, mark.value);
  const nullTitle = row.real ? LABELS.NOT_INDEXED : undefined;
  return (
    <>
      <p>Merit route</p>
      <p className="gline">
        Holders{" "}
        <span className="num fig" title={g.holders.v === null ? nullTitle : undefined} data-sign={g.holders.v === null ? "null" : "pos"}>
          {fmt.count(g.holders.v)}
        </span>{" "}
        / {fmt.count(Z500.minHolders)}
        <span className="gm" data-gate={gateAttr(g.holders.ok)} />
      </p>
      <p className="gline">
        Liquidity{" "}
        <span ref={liq.ref} {...liq.data} className="num fig" title={liq.text === fmt.NULL ? nullTitle : undefined}>
          {liq.text}
        </span>{" "}
        / {fmt.usd(Z500.minLiquidityUsd)}
        <span ref={mark.ref} className="gm" data-gate={gateAttr(g.liq.ok)} />
      </p>
      <p>then a score of {Z500.bar} at a reconstitution</p>
    </>
  );
}

function IndexStep({ row, w }: { row: TrendingRow; w: Window }) {
  /* The sentence follows the simulated cap, as the row's state cell
     does, so the rail and the row never disagree about the floor. */
  const s0 = useLiveValue<HTMLParagraphElement>(row.ticker, w, "mc", (el, v) => {
    const s = seatState(row, v ?? row.mcUsd);
    if (el.textContent !== s.sentence) el.textContent = s.sentence;
    if (el.dataset.tone !== s.tone) el.dataset.tone = s.tone;
  });
  const s = seatState(row, s0.value ?? row.mcUsd);
  if (!row.seat) {
    return (
      <p ref={s0.ref} className="dim">
        {s.sentence}
      </p>
    );
  }
  return (
    <>
      {row.seat.scored && (
        <div className="dscore">
          <ScoreBar seat={row.seat} size="lg" />
        </div>
      )}
      <p ref={s0.ref} data-tone={s.tone}>
        {s.sentence}
      </p>
    </>
  );
}

/* ------------------------------------------------------------ Stats */

const STAT_ROWS: { label: string; cell: Cell; format: (v: number | null) => string; signed?: boolean }[] = [
  { label: "Trades", cell: "txns", format: fmt.count },
  { label: "Volume", cell: "volume", format: fmt.usd },
  { label: "Buys", cell: "buys", format: fmt.count },
  { label: "Sells", cell: "sells", format: fmt.count },
  { label: "Net flow", cell: "netFlow", format: fmt.usd, signed: true },
  { label: "Buyers", cell: "buyers", format: fmt.count },
  { label: "Sellers", cell: "sellers", format: fmt.count },
];

function Stats({ row, w }: { row: TrendingRow; w: Window }) {
  return (
    <div className="blk">
      <table className="stats">
        <colgroup>
          <col className="sl" />
          {WINDOWS.map((x) => (
            <col key={x} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Figure</span>
            </th>
            {WINDOWS.map((x) => (
              <WinHead key={x} ticker={row.ticker} w={x} on={x === w} />
            ))}
          </tr>
        </thead>
        <tbody>
          {STAT_ROWS.map((r) => (
            <tr key={r.cell}>
              <th scope="row" className="meta">
                {r.label}
              </th>
              {WINDOWS.map((x) => (
                <StatCell key={x} row={row} w={x} on={x === w} cell={r.cell} format={r.format} signed={r.signed} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WinHead({ ticker, w, on }: { ticker: string; w: Window; on: boolean }) {
  const since = useSinceLaunch(ticker, w);
  return (
    <th scope="col" className={cx("meta", on && "on")} title={since ? LABELS.SINCE_LAUNCH_TITLE : undefined}>
      {since ? LABELS.SINCE_LAUNCH : w}
    </th>
  );
}

function StatCell({
  row,
  w,
  on,
  cell,
  format,
  signed,
}: {
  row: TrendingRow;
  w: Window;
  on: boolean;
  cell: Cell;
  format: (v: number | null) => string;
  signed?: boolean;
}) {
  /* Only the current window's column flashes. The others still tick,
     quietly: they are context, and a wash on them would pull the eye
     off the column the board is showing. */
  const c = useLiveCell(row.ticker, w, cell, format, { flash: on });
  return (
    <td className={cx(on && "on")}>
      <span
        ref={c.ref}
        {...c.data}
        className={cx("num", signed && "sg")}
        title={c.text === fmt.NULL ? (row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE) : undefined}
      >
        {c.text}
      </span>
    </td>
  );
}

/* ----------------------------------------------------------- Market */

function Market({ row, w }: { row: TrendingRow; w: Window }) {
  const t = row.ticker;
  const mc = useLiveCell(t, w, "mc", fmt.usdLike(row.mcLabel));
  const liq = useLiveCell(t, w, "liquidity", fmt.usd);
  const age = useLiveCell(t, w, "age", fmt.ageLike(row.ageLabel));
  const ath = fmt.pct(row.fromAthPct);
  const nt = row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE;
  return (
    <dl className="blk rules">
      <div>
        <dt className="meta">Mcap</dt>
        <dd>
          <span ref={mc.ref} {...mc.data} className="num">
            {mc.text}
          </span>
        </dd>
      </div>
      <div>
        <dt className="meta">Liq</dt>
        <dd>
          <span ref={liq.ref} {...liq.data} className="num" title={liq.text === fmt.NULL ? nt : undefined}>
            {liq.text}
          </span>
        </dd>
      </div>
      <div>
        <dt className="meta">From ATH</dt>
        <dd>
          <span className="num sg" data-sign={signOf(row.fromAthPct, ath)} title={ath === fmt.NULL ? nt : undefined}>
            {ath}
          </span>
        </dd>
      </div>
      <div>
        <dt className="meta">Age</dt>
        <dd>
          <span ref={age.ref} {...age.data} className="num">
            {age.text}
          </span>
        </dd>
      </div>
    </dl>
  );
}

/* ---------------------------------------------------------- Fixture */

function Fixture({ row }: { row: TrendingRow }) {
  const nt = row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE;
  const items: { label: string; text: string; tone: "bone" | "rim" | "dim"; title?: string }[] = [
    {
      label: "Holders",
      text: fmt.count(row.holders),
      tone: row.holders === null ? "dim" : "bone",
      title: row.holders === null ? nt : undefined,
    },
    audit("Top 10", "top10", row.top10Pct, row.top10Hidden ? LABELS.TOP10_HIDDEN : nt),
    audit("Dev", "dev", row.devPct, nt),
    audit("Snipers", "snipers", row.snipersPct, nt),
    audit("Bundlers", "bundlers", row.bundlersPct, nt),
  ];
  return (
    <div className="blk fixture">
      <AuditDefTip className="fxh" align="start" />
      <dl className="rules">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="meta">{it.label}</dt>
            <dd>
              <span className="num" data-tone={it.tone} title={it.title}>
                {it.text}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A share's tone. Warn is rim and anything under it bone; the bad
 *  step isn't drawn, because nothing in the fixtures reaches it and a
 *  red that never shows would imply the board was checked for it. */
function audit(label: string, kind: "top10" | "dev" | "snipers" | "bundlers", v: number | null, nullTitle: string) {
  const band = auditBand(kind, v);
  return {
    label,
    text: fmt.share(v),
    tone: band === null ? ("dim" as const) : band === "ok" ? ("bone" as const) : ("rim" as const),
    title: v === null ? nullTitle : undefined,
  };
}

/* ------------------------------------------------------------- Mint */

function Mint({ row }: { row: TrendingRow }) {
  const toast = useToast();
  const short = `${row.mint.slice(0, 4)}…${row.mint.slice(-4)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(row.mint);
      toast({ title: row.mintResolves ? LINE_COPY.COPIED_REAL : LINE_COPY.COPIED, tone: "info" });
    } catch {
      toast({ title: "Not copied: the browser blocked the clipboard.", tone: "fail" });
    }
  };
  return (
    <div className="blk mint">
      <span className="meta">Mint</span>
      <span className="only-chain1">
        <span className="mrow">
        <span className="num" title={row.mintResolves ? row.mint : LABELS.MINT_PLACEHOLDER}>
          {short}
        </span>
        <button type="button" className="icn" aria-label={`Copy the mint address of $${row.ticker}`} onClick={copy}>
          <CopyMark className="h-3.5 w-3.5" />
        </button>
        {row.mintResolves && (
          <a
            className="icn"
            href={`https://solscan.io/token/${row.mint}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`$${row.ticker} on Solscan`}
          >
            <SolscanMark className="h-3.5 w-3.5" />
          </a>
        )}
      </span>
      </span>
      <span className="only-chain2 n2">{LABELS.NET2_MINT}</span>
    </div>
  );
}

/* -------------------------------------------------------------- Buy */

/** The dossier's buy acts on the dossier's coin, never on whatever row
 *  the pointer crossed on the way here. Both networks are rendered and
 *  the cascade shows one, so the first paint on network 2 already
 *  prices in ETH. */
function Buy({ ticker, qb }: { ticker: string; qb: QbPair }) {
  const buy = usePlaceholderBuy();
  const one = (chain: 1 | 2) => {
    const { amount, unit } = qb[chain];
    return (
      <div className="dbuy">
        <div className="dbr">
          <button
            type="button"
            className="dbuyk"
            title={LABELS.QB_TITLE}
            aria-label={`Buy ${amountText(amount)} ${unit} of $${ticker}. ${LABELS.QB_TITLE}`}
            onClick={() => buy(ticker, amount, unit)}
          >
            Buy {amountText(amount)} {unit}
          </button>
          <span className="meta" title={LABELS.QB_TITLE}>
            {LABELS.QB_TAG}
          </span>
        </div>
        <span className="meta">{LABELS.USD_EQ(fmt.usd(quickBuy(chain).toUsd(amount)))}</span>
      </div>
    );
  };
  return (
    <div className="blk">
      <div className="only-chain1">{one(1)}</div>
      <div className="only-chain2">{one(2)}</div>
    </div>
  );
}
