"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle, CopySimple, ImageSquare, Info, LinkSimple, Plus, RocketLaunch, Wallet, X } from "@phosphor-icons/react";
import { NearIcon, SolanaIcon } from "./brand-icons";
import "./create-pair.css";

type Draft={name:string;symbol:string;description:string;website:string;x:string;telegram:string;firstBuy:string};
const initial:Draft={name:"",symbol:"",description:"",website:"",x:"",telegram:"",firstBuy:""};
export function CreatePairWorkspace(){
  const [draft,setDraft]=useState<Draft>(initial);
  const [art,setArt]=useState<string|null>(null);
  const [artName,setArtName]=useState("");
  const [imageError,setImageError]=useState("");
  const [links,setLinks]=useState(false);
  const [hasWallet,setHasWallet]=useState(false);
  const [direction,setDirection]=useState<"Add NEAR"|"Withdraw to NEAR">("Add NEAR");
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
  useEffect(()=>{try {const saved=JSON.parse(sessionStorage.getItem("nomo.pairDraft")||"null");if(saved&&saved.draft&&typeof saved.art==="string"&&/^data:image\/(png|jpeg|gif|webp);base64,/.test(saved.art)){const restored={...initial};for(const key of Object.keys(initial) as (keyof Draft)[])if(typeof saved.draft[key]==="string")restored[key]=saved.draft[key];setDraft(restored);setArt(saved.art);setArtName(typeof saved.artName==="string"?saved.artName:"Saved artwork");setHasWallet(true);setLinks(!!(restored.website||restored.x||restored.telegram));}}catch{}},[]);
  const saveDraft=async()=>{setSaving(true);setSaveError("");try{let savedArt=art;const selected=acceptedImage.current;if(selected)savedArt=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Image read failed"));reader.readAsDataURL(selected);});sessionStorage.setItem("nomo.pairDraft",JSON.stringify({draft,art:savedArt,artName}));setSaved(true);}catch{setSaveError("Could not save this draft in browser storage. Your details are still in the editor.");}finally{setSaving(false);}};

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
  return <main className="nc-page">
    <div className="nc-page-heading"><div><p className="nc-eyebrow">LAUNCH ON YOUR TERMS</p><h1>Create a NEAR pair</h1><p>Give your next idea a market. A Solana pair, quoted in NEAR.</p></div></div>
    <div className="nc-layout">
      <form className="nc-form" onSubmit={submit} noValidate>
        <div className="nc-section-heading"><span className="nc-step">01</span><div><h2>The essentials</h2><p>A name, a ticker, a first impression.</p></div></div>
        <div className="nc-name-fields"><label className="nc-field"><span>Name<small>{draft.name.length}/32</small></span><input aria-label="Token name" placeholder="Nomo Cat" value={draft.name} maxLength={32} onChange={event=>update("name",event.target.value)}/></label><label className="nc-field"><span>Symbol<small>{draft.symbol.length}/10</small></span><div className="nc-symbol-input"><i>$</i><input aria-label="Token symbol" placeholder="NCAT" value={draft.symbol} maxLength={10} onChange={event=>update("symbol",event.target.value.toUpperCase())}/></div></label></div>
        <label className="nc-field nc-description"><span>Description <small>{draft.description.length}/600</small></span><textarea aria-label="Token description" maxLength={600} placeholder="What’s the story behind your coin?" value={draft.description} onChange={event=>update("description",event.target.value)}/></label>
        <div className="nc-upload"><div className="nc-art-preview">{art?<img src={art} alt="Token artwork"/>:<ImageSquare size={29} weight="light"/>}</div><div><strong>Token image</strong><p>{artName||"PNG, JPEG, GIF or WebP · up to 1.5 MB"}</p><button type="button" className="nc-small-button" onClick={()=>file.current?.click()}><Plus size={12}/>{art?"Change image":"Choose image"}</button></div>{art&&<button type="button" className="nc-image-remove" aria-label="Remove token image" onClick={()=>{setArt(null);setArtName("");acceptedImage.current=null;if(file.current)file.current.value="";}}><X size={14}/></button>}<input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Token image" hidden onChange={event=>{const selected=event.target.files?.[0];if(!selected)return;if(!["image/png","image/jpeg","image/gif","image/webp"].includes(selected.type)||selected.size>1.5*1024*1024){setImageError("Choose a PNG, JPEG, GIF or WebP image under 1.5 MB.");event.target.value="";return;}acceptedImage.current=selected;setArt(URL.createObjectURL(selected));setArtName(selected.name);setImageError("");setFormError("");setSaved(false);}}/></div>
        {imageError&&<p className="nc-error" role="alert">{imageError}</p>}
        <button type="button" className="nc-links-toggle" aria-expanded={links} onClick={()=>setLinks(value=>!value)}><LinkSimple size={14}/>Social links <span>Optional</span><Plus size={12} style={{transform:links?"rotate(45deg)":undefined}}/></button>
        {links&&<div className="nc-link-fields">{([['website','Website','https://yourcoin.com'],['x','X','https://x.com/yourcoin'],['telegram','Telegram link','https://t.me/yourcoin']] as const).map(([key,label,placeholder])=><label className="nc-field" key={key}><span>{label}</span><input type="url" aria-label={label} placeholder={placeholder} value={draft[key]} onChange={event=>update(key,event.target.value)}/></label>)}</div>}
        <div className="nc-section-heading nc-second-section"><span className="nc-step">02</span><div><h2>Your first move</h2><p>Make an optional first buy at launch.</p></div></div>
        <label className="nc-field"><span>First buy <small>Optional</small></span><div className="nc-amount-input"><input type="number" min="0" step="any" inputMode="decimal" aria-label="First buy in NEAR" placeholder="0.00" value={draft.firstBuy} onChange={event=>update("firstBuy",event.target.value)}/><span><NearIcon size={13}/>NEAR</span></div></label>
        <div className="nc-fees"><span>Pair creation <strong>Free</strong></span><span>First buy fee <strong>{fee>0?`${fee.toLocaleString("en-US",{maximumFractionDigits:6})} NEAR`:"1%"}</strong></span></div>
        <p className="nc-note">A first buy is included in the launch transaction. Review the details before publishing.</p>
        {formError&&<p role="alert" className="nc-error">{formError}</p>}
        {hasWallet?<button type="submit" className="nc-primary"><RocketLaunch size={15}/>Review pair<ArrowRight size={14}/></button>:<button type="button" className="nc-primary" onClick={setup}><Wallet size={15}/>Set up trading wallet<ArrowRight size={14}/></button>}
      </form>
      <aside className="nc-sidebar">
        <section className="nc-wallet-panel"><div className="nc-panel-heading"><span className="nc-network-icon"><SolanaIcon size={18}/></span><div><h2>Solana trading wallet</h2><p>For NEAR and your NEAR pairs</p></div></div>
          {hasWallet?<><div className="nc-wallet-address"><span>••••••••…••••••••</span><button disabled aria-label="Copy trading wallet address" title="Connect a wallet to copy its address"><CopySimple size={13}/></button><small>Not connected</small></div><div className="nc-balances"><span>NEAR on Solana<strong>0 <small>NEAR</small></strong></span><span>NEAR wallet<strong>0 <small>NEAR</small></strong></span></div><div className="nc-transfer-tabs" role="group" aria-label="Transfer direction">{(["Add NEAR","Withdraw to NEAR"] as const).map(value=><button type="button" key={value} aria-pressed={direction===value} onClick={()=>{setDirection(value);setTransferNote("");}}>{value}</button>)}</div><div className="nc-transfer-card"><label htmlFor="nc-transfer-amount">From your {direction==="Add NEAR"?"NEAR":"Solana"} wallet</label><div><input id="nc-transfer-amount" type="number" min="0" step="any" inputMode="decimal" placeholder="0.0" value={transfer} onChange={event=>{setTransfer(event.target.value);setTransferNote("");}}/><span>NEAR</span></div><small>Available 0 NEAR <button onClick={()=>setTransfer("0")}>Max</button></small></div><ArrowDown className="nc-transfer-arrow" size={14}/><div className="nc-receive"><span>To your {direction==="Add NEAR"?"Solana":"NEAR"} wallet</span><strong>{Number(transfer)>0?Number(transfer).toLocaleString("en-US",{maximumFractionDigits:6}):"—"} <small>NEAR</small></strong></div><button className="nc-secondary" disabled={!Number.isFinite(Number(transfer))||Number(transfer)<=0} onClick={()=>setTransferNote(`Transfer review: ${Number(transfer).toLocaleString()} NEAR to ${direction==="Add NEAR"?"Solana":"NEAR"}. Funding is required. No assets moved.`)}>Review transfer</button>{transferNote&&<p className="nc-note" role="status">{transferNote}</p>}</>:<div className="nc-setup"><Wallet size={25} weight="light"/><strong>A separate space for your pairs</strong><p>Add NEAR to your trading wallet and prepare your first pair.</p><button className="nc-secondary" onClick={setup}>Set up wallet<Plus size={13}/></button></div>}
          
        </section>
        <section className="nc-how"><h2>From idea to first trade</h2><ol><li><span>1</span><div><strong>Make it yours</strong><p>Add your name, ticker and artwork.</p></div></li><li><span>2</span><div><strong>Choose your first buy</strong><p>An optional head start, quoted in NEAR.</p></div></li><li><span>3</span><div><strong>Review your launch</strong><p>Check every detail before signing.</p></div></li><li><span>4</span><div><strong>Find it in NEAR pairs</strong><p>The planned destination for your new market.</p></div></li></ol></section>
      </aside>
    </div>
    <dialog ref={dialog} className="nc-review-dialog" aria-labelledby="nc-review-title" onCancel={()=>setReview(false)} onClick={event=>{const box=event.currentTarget.getBoundingClientRect();if(event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))setReview(false);}}><button className="nc-review-close" onClick={()=>setReview(false)} aria-label="Close pair review"><X size={18}/></button>{saved?<><CheckCircle className="nc-review-success" size={34}/><h2 id="nc-review-title">Your pair draft is ready</h2><p>Saved in this browser session. No token was created and no transaction was submitted.</p><button className="nc-primary" onClick={()=>setReview(false)}>Back to editor</button></>:<><p className="nc-eyebrow">LAUNCH REVIEW</p><h2 id="nc-review-title">One last look.</h2><div className="nc-review-token">{art&&<img src={art} alt="Token artwork"/>}<div><strong>{draft.name}</strong><span>${draft.symbol} / NEAR</span></div><SolanaIcon size={19}/></div>{draft.description&&<p className="nc-review-description">{draft.description}</p>}<dl><div><dt>Network</dt><dd>Solana</dd></div><div><dt>Quote token</dt><dd>NEAR</dd></div><div><dt>First buy</dt><dd>{firstBuy.toLocaleString()} NEAR</dd></div><div><dt>First buy fee (1%)</dt><dd>{fee.toLocaleString("en-US",{maximumFractionDigits:6})} NEAR</dd></div><div><dt>Pair creation</dt><dd>Free</dd></div></dl><p className="nc-note">Save your draft to return to it later.</p>{saveError&&<p className="nc-error" role="alert">{saveError}</p>}<div className="nc-review-actions"><button className="nc-secondary" onClick={()=>setReview(false)}><ArrowLeft size={13}/>Edit details</button><button className="nc-primary" disabled={saving} onClick={()=>void saveDraft()}>{saving?"Saving…":"Save draft"}<Check size={13}/></button></div></>}</dialog>
  </main>;
}
