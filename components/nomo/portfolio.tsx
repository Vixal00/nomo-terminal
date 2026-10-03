"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowDownLeft, ArrowRight, ArrowUpRight, CaretDown, ChartLine, ClockCounterClockwise, Coins, Info, MagnifyingGlass, Wallet, X } from "@phosphor-icons/react";
import { compact, priceText, type Token } from "./data";
import { TokenAvatar } from "./shared";
import { UsdcIcon } from "./brand-icons";
import type { PreviewWallet } from "./wallet";
import "./portfolio.css";

type Period = "24h" | "7d" | "30d" | "All";
type PortfolioView = "Open positions" | "Closed positions" | "History";
type Position = { token: Token; amount: number; entry: number; openedHours: number; value: number; cost: number; pnl: number; returnPct: number };
type ClosedPosition = { token: Token; amount: number; entry: number; exit: number; openedHours: number; closedHours: number; cost: number; proceeds: number; pnl: number; returnPct: number };
type HistoryRow = { id: string; token?: Token; type: "Buy" | "Sell" | "Funding"; amount: number; value: number; hours: number; pnl?: number };
const PERIODS: Period[] = ["24h", "7d", "30d", "All"];
const HOURS: Record<Period, number> = { "24h": 24, "7d": 168, "30d": 720, All: 168 };
const OPEN_BASIS: Record<string, { entry: number; hours: number }> = { nearly: { entry: .0032, hours: 12 }, sight: { entry: .001, hours: 8 } };
// A local illustrative ledger, separate from any executed transaction or wallet provider.
const CLOSED_EXAMPLES = [
  { id: "wave", amount: 120000, entry: .0009, exit: .00102, openedHours: 32, closedHours: 4 },
  { id: "orbit", amount: 80000, entry: .00005, exit: .000039, openedHours: .8, closedHours: .4 },
  { id: "solar", amount: 100000, entry: .000205, exit: .000268, openedHours: 7, closedHours: 2 },
  { id: "nomo", amount: 40000, entry: .0013, exit: .00169, openedHours: 120, closedHours: 72 },
];
const dollars = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedDollars = (value: number) => `${value >= 0 ? "+" : "−"}${dollars(Math.abs(value))}`;
const signedPercent = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
const quantity = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const tone = (value: number) => value >= 0 ? "pf-positive" : "pf-negative";
const ago = (hours: number) => hours <= 0 ? "Now" : hours < 1 ? `${Math.max(1, Math.round(hours * 60))}m ago` : hours < 24 ? `${Math.round(hours)}h ago` : `${Math.round(hours / 24)}d ago`;

function sampleBook(tokens: Token[], wallet: PreviewWallet) {
  const positions: Position[] = tokens.filter(token => wallet.tokenBalance(token.id) > 0).map(token => {
    const amount = wallet.tokenBalance(token.id);
    const entry = OPEN_BASIS[token.id]?.entry ?? token.price;
    const cost = amount * entry;
    const value = amount * token.price;
    return { token, amount, entry, openedHours: OPEN_BASIS[token.id]?.hours ?? 1, cost, value, pnl: value - cost, returnPct: cost ? (value - cost) / cost * 100 : 0 };
  });
  const closed: ClosedPosition[] = CLOSED_EXAMPLES.flatMap(example => {
    const token = tokens.find(item => item.id === example.id);
    if (!token) return [];
    const cost = example.amount * example.entry;
    const proceeds = example.amount * example.exit;
    return [{ ...example, token, cost, proceeds, pnl: proceeds - cost, returnPct: (proceeds - cost) / cost * 100 }];
  });
  const deployed = positions.reduce((sum, item) => sum + item.value, 0);
  const cost = positions.reduce((sum, item) => sum + item.cost, 0);
  const realized = closed.reduce((sum, item) => sum + item.pnl, 0);
  const unrealized = deployed - cost;
  const total = wallet.balance + deployed;
  const capital = wallet.balance + cost - realized;
  const history: HistoryRow[] = [
    { id: "sample-funding", type: "Funding" as const, amount: capital, value: capital, hours: 144 },
    ...positions.map(item => ({ id: `${item.token.id}-sample-open`, token: item.token, type: "Buy" as const, amount: item.amount, value: item.cost, hours: item.openedHours })),
    ...closed.flatMap(item => [
      { id: `${item.token.id}-sample-buy`, token: item.token, type: "Buy" as const, amount: item.amount, value: item.cost, hours: item.openedHours },
      { id: `${item.token.id}-sample-sell`, token: item.token, type: "Sell" as const, amount: item.amount, value: item.proceeds, hours: item.closedHours, pnl: item.pnl },
    ]),
  ].sort((a, b) => a.hours - b.hours);
  return { positions, closed, deployed, realized, unrealized, total, capital, history };
}

