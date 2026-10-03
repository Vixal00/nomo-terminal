"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle, CopySimple, ImageSquare, LinkSimple, Plus, RocketLaunch, Wallet, X } from "@phosphor-icons/react";
import { MarketChainIcon, NearIcon } from "./brand-icons";
import "./create-pair.css";

type Draft={name:string;symbol:string;description:string;website:string;x:string;telegram:string;firstBuy:string};
const initial:Draft={name:"",symbol:"",description:"",website:"",x:"",telegram:"",firstBuy:""};
const QUOTE_PAIRS = [
  { id: "near", label: "NEAR", symbol: "NEAR", network: "NEAR", chain: "NEAR" },
  { id: "solana", label: "Solana", symbol: "SOL", network: "Solana", chain: "Solana" },
  { id: "robinhood", label: "Robinhood", symbol: "ETH", network: "Robinhood", chain: "Robinhood Chain" },
] as const;
type QuotePair = (typeof QUOTE_PAIRS)[number];
function QuoteIcon({ pair, size = 18, currency = false }: { pair: QuotePair; size?: number; currency?: boolean }) {
  return pair.id === "near" ? <NearIcon size={size}/> : <MarketChainIcon chain={currency && pair.id === "robinhood" ? "Ethereum" : pair.chain} size={size}/>;
}
export function CreatePairWorkspace(){
  const [step,setStep]=useState<"quote"|"details">("quote");
  const [choice,setChoice]=useState<QuotePair["id"]|null>(null);
  const [quoteId,setQuoteId]=useState<QuotePair["id"]>("near");
  const pair=QUOTE_PAIRS.find(item=>item.id===quoteId)!;
  const heading=useRef<HTMLHeadingElement>(null);
  const previousStep=useRef(step);
  useEffect(()=>{if(previousStep.current!==step){heading.current?.focus();previousStep.current=step;}},[step]);
  const [draft,setDraft]=useState<Draft>(initial);
  const [art,setArt]=useState<string|null>(null);
  const [artName,setArtName]=useState("");
  const [imageError,setImageError]=useState("");
  const [links,setLinks]=useState(false);
  const [hasWallet,setHasWallet]=useState(false);
  const [direction,setDirection]=useState<"add"|"withdraw">("add");
  const [transfer,setTransfer]=useState("");
  const [transferNote,setTransferNote]=useState("");
  const [formError,setFormError]=useState("");
  const [review,setReview]=useState(false);
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const file=useRef<HTMLInputElement>(null);
  const acceptedImage=useRef<File|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(copyTimer.current)clearTimeout(copyTimer.current);},[]);
  useEffect(()=>{try {const saved=JSON.parse(sessionStorage.getItem("nomo.pairDraft")||"null");if(saved&&saved.draft&&typeof saved.art==="string"&&/^data:image\/(png|jpeg|gif|webp);base64,/.test(saved.art)){const restored={...initial};for(const key of Object.keys(initial) as (keyof Draft)[])if(typeof saved.draft[key]==="string")restored[key]=saved.draft[key];const restoredPair=QUOTE_PAIRS.find(item=>item.id===saved.quotePair)||QUOTE_PAIRS[0];setQuoteId(restoredPair.id);setChoice(restoredPair.id);setDraft(restored);setArt(saved.art);setArtName(typeof saved.artName==="string"?saved.artName:"Saved artwork");setHasWallet(true);setLinks(!!(restored.website||restored.x||restored.telegram));}}catch{}},[]);
  const saveDraft=async()=>{setSaving(true);setSaveError("");try{let savedArt=art;const selected=acceptedImage.current;if(selected)savedArt=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Image read failed"));reader.readAsDataURL(selected);});sessionStorage.setItem("nomo.pairDraft",JSON.stringify({draft,art:savedArt,artName,quotePair:quoteId}));setSaved(true);}catch{setSaveError("Could not save this draft in browser storage. Your details are still in the editor.");}finally{setSaving(false);}};

  useEffect(()=>()=>{if(art)URL.revokeObjectURL(art);},[art]);
  useEffect(()=>{if(review)dialog.current?.showModal();else dialog.current?.close();},[review]);
  const update=(key:keyof Draft,value:string)=>{setDraft(current=>({...current,[key]:value}));setFormError("");setSaved(false);};
  const firstBuy=Number(draft.firstBuy||0);
  const fee=Number.isFinite(firstBuy)?firstBuy*.01:0;
  const setup=()=>{setHasWallet(true);setFormError("");};
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    if(!draft.name.trim()||!draft.symbol.trim())return setFormError("Add a name and symbol for your pair.");
    if(!/^[A-Za-z0-9]{1,10}$/.test(draft.symbol))return setFormError("Use 1–10 letters or numbers for the symbol.");
    if(!art)return setFormError("Choose an image for your token.");
    if(!Number.isFinite(firstBuy)||firstBuy<0)return setFormError("First buy must be zero or a positive amount.");
    for(const key of ["website","x","telegram"] as const){if(draft[key].trim()){try{const url=new URL(draft[key]);if(!["https:","http:"].includes(url.protocol))throw new Error();}catch{return setFormError("Use a full http or https URL for each optional link.");}}}
    if(!hasWallet)return setFormError("Set up a trading wallet before reviewing your pair.");
    setSaved(false);setSaveError("");setReview(true);
  };
  const continueToDetails=(event:FormEvent)=>{
    event.preventDefault();
    if(!choice)return;
    if(choice!==quoteId){
      setDraft(current=>({...current,firstBuy:""}));
      setHasWallet(false);setDirection("add");setTransfer("");setTransferNote("");
      setSaved(false);setFormError("");setSaveError("");
    }
    setQuoteId(choice);setStep("details");
  };
  return <main className={`nc-page${step==="quote"?" nc-quote-page":""}`}>
    <ol className="nc-flow-steps" aria-label="Create pair progress"><li aria-current={step==="quote"?"step":undefined}><span>1</span>Quote pair</li><li aria-current={step==="details"?"step":undefined}><span>2</span>Token details</li></ol>
    <div className="nc-page-heading"><h1 ref={heading} tabIndex={-1}>{step==="quote"?"Create a pair":`Create ${pair.symbol==="ETH"?"an":"a"} ${pair.symbol} pair`}</h1>{step==="details"&&<button type="button" className="nc-change-quote" aria-label="Change quote pair" onClick={()=>setStep("quote")}><QuoteIcon pair={pair} size={16}/>{pair.label}<span>Change</span><ArrowLeft size={12}/></button>}</div>
    {step==="quote"?<form className="nc-quote-picker" onSubmit={continueToDetails}>
      <fieldset><legend>Choose your quote pair</legend><p>Select the currency your token will trade against.</p><div className="nc-quote-options">{QUOTE_PAIRS.map(option=><label className="nc-quote-option" key={option.id}>
        <input type="radio" name="quote-pair" value={option.id} checked={choice===option.id} onChange={()=>setChoice(option.id)}/>
        <span className="nc-quote-card"><span className="nc-quote-mark"><QuoteIcon pair={option} size={30}/></span><span className="nc-quote-check"><Check size={12}/></span><strong>{option.label}</strong><small>{option.symbol} quote</small></span>
      </label>)}</div></fieldset>
      <div className="nc-quote-footer"><span>{choice?`${QUOTE_PAIRS.find(option=>option.id===choice)!.symbol} will be used for your first buy and pair pricing.`:"Choose a quote pair to continue."}</span><button type="submit" className="nc-primary" disabled={!choice}>Continue<ArrowRight size={14}/></button></div>
    </form>:<div className="nc-layout">
      <form className="nc-form" onSubmit={submit} noValidate>
        <div className="nc-section-heading"><span className="nc-step">01</span><div><h2>The essentials</h2><p>A name, a ticker, a first impression.</p></div></div>
        <div className="nc-name-fields"><label className="nc-field"><span>Name<small>{draft.name.length}/32</small></span><input aria-label="Token name" placeholder="Nomo Cat" value={draft.name} maxLength={32} onChange={event=>update("name",event.target.value)}/></label><label className="nc-field"><span>Symbol<small>{draft.symbol.length}/10</small></span><div className="nc-symbol-input"><i>$</i><input aria-label="Token symbol" placeholder="NCAT" value={draft.symbol} maxLength={10} onChange={event=>update("symbol",event.target.value.toUpperCase())}/></div></label></div>
        <label className="nc-field nc-description"><span>Description <small>{draft.description.length}/600</small></span><textarea aria-label="Token description" maxLength={600} placeholder="What’s the story behind your coin?" value={draft.description} onChange={event=>update("description",event.target.value)}/></label>
        <div className="nc-upload"><div className="nc-art-preview">{art?<img src={art} alt="Token artwork"/>:<ImageSquare size={29} weight="light"/>}</div><div><strong>Token image</strong><p>{artName||"PNG, JPEG, GIF or WebP · up to 1.5 MB"}</p><button type="button" className="nc-small-button" onClick={()=>file.current?.click()}><Plus size={12}/>{art?"Change image":"Choose image"}</button></div>{art&&<button type="button" className="nc-image-remove" aria-label="Remove token image" onClick={()=>{setArt(null);setArtName("");acceptedImage.current=null;if(file.current)file.current.value="";}}><X size={14}/></button>}<input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Token image" hidden onChange={event=>{const selected=event.target.files?.[0];if(!selected)return;if(!["image/png","image/jpeg","image/gif","image/webp"].includes(selected.type)||selected.size>1.5*1024*1024){setImageError("Choose a PNG, JPEG, GIF or WebP image under 1.5 MB.");event.target.value="";return;}acceptedImage.current=selected;setArt(URL.createObjectURL(selected));setArtName(selected.name);setImageError("");setFormError("");setSaved(false);}}/></div>
        {imageError&&<p className="nc-error" role="alert">{imageError}</p>}
        <button type="button" className="nc-links-toggle" aria-expanded={links} onClick={()=>setLinks(value=>!value)}><LinkSimple size={14}/>Social links <span>Optional</span><Plus size={12} style={{transform:links?"rotate(45deg)":undefined}}/></button>
        {links&&<div className="nc-link-fields">{([['website','Website','https://yourcoin.com'],['x','X','https://x.com/yourcoin'],['telegram','Telegram link','https://t.me/yourcoin']] as const).map(([key,label,placeholder])=><label className="nc-field" key={key}><span>{label}</span><input type="url" aria-label={label} placeholder={placeholder} value={draft[key]} onChange={event=>update(key,event.target.value)}/></label>)}</div>}
        <div className="nc-section-heading nc-second-section"><span className="nc-step">02</span><div><h2>Your first move</h2><p>Make an optional first buy at launch.</p></div></div>
        <label className="nc-field"><span>First buy <small>Optional</small></span><div className="nc-amount-input"><input type="number" min="0" step="any" inputMode="decimal" aria-label={`First buy in ${pair.symbol}`} placeholder="0.00" value={draft.firstBuy} onChange={event=>update("firstBuy",event.target.value)}/><span><QuoteIcon pair={pair} size={13} currency/>{pair.symbol}</span></div></label>
        <div className="nc-fees"><span>Pair creation <strong>Free</strong></span><span>First buy fee <strong>{fee>0?`${fee.toLocaleString("en-US",{maximumFractionDigits:6})} ${pair.symbol}`:"1%"}</strong></span></div>
        <p className="nc-note">A first buy is included in the launch transaction. Review the details before publishing.</p>
        {formError&&<p role="alert" className="nc-error">{formError}</p>}
        {hasWallet?<button type="submit" className="nc-primary"><RocketLaunch size={15}/>Review pair<ArrowRight size={14}/></button>:<button type="button" className="nc-primary" onClick={event=>{event.preventDefault();setup();}}><Wallet size={15}/>Set up trading wallet<ArrowRight size={14}/></button>}
      </form>
      <aside className="nc-sidebar">
        <section className="nc-wallet-panel"><div className="nc-panel-heading"><span className="nc-network-icon"><QuoteIcon pair={pair} size={18}/></span><div><h2>{pair.network} trading wallet</h2><p>For your {pair.symbol} pairs</p></div></div>
          {hasWallet?<><div className="nc-wallet-address"><span>••••••••…••••••••</span><button disabled aria-label="Copy trading wallet address" title="Connect a wallet to copy its address"><CopySimple size={13}/></button><small>Not connected</small></div><div className="nc-balances"><span>Trading balance<strong>0 <small>{pair.symbol}</small></strong></span><span>{pair.network} wallet<strong>0 <small>{pair.symbol}</small></strong></span></div><div className="nc-transfer-tabs" role="group" aria-label="Transfer direction">{(["add","withdraw"] as const).map(value=><button type="button" key={value} aria-pressed={direction===value} onClick={()=>{setDirection(value);setTransferNote("");}}>{value==="add"?"Add":"Withdraw"} {pair.symbol}</button>)}</div><div className="nc-transfer-card"><label htmlFor="nc-transfer-amount">From your {pair.network} {direction==="add"?"wallet":"trading wallet"}</label><div><input id="nc-transfer-amount" type="number" min="0" step="any" inputMode="decimal" placeholder="0.0" value={transfer} onChange={event=>{setTransfer(event.target.value);setTransferNote("");}}/><span>{pair.symbol}</span></div><small>Available 0 {pair.symbol} <button onClick={()=>setTransfer("0")}>Max</button></small></div><ArrowDown className="nc-transfer-arrow" size={14}/><div className="nc-receive"><span>To your {pair.network} {direction==="add"?"trading wallet":"wallet"}</span><strong>{Number(transfer)>0?Number(transfer).toLocaleString("en-US",{maximumFractionDigits:6}):"—"} <small>{pair.symbol}</small></strong></div><button className="nc-secondary" disabled={!Number.isFinite(Number(transfer))||Number(transfer)<=0} onClick={()=>setTransferNote(`Transfer review: ${Number(transfer).toLocaleString()} ${pair.symbol} to your ${pair.network} ${direction==="add"?"trading wallet":"wallet"}. Funding is required. No assets moved.`)}>Review transfer</button>{transferNote&&<p className="nc-note" role="status">{transferNote}</p>}</>:<div className="nc-setup"><Wallet size={25} weight="light"/><strong>A separate space for your pairs</strong><p>Add {pair.symbol} to your trading wallet and prepare your first pair.</p><button className="nc-secondary" onClick={setup}>Set up wallet<Plus size={13}/></button></div>}
          
        </section>
        <section className="nc-how"><h2>From idea to first trade</h2><ol><li><span>1</span><div><strong>Make it yours</strong><p>Add your name, ticker and artwork.</p></div></li><li><span>2</span><div><strong>Choose your first buy</strong><p>An optional head start, quoted in {pair.symbol}.</p></div></li><li><span>3</span><div><strong>Review your launch</strong><p>Check every detail before signing.</p></div></li></ol></section>
      </aside>
    </div>}
    <dialog ref={dialog} className="nc-review-dialog" aria-labelledby="nc-review-title" onCancel={()=>setReview(false)} onClick={event=>{const box=event.currentTarget.getBoundingClientRect();if(event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))setReview(false);}}><button className="nc-review-close" onClick={()=>setReview(false)} aria-label="Close pair review"><X size={18}/></button>{saved?<><CheckCircle className="nc-review-success" size={34}/><h2 id="nc-review-title">Your pair draft is ready</h2><p>Saved in this browser session. No token was created and no transaction was submitted.</p><button className="nc-primary" onClick={()=>setReview(false)}>Back to editor</button></>:<><p className="nc-eyebrow">LAUNCH REVIEW</p><h2 id="nc-review-title">One last look.</h2><div className="nc-review-token">{art&&<img src={art} alt="Token artwork"/>}<div><strong>{draft.name}</strong><span>${draft.symbol} / {pair.symbol}</span></div><QuoteIcon pair={pair} size={19}/></div>{draft.description&&<p className="nc-review-description">{draft.description}</p>}<dl><div><dt>Network</dt><dd>{pair.network}</dd></div><div><dt>Quote token</dt><dd>{pair.symbol}</dd></div><div><dt>First buy</dt><dd>{firstBuy.toLocaleString()} {pair.symbol}</dd></div><div><dt>First buy fee (1%)</dt><dd>{fee.toLocaleString("en-US",{maximumFractionDigits:6})} {pair.symbol}</dd></div><div><dt>Pair creation</dt><dd>Free</dd></div></dl><p className="nc-note">Save your draft to return to it later.</p>{saveError&&<p className="nc-error" role="alert">{saveError}</p>}<div className="nc-review-actions"><button className="nc-secondary" onClick={()=>setReview(false)}><ArrowLeft size={13}/>Edit details</button><button className="nc-primary" disabled={saving} onClick={()=>void saveDraft()}>{saving?"Saving…":"Save draft"}<Check size={13}/></button></div></>}</dialog>
  </main>;
}
