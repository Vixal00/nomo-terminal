// All rates and balances are local simulation data, never network quotes.
export const ASSET_PRICES = { USDC: 1, NEAR: 4.7, SOL: 188, ETH: 3760, BASE: 3760, ROBINHOOD: 3760 };
export type CashAsset = keyof typeof ASSET_PRICES;
type TradeToken = { id: string; symbol: string; price: number };
export type LedgerEntry = { id: string; type: 'Buy' | 'Sell' | 'Bridge' | 'Send' | 'Deposit' | 'Convert'; tokenId?: string; asset: string; amount: number; value: number; at: number; pnl?: number; cost?: number; recipient?: string };
export type Ledger = { assets: Record<CashAsset, number>; positions: Record<string, { amount: number; cost: number; openedAt: number }>; history: LedgerEntry[] };
export type WalletOperation = { type: 'Buy' | 'Sell'; token: TradeToken; amount: number; currency: 'USDC' | 'NEAR'; fee?: number } | { type: 'Bridge' | 'Send' | 'Deposit' | 'Convert'; asset: string; amount: number; recipient?: string };
export type WalletResult = { ok: true; state: Ledger; entry: LedgerEntry } | { ok: false; state: Ledger; error: string };
export function createLedger(): Ledger {
 return { assets: {USDC:1250,NEAR:0,SOL:5,ETH:.25,BASE:.25,ROBINHOOD:.25}, positions: {nearly:{amount:15000,cost:48,openedAt:0},sight:{amount:50000,cost:50,openedAt:0}}, history:[] };
}
export function applyOperation(previous: Ledger, operation: WalletOperation): WalletResult {
 const fail=(error:string): WalletResult=>({ok:false,state:previous,error});
 const {amount,type}=operation;
 if(!Number.isFinite(amount)||amount<=0) return fail('Enter an amount greater than zero.');
 const state:Ledger={assets:{...previous.assets},positions:Object.fromEntries(Object.entries(previous.positions).map(([key,value])=>[key,{...value}])),history:[...previous.history]};
 const at=Date.now();
 const entry:LedgerEntry={id:`${at}-${previous.history.length}`,type,asset:'',amount,value:0,at};
 if('token' in operation){
  const {token,currency}=operation; const fee=operation.fee??0;
  if(!Number.isFinite(token.price)||token.price<=0||!Number.isFinite(fee)||fee<0||fee>=1) return fail('A valid price is required.');
  const usd=ASSET_PRICES[currency];
  const position=state.positions[token.id]??{amount:0,cost:0,openedAt:at};
  entry.tokenId=token.id;entry.asset=token.symbol;
  if(type==='Buy'){
   if(amount>state.assets[currency])return fail('Amount exceeds your available balance.');
   const quantity=amount*usd*(1-fee)/token.price;
   if(!Number.isFinite(quantity)||quantity<=0)return fail('Amount is too large.');
   state.assets[currency]-=amount;
   state.positions[token.id]={amount:position.amount+quantity,cost:position.cost+amount*usd,openedAt:position.amount?position.openedAt:at};
   entry.amount=quantity;entry.value=amount*usd;
  }else{
   if(amount>position.amount)return fail('Amount exceeds your token balance.');
   const cost=position.cost*amount/position.amount;
   const proceeds=amount*token.price*(1-fee);
   if(!Number.isFinite(proceeds))return fail('Amount is too large.');
   state.assets[currency]+=proceeds/usd;
   state.positions[token.id]={...position,amount:Math.max(0,position.amount-amount),cost:Math.max(0,position.cost-cost)};
   entry.value=proceeds;entry.pnl=proceeds-cost;entry.cost=cost;
  }
 }else{
  const {asset,recipient}=operation;
  const cash=Object.hasOwn(ASSET_PRICES,asset);const cashAsset=asset as CashAsset;
  const balance=cash?state.assets[cashAsset]:state.positions[asset]?.amount??0;
  if(type!=='Deposit' && type!=='Convert' && (!recipient || !(/^[a-f0-9]{64}$/.test(recipient)||recipient.length<=64&&/^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*\.near$/.test(recipient)))) return fail('Enter a valid NEAR recipient.');
  if(type!=='Deposit' && amount>balance)return fail('Amount exceeds your available balance.');
  if(type==='Bridge' && !['SOL','ETH','BASE','ROBINHOOD'].includes(asset))return fail('Choose a source network.');
  if(type==='Deposit' && !cash)return fail('Choose a supported asset.');
  entry.asset=asset;entry.recipient=recipient;entry.value=cash?amount*ASSET_PRICES[cashAsset]:balance?state.positions[asset].cost*amount/balance:0;
  if(!Number.isFinite(entry.value))return fail('Amount is too large.');
  if(cash)state.assets[cashAsset]+=type==='Deposit'?amount:-amount;
  else {state.positions[asset].amount-=amount;state.positions[asset].cost*=1-amount/balance;entry.tokenId=asset;}
  if(type==='Convert'){if(asset!=='USDC')return fail('Choose USDC to convert.');state.assets.NEAR+=amount/ASSET_PRICES.NEAR;}
  if(type==='Bridge')state.assets.NEAR+=amount*(asset==='SOL'?40:800)*.99;
 }
 state.history=[entry,...state.history].slice(0,500);
 return {ok:true,state,entry};
}
