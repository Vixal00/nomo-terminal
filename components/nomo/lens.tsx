"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, ArrowsLeftRight, Bell, CaretDown, ChartBar, ChartLine, Check, Coins, Compass, CopySimple, CurrencyDollar, Drop, Fire, GearSix, MagnifyingGlass, PlusCircle, Question, RocketLaunch, SlidersHorizontal, Star, TrendUp, UserCircle, UsersThree, Wallet, X } from "@phosphor-icons/react";
import { compact, money, percent, priceText, type Token } from "./data";
import { FeedControl, Footer, ProposalSwitch, Sparkline, TokenAvatar, useDiscover, useEntrance } from "./shared";
import { usePreviewWallet, WalletControl, WalletSummary } from "./wallet";
import { TokenDetails, TokenSignals } from "./token-info";
import { LaunchpadIcon, NearIcon, SolanaIcon, UsdcIcon } from "./brand-icons";

type ModalKind = "wallet" | "bridge" | "portfolio" | "pairs" | "order" | "settings" | "help" | null;

function LensModal({ title, identity, close, children }: { title: string; identity: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [close, title, identity]);
  return <div className="lens-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={ref} className="lens-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="lens-modal-heading"><h2>{title}</h2><button type="button" className="lens-icon-button" onClick={close} aria-label="Close dialog"><X size={16} weight="regular" /></button></div>
      {children}
    </div>
  </div>;
}

