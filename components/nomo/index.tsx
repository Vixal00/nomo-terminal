"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowDown, ArrowRight, ArrowsLeftRight, ArrowUpRight, CaretDown,
  Binoculars, Check, Compass, EyeSlash, Fire, IntersectSquare, MagnifyingGlass, Plus, PlusCircle, Trophy, XLogo,
  SlidersHorizontal, Star, Wallet, X, Lightning, RocketLaunch, Waveform,
} from "@phosphor-icons/react";
import { type Token, compact, money, percent, priceText, TIMEFRAMES } from "./data";
import { Sparkline, useDiscover, useEntrance } from "./shared";
import { TokenSignals } from "./token-info";
import { NearIcon, SolanaIcon } from "./brand-icons";
import { usePreviewWallet, WalletSummary } from "./wallet";
import { useNavMotion } from "./nav-motion";
import { MarketTicker, TerminalBar } from "./market-chrome";
import { FeatureFire } from "./feature-fire";
import { TokenIdentity } from "./token-identity";
import { NotificationsControl } from "./notifications";
import { QuickBuyPresetEditor, useQuickBuySettings } from "./quick-buy-settings";
import { TerminalSettings } from "./terminal-settings";
import { DiscoverFilters } from "./discover-filters";
import { activeMarketFilterCount, emptyMarketFilters, matchesMarketFilters, marketVolume, marketWindowShare } from "./market-filters";
import { TradeToast, type TradeResult } from "./trade-toast";
import { WalletMenu } from "./wallet-menu";
import { TokenSearch } from "./token-search";
import "./workspace-shell.css";
import { PortfolioWorkspace } from "./portfolio";
const PulseWorkspace = dynamic(() => import("./pulse").then(module => module.PulseWorkspace));
const TrackersWorkspace = dynamic(() => import("./trackers").then(module => module.TrackersWorkspace));
const LeaderboardWorkspace = dynamic(() => import("./leaderboard").then(module => module.LeaderboardWorkspace));
const CreatePairWorkspace = dynamic(() => import("./create-pair").then(module => module.CreatePairWorkspace));
const BridgeWorkspace = dynamic(() => import("./bridge").then(module => module.BridgeWorkspace));
import { NearPairsWorkspace } from "./near-pairs";
const TerminalDock = dynamic(() => import("./terminal-dock").then(module => module.TerminalDock));
const TokenDetail = dynamic(() => import("./token-detail").then(module => module.TokenDetail));

type Panel = "settings" | "tracker" | "presets" | "wallet" | "portfolio" | "bridge" | "about" | "pairs" | null;
const views = ["Trending", "New pairs", "Graduating", "Watchlist"];