function PortfolioChart({ book, period }: { book: ReturnType<typeof sampleBook>; period: Period }) {
  const [metric, setMetric] = useState<"value" | "pnl">("pnl");
  const [hovered, setHovered] = useState<number | null>(null);
  const id = useId();
  const points = useMemo(() => Array.from({ length: 97 }, (_, index) => {
    const hours = HOURS[period] * (1 - index / 96);
    let cash = book.capital;
    let held = 0;
    const mark = (entry: number, exit: number, progress: number) => entry + (exit - entry) * (progress + Math.sin(progress * Math.PI * 3) * Math.sin(progress * Math.PI) * .065);
    for (const item of book.positions) {
      if (hours > item.openedHours) continue;
      cash -= item.cost;
      held += item.amount * mark(item.entry, item.token.price, 1 - hours / item.openedHours);
    }
    for (const item of book.closed) {
      if (hours > item.openedHours) continue;
      cash -= item.cost;
      if (hours <= item.closedHours) cash += item.proceeds;
      else held += item.amount * mark(item.entry, item.exit, (item.openedHours - hours) / (item.openedHours - item.closedHours));
    }
    return { hours, value: cash + held };
  }), [book, period]);
  const values = points.map(point => point.value - (metric === "pnl" ? book.capital : 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 2);
  const low = min - spread * .16;
  const high = max + spread * .18;
  const left = 4, right = 688, top = 9, bottom = 177;
  const x = (index: number) => left + index / (points.length - 1) * (right - left);
  const y = (value: number) => bottom - (value - low) / (high - low) * (bottom - top);
  const line = values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
  const active = hovered === null ? points.length - 1 : Math.max(0, Math.min(points.length - 1, hovered));
  const activePoint = points[active];
  const change = points.at(-1)!.value - points[0].value;
  const getPointerIndex = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const plotX = (clientX - rect.left) / rect.width * 768;
    return Math.max(0, Math.min(points.length - 1, Math.round((plotX - left) / (right - left) * (points.length - 1))));
  };
  return <section className="pf-chart" aria-label="Portfolio performance">
    <div className="pf-chart-head"><div className="pf-chart-metrics" role="group" aria-label="Chart metric"><button type="button" aria-pressed={metric === "value"} onClick={() => { setMetric("value"); setHovered(null); }}>Portfolio value</button><button type="button" aria-pressed={metric === "pnl"} onClick={() => { setMetric("pnl"); setHovered(null); }}>P&L</button></div><span>USD</span></div>
    <div className="pf-chart-reading"><div><strong>{dollars(activePoint.value - (metric === "pnl" ? book.capital : 0))}</strong><span>{hovered === null ? "Current value" : ago(activePoint.hours)}</span></div><span className={tone(change)}>{signedDollars(change)}<small>in {period === "All" ? "all time" : period}</small></span></div>
    <div className="pf-chart-plot" tabIndex={0} role="slider" aria-label="Inspect portfolio history" aria-valuemin={0} aria-valuemax={points.length - 1} aria-valuenow={active} aria-valuetext={`${ago(activePoint.hours)}, ${metric === "pnl" ? "P&L" : "portfolio value"} ${dollars(values[active])}`} onPointerMove={event => setHovered(getPointerIndex(event.clientX, event.currentTarget))} onPointerLeave={() => setHovered(null)} onBlur={() => setHovered(null)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      setHovered(event.key === "Home" ? 0 : event.key === "End" ? points.length - 1 : Math.max(0, Math.min(points.length - 1, active + (event.key === "ArrowLeft" ? -1 : 1))));
    }}>
      <svg viewBox="0 0 768 201" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a5bb90" stopOpacity=".1" /><stop offset="100%" stopColor="#a5bb90" stopOpacity="0" /></linearGradient></defs>{[0, .5, 1].map(ratio => <g key={ratio}><line x1={left} x2={right} y1={top + ratio * (bottom - top)} y2={top + ratio * (bottom - top)} stroke="#27272b" strokeDasharray="3 5" /><text x="707" y={top + ratio * (bottom - top) + 4}>{dollars(high - ratio * (high - low))}</text></g>)}<path d={`${line} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#${id}-area)`} /><path d={line} fill="none" stroke="#b5c6a5" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />{hovered !== null && <g><line x1={x(active)} x2={x(active)} y1={top} y2={bottom} stroke="#737b6c" strokeDasharray="3 4" /><circle cx={x(active)} cy={y(values[active])} r="3" fill="#d6dfcb" stroke="#171719" strokeWidth="2" /></g>}{[0, 24, 48, 72, 96].map(index => <text key={index} x={x(index)} y="198" textAnchor={index === 0 ? "start" : index === 96 ? "end" : "middle"}>{ago(points[index].hours)}</text>)}</svg>
    </div><p className="pf-chart-note">Hover or use the arrow keys to inspect.</p>
  </section>;
}