function DetailChart({ token, time }: { token: Token; time: string }) {
  const raw = time === "5m" ? token.points.slice(-14) : time === "1h" ? token.points.slice(-22) : token.points;
  const min = Math.min(...raw) - 7, max = Math.max(...raw) + 9;
  const coordinates = raw.map((value, i) => [i * 237 / (raw.length - 1), 140 - (value - min) / (max - min) * 135]);
  const line = coordinates.map(([x, y]) => `${x},${y}`).join(" ");
  const last = coordinates[coordinates.length - 1];
  const positive = (time === "5m" ? token.change5m : time === "1h" ? token.change1h : token.change24h) >= 0;
  return <div className={`lens-chart ${positive ? "is-positive" : "is-negative"}`}>
    <svg viewBox="0 0 285 162" role="img" aria-label={`${token.symbol} ${time} price chart`}>
      <defs><linearGradient id={`lens-fill-${token.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".13" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {[20, 65, 110, 150].map((y, index) => <g key={y}><path d={`M0 ${y} H237`} className="lens-chart-grid" /><text x="284" y={y + 3} textAnchor="end">{(token.price * (1.18 - index * .12)).toFixed(token.price < .0001 ? 6 : 5)}</text></g>)}
      {raw.map((v, i) => <rect key={i} x={i * 237 / raw.length} y={150 - ((v * 7 + i * 13) % 17 + 4)} width={Math.max(2, 237 / raw.length - 3)} height={(v * 7 + i * 13) % 17 + 4} fill="currentColor" opacity=".12" />)}
      <polygon points={`0,150 ${line} 237,150`} fill={`url(#lens-fill-${token.id})`} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M0 ${last[1]} H237`} stroke="currentColor" strokeDasharray="2 3" strokeWidth=".7" opacity=".5" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
    <div className="lens-chart-times"><span>{time === "24h" ? "00:00" : time === "1h" ? "14:00" : "14:55"}</span><span>{time === "24h" ? "08:00" : time === "1h" ? "14:20" : "14:57"}</span><span>{time === "24h" ? "16:00" : "15:00"}</span></div>
  </div>;
}

export default function Lens() {
  const d = useDiscover();
  const wallet = usePreviewWallet();
  const entrance = useEntrance(d.feedTick);
  const inspectorRef = useRef<HTMLElement>(null);
  const [nav, setNav] = useState("Discover");
  const [inspectorTab, setInspectorTab] = useState("Overview");
  const [trade, setTrade] = useState("Buy");
  const [amount, setAmount] = useState("25");
  const [modal, setModal] = useState<ModalKind>(null);
  const [walletPending, setWalletPending] = useState(false);
  const [bridgeAmount, setBridgeAmount] = useState("1");
  const [bridgeReverse, setBridgeReverse] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filters, setFilters] = useState(false);
  const [order, setOrder] = useState<{ side: string; symbol: string; amount: number; currency: string } | null>(null);
  const closeModal = useCallback(() => setModal(null), []);
  const token = d.selected;
  const available = trade === "Buy" ? wallet.balance : wallet.tokenBalance(token.id);
  const currency = trade === "Buy" ? "USDC" : token.symbol;
  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const insufficient = validAmount && Number(amount) > available;
  const reviewOrder = () => {
    if (!wallet.connected) { wallet.connect(); return; }
    if (!validAmount || insufficient) return;
    setOrder({ side: trade, symbol: token.symbol, amount: Number(amount), currency });
    setModal("order");
  };
  const formatBalance = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const selectToken = (next: Token) => {
    d.setSelected(next);
    if (window.matchMedia("(max-width: 720px)").matches) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      window.requestAnimationFrame(() => inspectorRef.current?.scrollIntoView({ behavior, block: "start" }));
    }
  };
  const navigate = (next: string) => {
    if (next === "Bridge") { setWalletPending(false); setModal("bridge"); return; }
    if (next === "Portfolio") { setModal("portfolio"); return; }
    if (next === "NEAR pairs") { setModal("pairs"); return; }
    setNav(next); d.setView("Trending");
  };
  const copyToken = async () => {
    try { await navigator.clipboard.writeText(token.symbol); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  };
  return <div className="nomo nomo-lens" ref={entrance}>
    <ProposalSwitch current="lens" />
    <div className="lens-app">
      <aside className="lens-rail" aria-label="Main navigation">
        <a className="lens-mark" href="/" aria-label="Nomo home"><img src="/nomo/nomo-n.svg" alt="" width="30" height="31" /></a>
        <nav>
          {([{ label: "Discover", icon: Compass }, { label: "NEAR pairs", icon: ArrowsLeftRight }, { label: "Portfolio", icon: Wallet }, { label: "Bridge", icon: ArrowUpRight }]).map(({ label, icon: Icon }) => <button key={label} type="button" title={label} aria-label={label} aria-current={nav === label ? "page" : undefined} className={nav === label ? "is-active" : ""} onClick={() => navigate(label)}><Icon size={21} weight={nav === label ? "fill" : "regular"} /><span>{label}</span></button>)}
          <div className="lens-rail-divider" />
          <button type="button" title="Watchlist" aria-label="Watchlist" className={d.view === "Watchlist" ? "is-starred" : ""} onClick={() => d.setView("Watchlist")}><Star size={20} weight={d.view === "Watchlist" ? "fill" : "regular"} /><span>Watchlist</span></button>
        </nav>
        <div className="lens-rail-bottom"><button type="button" title="Workspace settings" aria-label="Workspace settings" onClick={() => setModal("settings")}><GearSix size={20} /></button><button type="button" title="Help" aria-label="Help" onClick={() => setModal("help")}><Question size={20} /></button><span className="lens-profile" role="img" aria-label="Your account"><UserCircle size={24} weight="regular" /></span></div>
      </aside>
      <div className="lens-surface">
        <header className="lens-topbar">
          <div className="lens-breadcrumb"><img src="/nomo/nomo-logo.svg" width="66" height="21" alt="Nomo" /><span className="lens-breadcrumb-divider" /><span>{nav}</span><span className="lens-network"><NearIcon size={11} />NEAR quote</span></div>
          <div className="lens-utilities"><button type="button" className="lens-bridge-link" onClick={() => navigate("Bridge")}><ArrowsLeftRight size={15} weight="regular" />Bridge funds</button><span className="lens-topbar-divider" /><button type="button" className="lens-icon-button lens-notification" title="Price alerts" aria-label="Price alerts" onClick={() => { setWalletPending(false); setModal("wallet"); }}><Bell size={16} weight="regular" /></button><WalletControl wallet={wallet} variant="lens" onPortfolio={() => setModal("portfolio")} /></div>
        </header>
        <div className="lens-workspace">
          <main className="lens-market" data-enter>
            <div className="lens-heading"><div><h1>{nav === "NEAR pairs" ? "NEAR pairs" : "Discover"}</h1><p>Find your next move.</p></div><div className="lens-heading-meta"><FeedControl state={d} /><div className="lens-market-summary"><span>24h volume<strong>{money(d.tokens.reduce((sum, item) => sum + item.volume, 0))}</strong></span><span>New pairs<strong>{d.tokens.filter(item => item.stage === "New").length}</strong></span></div></div></div>
            <div className="lens-view-bar"><div className="lens-view-tabs" role="tablist" aria-label="Markets">{[{ label: "Trending", icon: Fire }, { label: "New pairs", icon: PlusCircle }, { label: "Graduating", icon: RocketLaunch }, { label: "Watchlist", icon: Star }].map(({ label: view, icon: Icon }) => <button type="button" role="tab" aria-selected={d.view === view} key={view} onClick={() => d.setView(view)}><Icon size={14} weight={d.view === view ? "fill" : "regular"} />{view}{view === "Watchlist" && <span>{d.stars.length}</span>}</button>)}</div><button type="button" className={`lens-filter-toggle ${filters ? "is-active" : ""}`} aria-label="Toggle market filters" aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={16} weight="regular" /></button></div>
            <div className="lens-tools"><label className="lens-search"><MagnifyingGlass size={15} weight="regular" /><input type="search" placeholder="Search tokens" aria-label="Search tokens" value={d.search} onChange={e => d.setSearch(e.target.value)} /></label><div className="lens-time" aria-label="Change timeframe">{["5m", "1h", "24h"].map(time => <button type="button" key={time} className={d.time === time ? "is-active" : ""} aria-pressed={d.time === time} onClick={() => d.setTime(time)}>{time}</button>)}</div><label className="lens-select lens-sort"><select aria-label="Sort tokens" value={d.sort} onChange={e => d.setSort(e.target.value)}><option value="trending">Trending</option><option value="mcap">Market cap</option><option value="volume">Volume</option><option value="change">Top gainers</option></select><CaretDown size={11} /></label></div>
            {filters && <div className="lens-filter-panel"><label>Minimum market cap<select aria-label="Minimum market cap" value={d.minCap} onChange={e => d.setMinCap(Number(e.target.value))}><option value="0">All tokens</option><option value="25000">$25,000</option><option value="100000">$100,000</option><option value="1000000">$1,000,000</option></select></label><button type="button" onClick={() => { d.setMinCap(0); d.setSearch(""); d.setSort("trending"); }}>Reset filters</button></div>}
            <div className="lens-table-scroll" {...d.feedInteractionProps}><table className="lens-table"><thead><tr><th className="lens-star-cell"><Star size={12} /></th><th>Token</th><th className="lens-price-column"><span className="lens-column-label"><CurrencyDollar size={13} weight="bold" />Price</span></th><th><button type="button" onClick={() => d.setSort("mcap")}><Coins size={13} weight="bold" />Market cap{d.sort === "mcap" && <ArrowDown size={10} />}</button></th><th className="lens-volume-column"><button type="button" onClick={() => d.setSort("volume")}><ChartBar size={13} weight="bold" />Volume{d.sort === "volume" && <ArrowDown size={10} />}</button></th><th><button type="button" onClick={() => d.setSort("change")}><TrendUp size={13} weight="bold" />{d.time} change{d.sort === "change" && <ArrowDown size={10} />}</button></th><th className="lens-trend-column"><span className="lens-column-label"><ChartLine size={13} weight="bold" />Trend</span></th></tr></thead><tbody>{d.rows.map((row) => <tr key={row.id} data-feed-id={row.id} data-feed-seq={row.updatedAtTick || 0} data-feed-direction={row.direction || 1} className={`nm-feed-item ${token.id === row.id ? "is-selected" : ""}`} onClick={() => selectToken(row)}><td className="lens-star-cell"><button type="button" aria-label={`${d.stars.includes(row.id) ? "Remove" : "Add"} ${row.symbol} ${d.stars.includes(row.id) ? "from" : "to"} watchlist`} className={d.stars.includes(row.id) ? "is-starred" : ""} onClick={e => { e.stopPropagation(); d.toggleStar(row.id); }}><Star size={14} weight={d.stars.includes(row.id) ? "fill" : "regular"} /></button></td><td><button type="button" className="lens-token" aria-pressed={token.id === row.id} onClick={event => { event.stopPropagation(); selectToken(row); }}><TokenAvatar token={row} size={34} /><span><strong>{row.symbol}<small>{row.age}</small></strong><span className="lens-token-caption"><span>{row.name}</span><small><LaunchpadIcon name={row.launchpad} size={11} />{row.launchpad}</small></span><span className="lens-row-signals"><TokenSignals token={row} compact /></span></span></button></td><td className="lens-price-column lens-numeric nm-tick-value">{priceText(row.price)}</td><td className="lens-numeric nm-tick-value"><span>{money(row.mcap)}</span><small className="lens-row-secondary">ATH {money(row.athMcap)}</small></td><td className="lens-volume-column lens-numeric nm-tick-value"><span>{money(row.volume)}</span><small className="lens-row-secondary lens-row-transactions" title={`${row.buys.toLocaleString()} buys, ${row.sells.toLocaleString()} sells`}><ArrowsLeftRight size={13} weight="bold" />{compact(row.buys + row.sells)} txns</small></td><td className={`lens-numeric nm-tick-value ${d.change(row) >= 0 ? "nm-positive" : "nm-negative"}`}>{percent(d.change(row))}</td><td className="lens-trend-column"><Sparkline token={row} width={72} height={24} /></td></tr>)}</tbody></table>{d.rows.length === 0 && <div className="nm-empty">No tokens match your filters.<button type="button" className="lens-empty-reset" onClick={() => { d.setSearch(""); d.setMinCap(0); d.setView("Trending"); }}>Reset discovery</button></div>}</div>
            <div className="lens-list-footer"><span>{d.rows.length} tokens</span><span><span className="lens-selection-dot" />Select a token to explore</span></div>
          </main>
          <aside ref={inspectorRef} className="lens-inspector" aria-label="Selected token details" data-enter>
            <div className="lens-inspector-caption"><span>Token overview</span><span className="lens-chain-tag"><NearIcon size={10} />NEAR quote</span></div>
            <div className="lens-token-heading"><TokenAvatar token={token} size={48} /><div><h2>{token.symbol}<button type="button" title="Copy token symbol" aria-label="Copy token symbol" onClick={copyToken}>{copied ? <Check size={14} weight="regular" /> : <CopySimple size={14} weight="regular" />}</button></h2><p>{token.name}</p></div><button type="button" className={`lens-detail-star ${d.stars.includes(token.id) ? "is-starred" : ""}`} aria-label={`${d.stars.includes(token.id) ? "Unfollow" : "Follow"} ${token.symbol}`} aria-pressed={d.stars.includes(token.id)} onClick={() => d.toggleStar(token.id)}><Star size={19} weight={d.stars.includes(token.id) ? "fill" : "regular"} /></button></div>
            <div className="lens-detail-tabs" role="tablist" aria-label="Token information">{["Overview", "Activity"].map(tab => <button key={tab} type="button" role="tab" aria-selected={inspectorTab === tab} onClick={() => setInspectorTab(tab)}>{tab}</button>)}</div>
            {inspectorTab === "Overview" ? <div className="lens-overview" tabIndex={0} aria-label="Token chart and statistics"><div className="lens-detail-price"><strong>{priceText(token.price)}</strong><span className={d.change(token) >= 0 ? "nm-positive" : "nm-negative"}>{percent(d.change(token))}<small>{d.time}</small></span></div><div className="lens-chart-controls"><span><CurrencyDollar size={13} weight="bold" />Price <CaretDown size={10} /></span><div>{["5m", "1h", "24h"].map(time => <button key={time} type="button" aria-pressed={d.time === time} className={d.time === time ? "is-active" : ""} onClick={() => d.setTime(time)}>{time}</button>)}</div></div><DetailChart token={token} time={d.time} /><div className="lens-detail-stats">{[{ label: "Market cap", value: money(token.mcap), icon: Coins }, { label: "24h volume", value: money(token.volume), icon: ChartBar }, { label: "Liquidity", value: money(token.liquidity), icon: Drop }, { label: "Holders", value: compact(token.holders), icon: UsersThree }].map(({ label, value, icon: Icon }) => <div key={label}><span><Icon size={13} weight="bold" />{label}</span><strong>{value}</strong></div>)}</div><TokenDetails token={token} /><div className="lens-market-pressure"><div><span><i />{compact(token.buys)} buys</span><span>{compact(token.sells)} sells<i /></span></div><div className="lens-pressure-track"><span style={{ width: `${token.buys / (token.buys + token.sells) * 100}%` }} /></div></div></div> : <div className="lens-activity" tabIndex={0} aria-label="Recent token activity"><div className="lens-activity-title"><span>Recent transactions</span><span>Amount</span></div>{Array.from({ length: 7 }, (_, i) => <div key={`${token.id}-${i}`} className="lens-activity-row"><span className={i % 3 === 1 ? "is-sell" : "is-buy"}>{i % 3 === 1 ? <ArrowUpRight size={14} /> : <ArrowDown size={14} />}</span><div><strong>{i % 3 === 1 ? "Sell" : "Buy"} {token.symbol}</strong><span>{i + 1} min ago</span></div><strong>{money(Math.round(token.volume / (640 + i * 152)))}</strong></div>)}</div>}
            <div className="lens-trade"><div className="lens-trade-tabs">{["Buy", "Sell"].map(side => <button key={side} type="button" className={trade === side ? `is-active ${side === "Sell" ? "is-sell" : ""}` : ""} aria-pressed={trade === side} onClick={() => setTrade(side)}>{side}</button>)}</div><div className="lens-trade-label"><span>{trade === "Buy" ? "You pay" : "You sell"}</span><span>Market order</span></div><label className="lens-amount"><input type="number" min="0" step="any" value={amount} aria-label={`${trade} amount`} onChange={e => setAmount(e.target.value)} /><span>{trade === "Buy" ? <UsdcIcon size={15} /> : <TokenAvatar token={token} size={15} />}{trade === "Buy" ? "USDC" : token.symbol}<CaretDown size={12} /></span></label><div className="lens-presets">{["25", "50", "100", "250"].map(value => <button key={value} type="button" className={amount === value ? "is-active" : ""} onClick={() => setAmount(value)}>{trade === "Buy" ? "$" : ""}{value}</button>)}</div><div className="lens-trade-balance"><span>Available <strong>{wallet.connected ? formatBalance(available) : "—"} {currency}</strong></span>{wallet.connected && <button type="button" onClick={() => setAmount(String(available))}>Max</button>}</div><button type="button" className={`lens-connect-trade ${trade === "Sell" ? "is-sell" : ""}`} disabled={wallet.connected && (!validAmount || insufficient)} onClick={reviewOrder}>{wallet.connected ? `${trade} ${token.symbol}` : "Connect wallet"}</button>{wallet.connected && insufficient && <div className="lens-trade-error" role="status">Insufficient {currency} balance.</div>}<p><ArrowsLeftRight size={12} />Need trading funds? <button type="button" onClick={() => navigate("Bridge")}>Bridge now</button></p></div>
          </aside>
        </div>
        <Footer />
      </div>
    </div>
    {modal && <LensModal title={modal === "wallet" ? "Your wallet" : modal === "bridge" ? "Bridge to your next move" : modal === "portfolio" ? "Your portfolio" : modal === "pairs" ? "NEAR pairs" : modal === "order" ? "Review order" : modal === "settings" ? "Workspace settings" : "Welcome to Nomo"} identity={`${modal}:${wallet.connected}`} close={closeModal}>
      {modal === "wallet" && (wallet.connected ? <WalletSummary wallet={wallet} tokens={d.tokens} /> : <div className="lens-coming"><div className="lens-coming-icon"><Wallet size={28} /></div><h3>Your wallet, your markets.</h3><p>Reconnect to explore your portfolio and trading balance.</p><button type="button" className="lens-connect-trade" onClick={wallet.connect}>Connect wallet</button></div>)}
      {modal === "bridge" && <><p className="lens-modal-copy">A proposed route between Solana and NEAR. Quotes and transfers are not connected.</p><div className="lens-bridge-box"><div><span>From</span><strong className="lens-bridge-network">{bridgeReverse ? <NearIcon size={15} /> : <SolanaIcon size={15} />}{bridgeReverse ? "NEAR" : "Solana"}</strong></div><label><input aria-label="Bridge amount" type="number" min="0" step="any" value={bridgeAmount} onChange={e => setBridgeAmount(e.target.value)} /><strong className="lens-bridge-network"><UsdcIcon size={15} />USDC</strong></label></div><button type="button" className="lens-bridge-direction" aria-label="Swap bridge direction" onClick={() => setBridgeReverse(!bridgeReverse)}><ArrowDown size={17} /></button><div className="lens-bridge-box"><div><span>To</span><strong className="lens-bridge-network">{bridgeReverse ? <SolanaIcon size={15} /> : <NearIcon size={15} />}{bridgeReverse ? "Solana" : "NEAR"}</strong></div><label><span className="lens-output">—</span><strong className="lens-bridge-network"><UsdcIcon size={15} />USDC</strong></label></div><div className="lens-bridge-estimate"><span>Estimated received</span><span>{wallet.connected ? "Quote not connected" : "Connect to review"}</span></div><button type="button" className="lens-connect-trade" disabled={!Number.isFinite(Number(bridgeAmount)) || Number(bridgeAmount) <= 0 || (wallet.connected && Number(bridgeAmount) > wallet.balance)} onClick={() => { if (!wallet.connected) { wallet.connect(); return; } setWalletPending(true); }}>{wallet.connected ? "Review bridge" : "Connect wallet"}</button>{walletPending && <div className="lens-modal-message" role="status">No transfer was submitted.</div>}</>}
      {modal === "portfolio" && (wallet.connected ? <WalletSummary wallet={wallet} tokens={d.tokens} /> : <div className="lens-coming"><div className="lens-coming-icon"><Wallet size={28} /></div><h3>Your positions, in one place.</h3><p>Reconnect your wallet to explore your positions and available balance.</p><button type="button" className="lens-connect-trade" onClick={wallet.connect}>Connect wallet</button></div>)}
      {modal === "order" && order && <div className="lens-order-review"><div className="lens-order-side"><span>{order.side}</span><strong>{order.symbol}</strong></div><div className="lens-order-row"><span>{order.side === "Buy" ? "You pay" : "You sell"}</span><strong>{formatBalance(order.amount)} {order.currency}</strong></div><div className="lens-order-row"><span>Order type</span><strong>Market</strong></div><div className="lens-modal-message" role="status">No order was submitted.</div><button type="button" className="lens-connect-trade" onClick={closeModal}>Back to market</button></div>}
      {modal === "pairs" && <div className="lens-help"><p>Solana token markets with NEAR as the quote unit.</p><p>A dedicated NEAR pairs workspace is the next platform step. You can explore the current discovery experience now.</p><button type="button" className="lens-connect-trade" onClick={closeModal}>Back to Discover</button></div>}
      {modal === "settings" && <><p className="lens-modal-copy">Make the market list yours.</p><label className="lens-setting">Default change timeframe<select value={d.time} onChange={e => d.setTime(e.target.value)}><option>5m</option><option>1h</option><option>24h</option></select></label><label className="lens-setting">Minimum market cap<select value={d.minCap} onChange={e => d.setMinCap(Number(e.target.value))}><option value="0">All tokens</option><option value="25000">$25,000</option><option value="100000">$100,000</option><option value="1000000">$1,000,000</option></select></label><button type="button" className="lens-connect-trade" onClick={() => setModal(null)}>Done</button></>}
      {modal === "help" && <div className="lens-help"><p>Browse token markets, select a token to inspect it, and star tokens to keep them in your watchlist.</p><p>Manage your watchlist and inspect each token from the market.</p><button type="button" className="lens-connect-trade" onClick={() => setModal(null)}>Explore markets</button></div>}
    </LensModal>}
  </div>;
}
