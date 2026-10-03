"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowSquareOut, ArrowsDownUp, Bell, Copy, DownloadSimple, LinkSimple, MagnifyingGlass, PencilSimple, Plus, Trash, UploadSimple, Wallet, X, XLogo } from "@phosphor-icons/react";
import { TOKENS, TOKEN_PORTRAITS, money } from "./data";
import { activityAge, isNearAccount, nearAmount, normalizeTrackedAccount, PREVIEW_TRADES, previewUsd, shortAccount, signedNear, traderForWallet, useTrackedWallets, type TrackedWallet } from "./trader-preview";
import "./trackers.css";
import { MarketChainIcon } from "./brand-icons";
import { TrackedWalletAvatar, WalletMark } from "./tracked-wallet-avatar";
import { TRACKER_CHAINS, WALLET_SHAPES, WALLET_COLORS, walletAppearance, normalizeWalletAddress, isWalletAddress, trackedWalletKey, parseWalletImport, type TrackerChain, type WalletShape, type WalletColor } from "./tracked-wallets";
import { useXProfiles, type XProfile } from "./social-profiles";

const TABS = ["Manager", "Trades", "Monitor", "X"] as const;
type TrackerTab = typeof TABS[number];

function tabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number, select: (tab: TrackerTab) => void) {
  const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  select(TABS[next]);
  (event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
}

export function TrackersWorkspace() {
  const { wallets, saveWallets } = useTrackedWallets();
  const [tab, setTab] = useState<TrackerTab>("Manager");
  const [query, setQuery] = useState("");
  const [side, setSide] = useState("All trades");
  const [sort, setSort] = useState("Added");
  const { profiles, muted, addProfile, removeProfile, toggleNotifications, linkWallet } = useXProfiles();
  const [modal, setModal] = useState<"wallet" | "import" | "x" | "detail" | "profile" | "link" | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<TrackedWallet | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<XProfile | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<TrackerChain>("NEAR");
  const [shape, setShape] = useState<WalletShape>("circle");
  const [color, setColor] = useState<WalletColor>("sage");
  const [editingWallet, setEditingWallet] = useState<TrackedWallet | null>(null);
  const [handle, setHandle] = useState("");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { if (new URLSearchParams(window.location.search).get("tab") === "x") setTab("X"); }, []);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('form input:not([type="radio"]):not([type="file"]), form textarea')?.focus();
    } else dialog.current?.close();
  }, [modal]);

  const switchTab = (next: TrackerTab) => { setTab(next); setQuery(""); setStatus(""); };
  const open = (next: NonNullable<typeof modal>) => { setName(""); setAddress(""); setHandle(""); setImportText(""); setError(""); setChain("NEAR"); setShape("circle"); setColor("sage"); setEditingWallet(null); setModal(next); };
  const editWallet = (wallet:TrackedWallet) => {
    const appearance=walletAppearance(wallet);
    setEditingWallet(wallet);setName(wallet.name);setAddress(wallet.address);setChain(wallet.chain||"NEAR");setShape(appearance.shape);setColor(appearance.color);setError("");setModal("wallet");
  };
  const openWalletLink = (profile:XProfile) => {setSelectedProfile(profile);setAddress(profile.address);setError("");setModal("link");};
  const needle = query.trim().toLowerCase().replace(/^@/, "");
  const matches = (text: string) => !needle || text.toLowerCase().includes(needle);
  const byAddress = new Map(wallets.filter(wallet => !wallet.chain || wallet.chain === "NEAR").map(wallet => [wallet.address, wallet]));
  const filteredWallets = wallets.filter(wallet => matches(`${wallet.name} ${wallet.address}`)).sort((a, b) => sort === "Name" ? a.name.localeCompare(b.name) : sort === "PnL" ? (traderForWallet(b.address,b.chain)?.pnl ?? -Infinity) - (traderForWallet(a.address,a.chain)?.pnl ?? -Infinity) : b.addedAt - a.addedAt);
  const trades = PREVIEW_TRADES.filter(trade => byAddress.get(trade.address)?.trades && matches(`${byAddress.get(trade.address)?.name} ${trade.address} ${trade.token.symbol} ${trade.token.name}`) && (side === "All trades" || trade.side === side));
  const monitorTokens = TOKENS.slice(0, 10).map(token => ({ token, trades: PREVIEW_TRADES.filter(trade => trade.token.id === token.id && byAddress.get(trade.address)?.monitor) })).filter(item => item.trades.length && matches(`${item.token.name} ${item.token.symbol} ${item.trades.map(trade => byAddress.get(trade.address)?.name).join(" ")}`));
  const shownProfiles = profiles.filter(profile => matches(`${profile.name} ${profile.handle} ${profile.address}`));
  const importable = useMemo(() => parseWalletImport(importText).map(item => ({...item,address:item.chain === "NEAR" ? normalizeTrackedAccount(item.address) : item.address})).filter(item => !wallets.some(wallet => trackedWalletKey(wallet) === trackedWalletKey(item))), [importText, wallets]);
  const setPreference = (wallet: TrackedWallet, key: "monitor" | "trades") => saveWallets(wallets.map(item => trackedWalletKey(item) === trackedWalletKey(wallet) ? { ...item, [key]: !item[key] } : item));
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setStatus("Address copied"); } catch { setStatus("Copy unavailable. Select the address in the wallet details."); } };
  const notificationsOn = (profile:XProfile) => !muted.includes(profile.handle.toLowerCase());
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanAddress = normalizeWalletAddress(address,modal === "wallet" ? chain : "NEAR");
    if (modal === "wallet") {
      if (!isWalletAddress(cleanAddress,chain)) { setError(chain === "NEAR" ? "Enter a valid NEAR account ID or account address." : chain === "Solana" ? "Enter a valid Solana wallet address." : `Enter a valid ${chain === "Robinhood Chain" ? "Robinhood" : chain} address starting with 0x.`); return; }
      if (wallets.some(wallet => trackedWalletKey(wallet) === trackedWalletKey({address:cleanAddress,chain}) && (!editingWallet || trackedWalletKey(wallet)!==trackedWalletKey(editingWallet)))) { setError("This wallet is already in your trackers."); return; }
      const updated:TrackedWallet={address:cleanAddress,chain,shape,color,name:name.trim()||shortAccount(cleanAddress),monitor:editingWallet?.monitor??true,trades:editingWallet?.trades??true,addedAt:editingWallet?.addedAt??Date.now()};
      saveWallets(editingWallet?wallets.map(wallet=>trackedWalletKey(wallet)===trackedWalletKey(editingWallet)?updated:wallet):[...wallets,updated]);
      setStatus(editingWallet?"Wallet updated":"Wallet added");
    } else if (modal === "import") {
      if (!importable.length) { setError("Add a valid wallet that is not already tracked."); return; }
      saveWallets([...wallets, ...importable.map(item => ({ ...item, monitor: true, trades: true, addedAt: Date.now() }))]);
      setStatus(`${importable.length} wallet${importable.length === 1 ? "" : "s"} imported`);
    } else if (modal === "link" && selectedProfile) {
      if (cleanAddress && !isNearAccount(cleanAddress)) {setError("Enter a valid NEAR account ID.");return;}
      linkWallet(selectedProfile,cleanAddress);setStatus(cleanAddress?"Wallet linked":"Wallet unlinked");
    } else if (modal === "x") {
      const cleanHandle = handle.trim().replace(/^@/, "");
      if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle)) { setError("Use an X username of up to 15 letters, numbers or underscores."); return; }
      if (profiles.some(profile => profile.handle.toLowerCase() === cleanHandle.toLowerCase())) { setError("This X account is already in your list."); return; }
      if (cleanAddress && !isNearAccount(cleanAddress)) { setError("Enter a valid NEAR account ID, or leave the wallet blank."); return; }
      const profile = { handle: cleanHandle, name: name.trim() || cleanHandle, address: cleanAddress, avatar: "/art/coins/p57.webp", fixture: false };
      addProfile(profile);
      setStatus("X account saved");
    }
    setModal(null);
  };
  const detailTrader = selectedWallet ? traderForWallet(selectedWallet.address,selectedWallet.chain) : undefined;
  const modalTitle = modal === "wallet" ? editingWallet ? "Edit wallet" : "Add wallet" : modal === "import" ? "Import wallets" : modal === "x" ? "Add X account" : modal === "link" ? "Link wallet" : modal === "profile" ? selectedProfile?.name || "X account" : selectedWallet?.name || "Wallet details";

  return <main className="ntk-main">
    <div className="ntk-heading"><h1>Trackers</h1></div>
    <div className="ntk-tabs" role="tablist" aria-label="Tracker views">{TABS.map((item, index) => <button key={item} role="tab" id={`ntk-tab-${item}`} aria-controls="ntk-panel" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} className={tab === item ? "active" : ""} onKeyDown={event => tabKeys(event, index, switchTab)} onClick={() => switchTab(item)}>{item === "X" && <XLogo size={12}/>}<span>{item}</span>{item === "Manager" && <small>{wallets.length}</small>}</button>)}</div>
    <section className="ntk-panel" id="ntk-panel" role="tabpanel" aria-labelledby={`ntk-tab-${tab}`}>
      <div className="ntk-toolbar">
        <label className="ntk-search"><MagnifyingGlass size={14}/><input aria-label={tab === "X" ? "Search X accounts" : tab === "Manager" ? "Search wallets" : "Search wallets or tokens"} placeholder={tab === "X" ? "Search X accounts" : tab === "Manager" ? "Search wallets" : "Search wallets or tokens"} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={12}/></button>}</label>
        {tab === "Manager" && <><label className="ntk-select"><ArrowsDownUp size={13}/><select aria-label="Sort tracked wallets" value={sort} onChange={event => setSort(event.target.value)}><option>Added</option><option>Name</option><option>PnL</option></select></label><div className="ntk-toolbar-actions"><button className="ntk-button" onClick={() => open("import")}><UploadSimple size={13}/>Import</button><button className="ntk-button" type="button"><DownloadSimple size={13}/>Export</button><button className="ntk-button ntk-primary" onClick={() => open("wallet")}><Plus size={13}/>Add wallet</button></div></>}
        {tab === "Trades" && <div className="ntk-segment" role="group" aria-label="Trade type">{["All trades", "Buy", "Sell"].map(item => <button key={item} aria-pressed={side === item} onClick={() => setSide(item)}>{item}</button>)}</div>}
        {tab === "Monitor" && <span className="ntk-toolbar-note">{wallets.filter(wallet => wallet.monitor).length} wallets in Monitor</span>}
        {tab === "X" && <div className="ntk-toolbar-actions"><button className="ntk-button ntk-primary" onClick={() => open("x")}><Plus size={13}/>Add X account</button></div>}
      </div>
      {tab === "Manager" && <div className="ntk-table-scroll"><table className="ntk-table"><thead><tr><th>Added</th><th>Wallet</th><th>Balance</th><th>7d PnL</th><th>Last active</th><th>Monitor</th><th>Trades</th><th aria-label="Remove wallet"/></tr></thead><tbody>{filteredWallets.map(wallet => { const trader = traderForWallet(wallet.address,wallet.chain); return <tr key={trackedWalletKey(wallet)}><td className="ntk-muted">{wallet.addedAt === 0 ? "7d ago" : new Date(wallet.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td><td><div className="ntk-wallet-cell"><button className="ntk-identity" onClick={() => { setSelectedWallet(wallet); setModal("detail"); }}><TrackedWalletAvatar wallet={wallet} size={30}/><span><strong>{wallet.name}</strong><small className="ntk-wallet-address"><MarketChainIcon chain={wallet.chain || "NEAR"} size={11}/>{shortAccount(wallet.address)}</small></span></button><button className="ntk-icon" aria-label={`Copy ${wallet.name}'s address`} onClick={() => copy(wallet.address)}><Copy size={12}/></button></div></td><td>{trader ? <>{nearAmount(trader.balance)} <span className="ntk-unit">NEAR</span><small>{previewUsd(trader.balance)}</small></> : <span className="ntk-muted">—</span>}</td><td className={trader && trader.pnl >= 0 ? "ntk-positive" : trader ? "ntk-negative" : "ntk-muted"}>{trader ? <>{signedNear(trader.pnl)} <span className="ntk-unit">NEAR</span></> : "—"}</td><td className="ntk-muted">{trader ? activityAge(trader.lastMinutes) : "No data"}</td><td><button className="ntk-toggle" role="switch" aria-checked={wallet.monitor} aria-label={`Show ${wallet.name} in Monitor`} onClick={() => setPreference(wallet, "monitor")}><span/></button></td><td><button className="ntk-toggle" role="switch" aria-checked={wallet.trades} aria-label={`Show ${wallet.name}'s trades`} onClick={() => setPreference(wallet, "trades")}><span/></button></td><td><button className="ntk-icon ntk-remove" aria-label={`Remove ${wallet.name} from trackers`} onClick={() => { saveWallets(wallets.filter(item => trackedWalletKey(item) !== trackedWalletKey(wallet))); setStatus(`${wallet.name} removed from trackers`); }}><Trash size={14}/></button></td></tr>; })}</tbody></table>{filteredWallets.length === 0 && <Empty title={query ? "No wallets match your search" : "Your wallet list is empty"} body="Add a wallet or follow a trader to keep them here."/>}</div>}
      {tab === "Trades" && <div className="ntk-table-scroll"><table className="ntk-table ntk-trades-table"><thead><tr><th><span>Time <ArrowDown size={10}/></span></th><th>Wallet</th><th>Token</th><th>Side</th><th>Amount</th><th>Value</th><th>Market cap</th></tr></thead><tbody>{trades.map(trade => { const wallet = byAddress.get(trade.address)!; return <tr key={trade.id}><td className="ntk-muted">{activityAge(trade.minutes)}</td><td><button className="ntk-identity" onClick={() => { setSelectedWallet(wallet); setModal("detail"); }}><TrackedWalletAvatar wallet={wallet} size={26}/><strong>{wallet.name}</strong></button></td><td><a className="ntk-identity" href={`/token/${trade.token.id}`}><img src={TOKEN_PORTRAITS[trade.token.id] || trade.token.image} width={27} height={27} alt=""/><span><strong>{trade.token.symbol}</strong><small>{trade.token.name}</small></span></a></td><td><span className={`ntk-side ${trade.side === "Buy" ? "ntk-positive" : "ntk-negative"}`}>{trade.side}</span></td><td>{nearAmount(trade.amount)} <span className="ntk-unit">NEAR</span></td><td className="ntk-muted">{previewUsd(trade.amount)}</td><td>{money(trade.token.mcap)}</td></tr>; })}</tbody></table>{trades.length === 0 && <Empty title="No trades in this view" body="Try another search, or enable Trades for a wallet in Manager."/>}</div>}
      {tab === "Monitor" && <div className="ntk-monitor">{monitorTokens.map(({ token, trades: tokenTrades }) => { const owners = [...new Set(tokenTrades.map(trade => trade.address))]; const invested = tokenTrades.filter(trade => trade.side === "Buy").reduce((sum, trade) => sum + trade.amount, 0); return <article className="ntk-monitor-card" key={token.id}><header><a className="ntk-identity" href={`/token/${token.id}`}><img src={TOKEN_PORTRAITS[token.id] || token.image} alt="" width={32} height={32}/><span><strong>{token.symbol}<ArrowSquareOut size={11}/></strong><small>{token.name}</small></span></a><span className="ntk-owner-count"><Wallet size={12}/>{owners.length}</span></header><div className="ntk-monitor-stats"><span>Market cap<strong>{money(token.mcap)}</strong></span><span>24h change<strong className={token.change24h >= 0 ? "ntk-positive" : "ntk-negative"}>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</strong></span><span>Tracked buys<strong>{nearAmount(invested)} <small>NEAR</small></strong></span></div><div className="ntk-monitor-wallets">{owners.map(owner => { const wallet = byAddress.get(owner)!; const ownTrades = tokenTrades.filter(trade => trade.address === owner); return <div key={owner}><button className="ntk-identity" onClick={() => { setSelectedWallet(wallet); setModal("detail"); }}><TrackedWalletAvatar wallet={wallet} size={22}/><span>{wallet.name}</span></button><span><b className="ntk-positive">{ownTrades.filter(trade => trade.side === "Buy").length} buys</b><b className="ntk-negative">{ownTrades.filter(trade => trade.side === "Sell").length} sells</b></span></div>; })}</div></article>; })}{monitorTokens.length === 0 && <Empty title="No tokens in Monitor" body="Enable Monitor for a wallet, or try another search."/>}</div>}
      {tab === "X" && <div className="ntk-x-list">{shownProfiles.map(profile => <div className="ntk-x-row" key={profile.handle}>
        <button className="ntk-identity" onClick={() => { setSelectedProfile(profile); setModal("profile"); }}><img src={profile.avatar} width={32} height={32} alt=""/><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span></button>
        {profile.address ? <button className="ntk-x-address" onClick={() => copy(profile.address)}>{shortAccount(profile.address)}<Copy size={12}/></button> : <button className="ntk-x-address ntk-link-wallet" onClick={()=>openWalletLink(profile)}><LinkSimple size={12}/>Link wallet</button>}
        <div className="ntk-notification-control"><Bell size={14}/><button className="ntk-toggle" role="switch" aria-checked={notificationsOn(profile)} aria-label={`Notifications for ${profile.name}`} title="Notifications" onClick={()=>toggleNotifications(profile)}><span/></button></div>
        <button className="ntk-icon" aria-label={`View ${profile.name}'s X account`} onClick={() => { setSelectedProfile(profile); setModal("profile"); }}><XLogo size={14}/></button>
        <button className="ntk-icon ntk-remove" aria-label={`Remove ${profile.name} from X trackers`} title="Remove account" onClick={()=>{removeProfile(profile);setStatus(`${profile.name} removed`);}}><Trash size={15}/></button>
      </div>)}{shownProfiles.length === 0 && <Empty title="No X accounts in this view" body="Try another search or add an account."/>}</div>}
      <div className="ntk-footnote"><span role="status" aria-live="polite">{status}</span></div>
    </section>
    <dialog ref={dialog} className={`ntk-dialog${modal === "wallet" ? " ntk-add-wallet" : ""}`} aria-labelledby="ntk-dialog-title" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }}><div className="ntk-dialog-body"><header><h2 id="ntk-dialog-title">{modalTitle}</h2><button className="ntk-icon" onClick={() => setModal(null)} aria-label="Close dialog"><X size={17}/></button></header>
      {modal === "wallet" && <form className="ntk-add-wallet-form" onSubmit={submit} noValidate>
        <fieldset className="ntk-chain-picker"><legend>Chain</legend><div>{TRACKER_CHAINS.map(item=><label key={item}><input type="radio" name="wallet-chain" checked={chain===item} onChange={()=>{setChain(item);setError("");}}/><span><MarketChainIcon chain={item} size={15}/>{item==="Robinhood Chain"?"Robinhood":item}</span></label>)}</div></fieldset>
        <label className="ntk-field">Wallet address<input aria-label="Wallet address" value={address} onChange={event=>{setAddress(event.target.value);setError("");}} placeholder={chain === "NEAR" ? "name.near" : `${chain === "Robinhood Chain" ? "Robinhood" : chain} address`} spellCheck={false} autoComplete="off" autoCapitalize="none" autoFocus aria-invalid={!!error} aria-describedby={error?"ntk-wallet-error":undefined}/></label>
        <label className="ntk-field">Name<input aria-label="Wallet name" value={name} maxLength={32} onChange={event=>setName(event.target.value)} placeholder="WhaleGuy"/></label>
        <div className="ntk-avatar-builder">
          <div className="ntk-avatar-preview"><WalletMark shape={shape} color={color} size={52}/></div>
          <div className="ntk-avatar-options">
            <fieldset className="ntk-shape-picker"><legend>Shape</legend><div>{WALLET_SHAPES.map(item=><label key={item.value} title={item.label}><input type="radio" name="wallet-shape" aria-label={item.label} checked={shape===item.value} onChange={()=>setShape(item.value)}/><span><WalletMark shape={item.value} color={color} size={28}/></span></label>)}</div></fieldset>
            <fieldset className="ntk-color-picker"><legend>Color</legend><div>{WALLET_COLORS.map(item=><label key={item.value} title={item.label}><input type="radio" name="wallet-color" aria-label={item.label} checked={color===item.value} onChange={()=>setColor(item.value)}/><span><i style={{background:item.hex}}/></span></label>)}</div></fieldset>
          </div>
        </div>
        {error&&<p className="ntk-form-error" id="ntk-wallet-error" role="alert">{error}</p>}
        <button className="ntk-add-wallet-submit" type="submit" disabled={!address.trim()}>{editingWallet?"Save wallet":address.trim()?"Add wallet":"Paste an address"}</button>
      </form>}
      {modal === "link" && selectedProfile && <form onSubmit={submit}>
        <div className="ntk-detail-identity"><img src={selectedProfile.avatar} width={32} height={32} alt=""/><span><strong>{selectedProfile.name}</strong><span>@{selectedProfile.handle}</span></span></div>
        <label className="ntk-field">NEAR wallet address<input aria-label="Linked wallet address" value={address} onChange={event=>{setAddress(event.target.value);setError("");}} placeholder="name.near" autoComplete="off" autoCapitalize="none" spellCheck={false}/></label>
        {error && <p className="ntk-form-error" role="alert">{error}</p>}
        <div className="ntk-dialog-actions">{selectedProfile.address && <button className="ntk-button" type="button" onClick={()=>{linkWallet(selectedProfile,"");setStatus("Wallet unlinked");setModal(null);}}>Unlink wallet</button>}<button className="ntk-button" type="button" onClick={()=>setModal(null)}>Cancel</button><button className="ntk-button ntk-primary" type="submit" disabled={!address.trim()}>Save link</button></div>
      </form>}
      {(modal === "import" || modal === "x") && <form onSubmit={submit}>
        <p className="ntk-dialog-note">{modal === "x" ? "Add an X account and link a wallet to keep them together." : modal === "import" ? "Paste account IDs, one per line, with an optional name after each. You can also import a JSON wallet list." : "Add a NEAR account to your trackers."}</p>
        {modal !== "import" && <><label className="ntk-field">Name <span>Optional</span><input value={name} maxLength={32} onChange={event => setName(event.target.value)} placeholder="Display name" autoFocus/></label>{modal === "x" && <label className="ntk-field">X username<input value={handle} onChange={event => {setHandle(event.target.value);setError("");}} placeholder="@username" spellCheck={false} autoComplete="off" required/></label>}<label className="ntk-field">Linked NEAR account{modal === "x" && <span>Optional</span>}<input value={address} onChange={event => {setAddress(event.target.value);setError("");}} placeholder="name.near" spellCheck={false} autoComplete="off"/></label></>}
        {modal === "import" && <><textarea className="ntk-import-text" value={importText} onChange={event => {setImportText(event.target.value);setError("");}} aria-label="Wallet accounts to import" placeholder={'name.near Wallet name\nanother.near Another wallet'} autoFocus spellCheck={false}/><div className="ntk-import-options"><input ref={file} type="file" accept=".json,.txt,.csv" hidden onChange={async event => { const chosen = event.target.files?.[0]; if (!chosen) return; if (chosen.size > 1_000_000) { setError("Choose a wallet list smaller than 1 MB."); return; } try { setImportText(await chosen.text()); setError(""); } catch { setError("This file could not be read. Paste the wallet list instead."); } }}/><button className="ntk-button" type="button" onClick={() => file.current?.click()}><UploadSimple size={13}/>Choose file</button><span>{importable.length} new wallet{importable.length === 1 ? "" : "s"} found</span></div></>}
        {error && <p className="ntk-form-error" role="alert">{error}</p>}<div className="ntk-dialog-actions"><button className="ntk-button" type="button" onClick={() => setModal(null)}>Cancel</button><button className="ntk-button ntk-primary" type="submit" disabled={modal === "import" && !importable.length}>{modal === "x" ? "Save X account" : `Import ${importable.length || ""} wallet${importable.length === 1 ? "" : "s"}`}</button></div>
      </form>}
      {modal === "detail" && selectedWallet && <><div className="ntk-detail-identity"><TrackedWalletAvatar wallet={selectedWallet} size={42}/><span><strong>{selectedWallet.name}</strong><span className="ntk-wallet-address"><MarketChainIcon chain={selectedWallet.chain || "NEAR"} size={12}/>{selectedWallet.chain || "NEAR"}</span><span>{selectedWallet.address}</span></span><button className="ntk-icon" onClick={() => copy(selectedWallet.address)} aria-label="Copy wallet address"><Copy size={15}/></button></div><div className="ntk-detail-stats"><div><span>Balance</span><strong>{detailTrader ? `${nearAmount(detailTrader.balance)} NEAR` : "—"}</strong></div><div><span>7d PnL</span><strong className={detailTrader && detailTrader.pnl >= 0 ? "ntk-positive" : detailTrader ? "ntk-negative" : ""}>{detailTrader ? `${signedNear(detailTrader.pnl)} NEAR` : "—"}</strong></div><div><span>7d trades</span><strong>{detailTrader?.trades ?? "—"}</strong></div><div><span>Win rate</span><strong>{detailTrader ? `${Math.round(detailTrader.wins / detailTrader.trades * 100)}%` : "—"}</strong></div></div>{!detailTrader && <p className="ntk-dialog-note">Balance, positions and activity are unavailable yet.</p>}<div className="ntk-dialog-actions"><button className="ntk-button" onClick={()=>editWallet(selectedWallet)}><PencilSimple size={13}/>Edit wallet</button><button className="ntk-button" onClick={() => { setQuery(selectedWallet.name); setTab("Trades"); setModal(null); }}>View trades</button><a className="ntk-button ntk-primary" href="/leaderboard">Explore leaderboard</a></div></>}
      {modal === "profile" && selectedProfile && <><div className="ntk-detail-identity"><img src={selectedProfile.avatar} width={42} height={42} alt=""/><span><strong>{selectedProfile.name}</strong><span>@{selectedProfile.handle}</span></span></div><div className="ntk-linked-wallet"><span>Linked wallet</span><strong>{selectedProfile.address || "No wallet linked"}</strong></div><div className="ntk-dialog-actions ntk-profile-actions"><button className="ntk-button" onClick={()=>openWalletLink(selectedProfile)}><LinkSimple size={13}/>{selectedProfile.address?"Edit wallet link":"Link wallet"}</button>{!selectedProfile.fixture && <a className="ntk-button" href={`https://x.com/${selectedProfile.handle}`} target="_blank" rel="noreferrer">Open on X<ArrowSquareOut size={13}/></a>}<label className="ntk-notification-control"><Bell size={14}/><span>Notifications</span><button className="ntk-toggle" role="switch" aria-checked={notificationsOn(selectedProfile)} aria-label={`Notifications for ${selectedProfile.name}`} onClick={()=>toggleNotifications(selectedProfile)}><span/></button></label></div></>}
    </div></dialog>
  </main>;
}

function Empty({ title, body }: { title: string; body: string }) { return <div className="ntk-empty"><MagnifyingGlass size={22}/><strong>{title}</strong><p>{body}</p></div>; }