function AssetName({ token, amount, onSelect }: { token: Token; amount?: number; onSelect: (token: Token) => void }) {
  return <button type="button" className="pf-asset-name" onClick={() => onSelect(token)}><TokenAvatar token={token} size={30} variant="square" /><span><strong>{token.symbol}</strong><small>{amount === undefined ? token.name : `${quantity(amount)} ${token.symbol}`}</small></span></button>;
}

export function PortfolioWorkspace({ tokens, wallet, onSelect }: { tokens: Token[]; wallet: PreviewWallet; onSelect: (token: Token) => void }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [view, setView] = useState<PortfolioView>("Open positions");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"value" | "pnl">("pnl");
  const [activityType, setActivityType] = useState<"All" | HistoryRow["type"]>("All");
  const id = useId();
  const book = sampleBook(tokens, wallet);
  const closed = book.closed.filter(item => item.closedHours <= HOURS[period]);
  const history = book.history.filter(item => item.hours <= HOURS[period]);
  const needle = query.trim().toLowerCase();
  const matches = (token?: Token) => (token ? `${token.symbol} ${token.name}` : "USDC funding").toLowerCase().includes(needle);
  const shownOpen = book.positions.filter(item => matches(item.token)).sort((a, b) => sort === "value" ? b.value - a.value : b.pnl - a.pnl);
  const shownClosed = closed.filter(item => matches(item.token)).sort((a, b) => sort === "value" ? b.proceeds - a.proceeds : b.pnl - a.pnl);
  const shownHistory = history.filter(item => matches(item.token) && (activityType === "All" || item.type === activityType));
  const count = view === "Open positions" ? shownOpen.length : view === "Closed positions" ? shownClosed.length : shownHistory.length;
  const pnl = book.realized + book.unrealized;
  const returnPct = book.capital ? pnl / book.capital * 100 : 0;
  const allocation = [{ id: "usdc", name: "USDC", value: wallet.balance, color: "#8c939e", token: undefined as Token | undefined }, ...book.positions.map((item, index) => ({ id: item.token.id, name: item.token.symbol, value: item.value, color: index === 0 ? "#c5cfb5" : "#839c83", token: item.token }))];
  const wins = book.closed.filter(item => item.pnl > 0).length;
  const losses = book.closed.filter(item => item.pnl < 0).length;
  const best = [...book.positions].sort((a, b) => b.returnPct - a.returnPct)[0];

  return <main className="pf-main"><header className="pf-page-head"><div><h1>Portfolio</h1><p>Your positions, with the whole picture in view.</p></div><span className="pf-account-tag"><span />My portfolio</span></header>
    {!wallet.connected ? <section className="pf-disconnected"><Wallet size={26} aria-hidden="true" /><h2>Your portfolio is closed</h2><p>Explore your holdings, performance, and history.</p><button className="pf-primary" type="button" onClick={wallet.connect}>Open portfolio<ArrowRight size={14} /></button></section> : <>
      <section className="pf-overview" aria-label="Portfolio overview"><div className="pf-total"><span>Total portfolio value</span><strong>{dollars(book.total)}</strong><span className={tone(pnl)}>{signedDollars(pnl)}<small>{signedPercent(returnPct)} all time</small></span></div><div className="pf-overview-stat"><span><Coins size={13} />Available USDC</span><strong>{dollars(wallet.balance)}</strong><small>{(wallet.balance / book.total * 100).toFixed(1)}% of portfolio</small></div><div className="pf-overview-stat"><span><ChartLine size={13} />Open position value</span><strong>{dollars(book.deployed)}</strong><small>{book.positions.length} open token positions</small></div><div className="pf-overview-stat"><span><ArrowUpRight size={13} />Unrealized P&L</span><strong className={tone(book.unrealized)}>{signedDollars(book.unrealized)}</strong><small>Against your cost basis</small></div></section>
      <div className="pf-workspace"><div className="pf-primary-column"><div className="pf-history-toolbar"><span><ChartLine size={14} />Performance</span><div role="group" aria-label="Portfolio history timeframe">{PERIODS.map(item => <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><PortfolioChart key={period} book={book} period={period} />
        <section className="pf-positions" aria-label="Portfolio positions and history"><div className="pf-positions-tabs" role="group" aria-label="Portfolio view">{(["Open positions", "Closed positions", "History"] as PortfolioView[]).map(item => <button type="button" key={item} aria-pressed={view === item} onClick={() => { setView(item); setQuery(""); }}>{item === "History" && <ClockCounterClockwise size={13} />}{item}<small>{item === "Open positions" ? book.positions.length : item === "Closed positions" ? closed.length : history.length}</small></button>)}</div>
          <div className="pf-table-tools"><label className="pf-search" htmlFor={`${id}-search`}><MagnifyingGlass size={13} /><input id={`${id}-search`} aria-label="Search portfolio by token name or symbol" value={query} placeholder="Search your tokens" onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear portfolio search" onClick={() => setQuery("")}><X size={12} /></button>}</label>{view === "History" ? <label className="pf-select"><span>Type</span><select value={activityType} aria-label="Filter history by type" onChange={event => setActivityType(event.target.value as typeof activityType)}><option>All</option><option>Buy</option><option>Sell</option><option>Funding</option></select><CaretDown size={11} /></label> : <label className="pf-select"><span>Sort by</span><select value={sort} aria-label="Sort positions" onChange={event => setSort(event.target.value as typeof sort)}><option value="value">Value</option><option value="pnl">P&L</option></select><CaretDown size={11} /></label>}<span className="pf-view-note">{view === "Open positions" ? "Current holdings" : `${period === "All" ? "All" : period} ${view === "History" ? "activity" : "positions"}`}</span></div>
          <div className="pf-table-scroll" role="region" aria-label={`${view} table`} tabIndex={0}>
            {view === "Open positions" ? <table className="pf-table"><thead><tr><th>Token / balance</th><th>Price / entry</th><th>Value</th><th>Unrealized P&L</th><th>Allocation</th><th aria-label="Actions" /></tr></thead><tbody>{shownOpen.map(item => <tr key={item.token.id}><td><AssetName token={item.token} amount={item.amount} onSelect={onSelect} /></td><td>{priceText(item.token.price)}<small>Entry {priceText(item.entry)}</small></td><td><strong>{dollars(item.value)}</strong><small>{dollars(item.cost)} cost basis</small></td><td className={tone(item.pnl)}><strong>{signedDollars(item.pnl)}</strong><small>{signedPercent(item.returnPct)}</small></td><td><span className="pf-position-allocation">{(item.value / book.total * 100).toFixed(1)}%<span><i style={{ width: `${Math.max(3, item.value / book.total * 100)}%` }} /></span></span></td><td><button className="pf-trade-link" type="button" onClick={() => onSelect(item.token)} aria-label={`Trade ${item.token.symbol} in token workspace`}>Trade<ArrowUpRight size={12} /></button></td></tr>)}</tbody></table> : view === "Closed positions" ? <table className="pf-table"><thead><tr><th>Token</th><th>Entry / exit</th><th>Cost / proceeds</th><th>Realized P&L</th><th>Closed</th><th aria-label="Actions" /></tr></thead><tbody>{shownClosed.map(item => <tr key={item.token.id}><td><AssetName token={item.token} amount={item.amount} onSelect={onSelect} /></td><td>{priceText(item.entry)}<small>Exit {priceText(item.exit)}</small></td><td><strong>{dollars(item.proceeds)}</strong><small>{dollars(item.cost)} cost basis</small></td><td className={tone(item.pnl)}><strong>{signedDollars(item.pnl)}</strong><small>{signedPercent(item.returnPct)}</small></td><td className="pf-time-cell">{ago(item.closedHours)}</td><td><button className="pf-trade-link" type="button" onClick={() => onSelect(item.token)} aria-label={`View ${item.token.symbol} market`}>View<ArrowUpRight size={12} /></button></td></tr>)}</tbody></table> : <table className="pf-table pf-history-table"><thead><tr><th>Asset</th><th>Activity</th><th>Quantity</th><th>Value</th><th>Realized P&L</th><th>Time</th></tr></thead><tbody>{shownHistory.map(item => <tr key={item.id}><td>{item.token ? <AssetName token={item.token} onSelect={onSelect} /> : <div className="pf-cash-asset"><UsdcIcon size={29} /><span><strong>USDC</strong><small>Initial capital</small></span></div>}</td><td><span className={`pf-history-type pf-type-${item.type.toLowerCase()}`}>{item.type === "Sell" ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}{item.type}</span></td><td>{quantity(item.amount)}<small>{item.token?.symbol || "USDC"}</small></td><td><strong>{dollars(item.value)}</strong></td><td className={item.pnl === undefined ? "" : tone(item.pnl)}>{item.pnl === undefined ? "—" : signedDollars(item.pnl)}</td><td className="pf-time-cell">{ago(item.hours)}</td></tr>)}</tbody></table>}
          </div>{count === 0 && <div className="pf-empty"><MagnifyingGlass size={21} /><h3>No matching {view === "History" ? "activity" : "positions"}</h3><p>Try another token or adjust the selected filters.</p><button className="pf-secondary" type="button" onClick={() => { setQuery(""); setActivityType("All"); setPeriod("All"); }}>Reset filters</button></div>}

        </section>
      </div><aside className="pf-sidebar" aria-label="Portfolio allocation and performance"><section className="pf-allocation"><div className="pf-section-head"><h2>Allocation</h2><span>{allocation.length} assets</span></div><div className="pf-allocation-bar" aria-label="Portfolio asset allocation">{allocation.map(item => <span key={item.id} style={{ width: `${item.value / book.total * 100}%`, background: item.color }} title={`${item.name}: ${(item.value / book.total * 100).toFixed(1)}%`} />)}</div><div className="pf-allocation-list">{allocation.map(item => <div key={item.id}><span className="pf-allocation-label"><i style={{ background: item.color }} />{item.token ? <TokenAvatar token={item.token} size={23} variant="square" /> : <UsdcIcon size={23} />}<span><strong>{item.name}</strong><small>{item.id === "usdc" ? "Available balance" : "Open position"}</small></span></span><span><strong>{(item.value / book.total * 100).toFixed(1)}%</strong><small>{dollars(item.value)}</small></span></div>)}</div><p>{(wallet.balance / book.total * 100).toFixed(1)}% of your portfolio is held in USDC.</p></section>
        <section className="pf-performance"><div className="pf-section-head"><h2>Performance</h2><span>All time</span></div><dl><div><dt>Realized P&L</dt><dd className={tone(book.realized)}>{signedDollars(book.realized)}</dd></div><div><dt>Unrealized P&L</dt><dd className={tone(book.unrealized)}>{signedDollars(book.unrealized)}</dd></div><div className="pf-performance-total"><dt>Total P&L</dt><dd className={tone(pnl)}>{signedDollars(pnl)}</dd></div><div><dt>Initial capital</dt><dd>{dollars(book.capital)}</dd></div><div><dt>Return on capital</dt><dd className={tone(returnPct)}>{signedPercent(returnPct)}</dd></div></dl><div className="pf-outcomes"><div><strong>{book.closed.length ? (wins / book.closed.length * 100).toFixed(0) : "0"}%</strong><span>Closed win rate</span></div><div><span><i />{wins} winners</span><span><i />{losses} losers</span></div></div></section>
        {best && <section className="pf-top-position"><div className="pf-section-head"><h2>Top open return</h2><ArrowUpRight size={14} /></div><button type="button" onClick={() => onSelect(best.token)} aria-label={`View ${best.token.symbol}, top open return`}><TokenAvatar token={best.token} size={31} variant="square" /><span><strong>{best.token.symbol}</strong><small>{dollars(best.value)} position value</small></span><strong className={tone(best.returnPct)}>{signedPercent(best.returnPct)}</strong></button><p>Return on the position’s cost basis.</p></section>}
      </aside></div>

    </>}
  </main>;
}