export type Workspace = "portfolio" | "pulse" | "trackers" | "leaderboard" | "create" | "bridge" | "pairs";
export default function IndexDiscover({ tokenId, workspace }: { tokenId?: string; workspace?: Workspace } = {}) {
  const router = useRouter();
  const d = useDiscover();
  const wallet = usePreviewWallet();
  const entrance = useEntrance(d.feedTick);
  const nav = useNavMotion();
  useEffect(() => {
    const root = entrance.current;
    const navigation = root?.querySelector(".ni-navigation");
    if (!root || !navigation) return;
    const measure = () => root.style.setProperty("--ni-navigation-height", `${navigation.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(navigation);
    return () => observer.disconnect();
  }, [entrance]);
  const [panel, setPanel] = useState<Panel>(null);
  const [filters, setFilters] = useState(false);
  const buyFocusRequest = 0;
  const quickBuySettings = useQuickBuySettings();
  const { amount: quickAmount, presets: quickBuyPresets, activePreset, setAmount: setQuickAmount } = quickBuySettings;
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const resultId = useRef(0);
  const dismissTradeResult = useCallback(() => setTradeResult(null), []);
  const [marketFilters, setMarketFilters] = useState(emptyMarketFilters);
  const [hiddenPairIds, setHiddenPairIds] = useState<string[]>([]);
  const activeFilters = activeMarketFilterCount(marketFilters);
  const rows = d.rows.filter(item => !hiddenPairIds.includes(item.id) && matchesMarketFilters(item, marketFilters, d.time));
  const resetFilters = () => { setMarketFilters(emptyMarketFilters()); d.setMinCap(0); d.setSearch(""); d.setSort("trending"); };
  const [searchOpen, setSearchOpen] = useState(false);
  const [dock, setDock] = useState<"watchlist" | "tracker" | null>(null);
  useEffect(() => {try {const value = sessionStorage.getItem("nomo.terminal.dock");if (value === "watchlist" || value === "tracker") setDock(value);} catch {}}, []);
  const toggleDock = (next: "watchlist" | "tracker" | null) => {const value = next === dock ? null : next;setDock(value);try {if (value) sessionStorage.setItem("nomo.terminal.dock", value);else sessionStorage.removeItem("nomo.terminal.dock");} catch {}};
  const quickBuyInput = useRef<HTMLInputElement>(null);
  const markets = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);

  const open = (next: Panel) => setPanel(next);
  const token = (value: Token) => { d.setSearch(""); setPanel(null); router.push(`/token/${value.id}`); };
  const amountText = (value: number) => value.toLocaleString("en-US", {maximumFractionDigits: 2});
  const quickSpend = Number(quickAmount);
  const quickValid = quickAmount.trim() !== "" && Number.isFinite(quickSpend) && quickSpend > 0;
  const quickError = !quickValid ? "Enter an amount greater than zero." : wallet.connected && quickSpend > wallet.balance ? "Amount exceeds your available balance." : null;
  const quickBuy = (value: Token) => {
    const message = !wallet.connected ? "Connect your wallet before buying." : quickError || "Trading is not connected. No transaction was sent.";
    setTradeResult({ id: ++resultId.current, status: "error", title: `Buy ${value.symbol} failed`, message });
  };
  const changeClass = (value: number) => value >= 0 ? "nm-positive" : "nm-negative";
  const sort = (value: string) => d.setSort(d.sort === value ? "trending" : value);
  const detailToken = tokenId ? d.tokens.find(item => item.id === tokenId) : undefined;
  useEffect(() => {
    if (!tokenId && !workspace && new URLSearchParams(window.location.search).get("view") === "watchlist") d.setView("Watchlist");
  }, [tokenId, workspace, d.setView]);
  const featured = [...d.tokens]
    .sort((a, b) => b.price * b.totalSupply - a.price * a.totalSupply || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((item, index) => ({
      rank: index + 1,
      token: item,
      fdv: item.price * item.totalSupply,
      artwork: item.image.replace("-64.webp", ".webp"),
    }));

  return <div className={`nomo nomo-index${tokenId ? " nomo-token" : ""}`} ref={entrance}>
    <div className="ni-navigation">
    <header className="ni-header">
      <a href="/" className="ni-logo" aria-label="Nomo home"><img src="/nomo/nomo-logo.svg" alt="nomo" width="98" height="32" /></a>
      <nav className="ni-nav" aria-label="Main navigation" ref={nav}>
        <button className={!workspace ? "active" : ""} aria-current={!workspace ? "page" : undefined} data-nav-motion="discover" onClick={() => {d.setView("Trending");if (tokenId || workspace) router.push("/discover/index");}}><Compass size={14} aria-hidden="true"/>Discover</button>
        <button className={workspace === "pulse" ? "active" : ""} aria-current={workspace === "pulse" ? "page" : undefined} data-nav-motion="pulse" onClick={() => router.push("/pulse")}><Waveform size={14} aria-hidden="true"/>Pulse</button>
        <button className={workspace === "pairs" ? "active" : ""} aria-current={workspace === "pairs" ? "page" : undefined} data-nav-motion="pairs" onClick={() => router.push("/pairs")}><IntersectSquare size={14} aria-hidden="true"/>NEAR pairs</button>
        <button className={workspace === "portfolio" ? "active" : ""} aria-current={workspace === "portfolio" ? "page" : undefined} data-nav-motion="portfolio" onClick={() => router.push("/portfolio")}><Wallet size={14} aria-hidden="true"/>Portfolio</button>
        <button className={workspace === "trackers" ? "active" : ""} aria-current={workspace === "trackers" ? "page" : undefined} data-nav-motion="trackers" onClick={() => router.push("/trackers")}><Binoculars size={14} aria-hidden="true"/>Trackers</button>
        <button className={workspace === "leaderboard" ? "active" : ""} aria-current={workspace === "leaderboard" ? "page" : undefined} data-nav-motion="leaderboard" onClick={() => router.push("/leaderboard")}><Trophy size={14} aria-hidden="true"/>Leaderboard</button>
        <button className={workspace === "bridge" ? "active" : ""} aria-current={workspace === "bridge" ? "page" : undefined} data-nav-motion="bridge" onClick={() => router.push("/bridge")}><ArrowsLeftRight size={14} aria-hidden="true"/>Bridge</button>
      </nav>
      <div className="ni-header-actions">
        <a className="ni-social-link" href="https://x.com/nomotrading" target="_blank" rel="noopener noreferrer" aria-label="Nomo on X"><XLogo size={15}/></a>
        <button type="button" className="ni-create-button" onClick={() => router.push("/create")} aria-label="Create a NEAR pair"><Plus size={13} weight="bold"/><span>Create</span></button>
        <button type="button" className="ni-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search tokens" aria-haspopup="dialog"><MagnifyingGlass size={15}/><span>Search tokens</span></button>
        <NotificationsControl/>
        <WalletMenu wallet={wallet} onPortfolio={() => router.push("/portfolio")}/>
      </div>
    </header>

    <MarketTicker tokens={d.tokens} watchlistIds={d.stars} heldPositions={Object.fromEntries(d.tokens.map(item => [item.id, wallet.tokenBalance(item.id)]))} heldIds={wallet.connected ? d.tokens.filter(item => wallet.tokenBalance(item.id) > 0).map(item => item.id) : []} onSelect={token}/>
    </div>

    <div className={`ni-workspace${dock ? " ni-workspace-docked" : ""}`}>
    {dock && <TerminalDock kind={dock} tokens={d.tokens} stars={d.stars} onStar={d.toggleStar} onSelect={token} onClose={() => toggleDock(null)}/>}
    <div className="ni-workspace-body">
    {workspace === "portfolio" ? <PortfolioWorkspace tokens={d.tokens} wallet={wallet} onSelect={token}/> : workspace === "pulse" ? <PulseWorkspace tokens={d.tokens} stars={d.stars} onStar={d.toggleStar} onSelect={token} onBuy={quickBuy} quickAmount={quickAmount} quickBuyError={quickError} activePreset={activePreset} onPreset={quickBuySettings.selectPreset} onAmountChange={setQuickAmount}/> : workspace === "trackers" ? <TrackersWorkspace/> : workspace === "leaderboard" ? <LeaderboardWorkspace/> : workspace === "create" ? <CreatePairWorkspace/> : workspace === "bridge" ? <BridgeWorkspace/> : workspace === "pairs" ? <NearPairsWorkspace tokens={d.tokens} wallet={wallet}/> : detailToken ? <TokenDetail token={detailToken} wallet={wallet} quickBuy={quickBuySettings} starred={d.stars.includes(detailToken.id)} onStar={() => d.toggleStar(detailToken.id)} onPresets={() => open("presets")} amountRef={quickBuyInput} buyFocusRequest={buyFocusRequest}/> : <main className="ni-main">
      <div className="ni-title-row" data-enter>
        <h1>Discover</h1>
      </div>

      <div className="ni-featured" data-enter>
        {featured.map(item => <button className="ni-feature" key={item.token.id} onClick={() => token(item.token)}>
          <FeatureFire/>
          <span className="ni-spotlight-art" aria-hidden="true"><img src={item.artwork} alt=""/></span>
          <div className="ni-feature-label"><span><span className="ni-feature-rank">#{item.rank}</span> by FDV</span><ArrowUpRight size={13}/></div>
          <div className="ni-feature-content"><div className="ni-feature-name"><strong>{item.token.symbol}</strong><span>{item.token.name}</span></div><div className="ni-feature-chart"><Sparkline token={item.token} width={100} height={27}/></div><div className="ni-feature-change"><strong className={changeClass(d.change(item.token))}>{percent(d.change(item.token))}</strong><span>{money(item.fdv)} FDV</span></div></div>
        </button>)}
      </div>

      <section className="ni-markets" ref={markets} aria-label="Token markets" data-enter>
        <div className="ni-market-toolbar">
          <div className="ni-views" role="tablist" aria-label="Market view">{views.map(view => <button key={view} role="tab" aria-selected={d.view === view} onClick={() => d.setView(view)} className={d.view === view ? "active" : ""}>{view === "Trending" ? <Fire size={14} weight={d.view === view ? "fill" : "regular"} aria-hidden="true"/> : view === "New pairs" ? <PlusCircle size={14} weight={d.view === view ? "fill" : "regular"} aria-hidden="true"/> : view === "Graduating" ? <RocketLaunch size={14} weight={d.view === view ? "fill" : "regular"} aria-hidden="true"/> : <Star size={14} weight={d.view === view ? "fill" : "regular"} aria-hidden="true"/>}<span>{view}</span>{view === "Watchlist" && <small>{d.stars.length}</small>}</button>)}</div>
          <div className="ni-controls">
            <div className="ni-quick-buy-controls">
              <label className={`ni-quick-buy-amount ${quickError ? "has-error" : ""}`} title={quickError || "Custom Quick buy amount"}><Lightning size={13} weight="fill"/><span className="ni-quick-buy-currency" aria-hidden="true">$</span><input ref={quickBuyInput} aria-label="Quick buy amount in dollars" aria-invalid={!!quickError} type="number" min="0" step="any" inputMode="decimal" value={quickAmount} onChange={event => setQuickAmount(event.target.value)}/></label>
              <div className="ni-quick-buy-presets" role="group" aria-label="Quick buy presets">
                {quickBuyPresets.map((value, index) => <button type="button" key={index} aria-label={`Use preset ${index + 1}, $${value}`} aria-pressed={activePreset === index} title={`P${index + 1} · $${value}`} onClick={() => quickBuySettings.selectPreset(index)}>P{index + 1}</button>)}
              </div>
            </div>
            <div className="ni-time" role="group" aria-label="Change timeframe">{TIMEFRAMES.map(time => <button key={time} aria-pressed={d.time === time} className={d.time === time ? "active" : ""} onClick={() => d.setTime(time)}>{time}</button>)}</div>
            <button className={`ni-filter-button ${filters || activeFilters || hiddenPairIds.length ? "active" : ""}`} onClick={() => setFilters(!filters)} aria-expanded={filters}><SlidersHorizontal size={14}/><span>Filters</span>{(activeFilters > 0 || hiddenPairIds.length > 0) && <i/>}</button>
          </div>
        </div>
        {filters && <DiscoverFilters value={marketFilters} onChange={setMarketFilters} tokens={d.tokens} time={d.time} hidden={hiddenPairIds} onRestore={id => setHiddenPairIds(ids => ids.filter(item => item !== id))} onRestoreAll={() => setHiddenPairIds([])} onReset={resetFilters} onClose={() => setFilters(false)}/>}
        <div className="ni-table-scroll" {...d.feedInteractionProps}>
          <table className="ni-table">
            <thead><tr><th className="ni-star-cell" aria-label="Watchlist"/><th className="ni-token-cell">Token</th><th className="ni-cap-head"><button onClick={() => sort("mcap")}>Market cap {d.sort === "mcap" ? <ArrowDown size={11}/> : <CaretDown size={10}/>}</button></th><th className="ni-price-head"><span className="ni-th-label">Price</span></th><th className="ni-change-head"><button onClick={() => sort("change")}>{d.time} {d.sort === "change" ? <ArrowDown size={11}/> : <CaretDown size={10}/>}</button></th><th className="ni-volume-head"><button onClick={() => sort("volume")}>Volume {d.time} {d.sort === "volume" ? <ArrowDown size={11}/> : <CaretDown size={10}/>}</button></th><th className="ni-liquidity-head"><span className="ni-th-label">Liquidity</span></th><th className="ni-holders-head"><span className="ni-th-label">Holders</span></th><th className="ni-info-head"><span className="ni-th-label">Token info</span></th><th className="ni-trend-head">Trend</th><th className="ni-quick-buy-head">Quick buy</th></tr></thead>
            <tbody>{rows.map(item => <tr key={item.id} className="nm-feed-item" data-feed-id={item.id} data-feed-seq={item.updatedAtTick || 0} data-feed-direction={item.direction || 1}>
              <td className="ni-star-cell"><button className={d.stars.includes(item.id) ? "ni-star starred" : "ni-star"} onClick={() => d.toggleStar(item.id)} aria-label={`${d.stars.includes(item.id) ? "Remove" : "Add"} ${item.symbol} ${d.stars.includes(item.id) ? "from" : "to"} watchlist`} aria-pressed={d.stars.includes(item.id)}><Star size={14} weight={d.stars.includes(item.id) ? "fill" : "regular"}/></button></td>
              <td className="ni-token-cell"><TokenIdentity token={item} onSelect={token}/></td>
              <td className="ni-value nm-tick-value"><span className="ni-metric-primary">{money(item.mcap)}</span><small className="ni-cell-secondary ni-cap-ath">ATH {money(item.athMcap)}</small><small className={`ni-mobile-change ${changeClass(d.change(item))}`}>{percent(d.change(item))}<small>{d.time}</small></small><span className="ni-cap-bar"><i style={{width: `${Math.max(5, Math.min(100, item.mcap / 4820000 * 100))}%`}}/></span></td>
              <td className="ni-value ni-price nm-tick-value"><span className="ni-metric-primary">{priceText(item.price)}</span></td>
              <td className={`ni-percent ni-change-cell nm-tick-value ni-selected-time ${changeClass(d.change(item))}`}><span className="ni-metric-primary">{percent(d.change(item))}</span></td>
              <td className="ni-value ni-volume-cell nm-tick-value"><span className="ni-metric-primary">{money(marketVolume(item, d.time))}</span><small className="ni-cell-secondary" title={`${Math.round(item.buys * marketWindowShare(d.time))} buys / ${Math.round(item.sells * marketWindowShare(d.time))} sells over ${d.time}`}>{compact(Math.round(item.buys * marketWindowShare(d.time)) + Math.round(item.sells * marketWindowShare(d.time)))} txns</small><span className="ni-volume-split"><i style={{width: `${item.buys / (item.buys + item.sells) * 100}%`}}/></span></td>
              <td className="ni-value ni-liquidity-cell nm-tick-value"><span className="ni-metric-primary">{money(item.liquidity)}</span><small className="ni-cell-secondary">{money(item.fees)} fees</small></td>
              <td className="ni-holders"><span className="ni-metric-primary">{compact(item.holders)}</span></td>
              <td className="ni-token-info"><TokenSignals token={item} compact variant="chips"/></td>
              <td className="ni-chart-cell"><Sparkline token={item} width={96} height={25}/></td>
              <td className="ni-quick-buy-cell"><div className="ni-row-actions"><button className="ni-hide-pair" type="button" aria-label={`Hide ${item.symbol} pair`} title="Hide pair" onClick={() => setHiddenPairIds(ids => [...ids, item.id])}><EyeSlash size={13}/></button><button className="ni-quick-buy" disabled={!!quickError} aria-label={wallet.connected ? `Quick buy ${item.symbol} for $${quickValid ? amountText(quickSpend) : "0"}` : `Connect wallet to buy ${item.symbol}`} title={quickError || `Buy ${item.symbol}`} onClick={() => quickBuy(item)}><Lightning size={12} weight="fill" aria-hidden="true"/><span>{wallet.connected ? `Buy $${quickValid ? compact(quickSpend) : "—"}` : "Connect"}</span></button></div></td>
            </tr>)}</tbody>
          </table>
          {rows.length === 0 && <div className="nm-empty"><MagnifyingGlass size={23}/><strong>No pairs match this view</strong><p>Try another token or clear your filters.</p><button onClick={() => {resetFilters(); setHiddenPairIds([]); d.setView("Trending");}}>Show all pairs</button></div>}
        </div>
      </section>
    </main>}
    </div></div>
    <TradeToast result={tradeResult} onDismiss={dismissTradeResult}/>
    <TokenSearch open={searchOpen} onClose={() => setSearchOpen(false)} tokens={d.tokens} stars={d.stars} onSelect={token}/>
    <TerminalBar
      tokens={d.tokens}
      watchlistCount={d.stars.length}
      watchlistActive={dock === "watchlist"}
      trackerActive={dock === "tracker"}
      activePreset={activePreset}
      onPresets={() => open("presets")}
      onSettings={() => open("settings")}
      onTracker={() => toggleDock("tracker")}
      onWatchlist={() => toggleDock("watchlist")}
    />

    <dialog ref={dialog} className="ni-dialog" onCancel={() => setPanel(null)} onClick={event => {const box=event.currentTarget.getBoundingClientRect();if(event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))setPanel(null);}} aria-labelledby="ni-dialog-title">
      <div className="ni-dialog-inner"><button className="ni-dialog-close" onClick={() => setPanel(null)} aria-label="Close dialog"><X size={18}/></button>
        {panel === "settings" ? <TerminalSettings feedPaused={d.feedPaused} setFeedPaused={d.setFeedPaused} onPresets={() => open("presets")}/> : panel === "presets" ? <QuickBuyPresetEditor presets={quickBuyPresets} onCancel={() => setPanel(null)} onSave={values => {quickBuySettings.savePresets(values);setPanel(null);}}/> : <>
          <div className="ni-modal-icon">{panel === "bridge" || panel === "pairs" ? <ArrowsLeftRight size={24}/> : panel === "about" ? <img src="/nomo/nomo-n.svg" width="25" height="25" alt=""/> : <Wallet size={24}/>}</div>
          <h2 id="ni-dialog-title">{panel === "pairs" ? "A new perspective on pairs." : panel === "bridge" ? "Move assets between networks." : panel === "tracker" ? "Tracker" : panel === "portfolio" ? "Your portfolio" : panel === "about" ? "Never miss a move." : wallet.connected ? "Your wallet" : "Make your next move."}</h2>
          <p className="ni-modal-description">{panel === "pairs" ? "Explore Solana token markets with NEAR as the quote unit. The dedicated NEAR pairs workspace is coming next, with Solana settlement and a familiar NEAR view." : panel === "bridge" ? "Bridge integrations are not connected yet. Supported networks and routes will appear here when available." : panel === "about" ? "Nomo brings markets into focus. Discover new pairs, follow the momentum, and keep the tokens that matter within reach." : wallet.connected ? "Your balance and positions, all in one place." : "Connect your wallet to see your balance and positions."}</p>
          {panel === "about" ? <div className="ni-about-list"><span><Compass size={17}/>Discover every stage of the market<Check size={14}/></span><span><Star size={17}/>Build a watchlist that stays with you<Check size={14}/></span><button className="ni-primary-button" onClick={() => setPanel(null)}>Explore the markets <ArrowRight size={15}/></button></div> : panel === "bridge" || panel === "pairs" ? <><div className="ni-bridge-route"><span>{panel === "pairs" && <SolanaIcon size={14}/>} {panel === "pairs" ? "Solana settlement" : "Bridge integration"}</span>{panel === "pairs" && <ArrowRight size={15}/>}<strong>{panel === "pairs" && <NearIcon size={13}/>} {panel === "pairs" ? "NEAR quote" : "Pending"}</strong></div><button className="ni-secondary-button" onClick={() => setPanel(null)}>Back to Discover</button></> : wallet.connected ? <div className="ni-wallet-portfolio"><WalletSummary wallet={wallet} tokens={d.tokens} avatarVariant="square"/><button className="ni-primary-button" onClick={() => setPanel(null)}>Back to markets<ArrowRight size={15}/></button></div> : <button className="ni-primary-button" onClick={wallet.connect}><Wallet size={16}/>Connect wallet</button>}
        </>}
      </div>
    </dialog>
  </div>;
}
