/** Illustrative market snapshot shared by the three local design proposals. */
export type MarketStage = "New" | "Graduating" | "Established";
export const MARKET_CHAINS = ["Solana", "NEAR", "Ethereum", "Base", "Robinhood Chain"] as const;
export type MarketChain = typeof MARKET_CHAINS[number];
export const TIMEFRAMES = ["1m", "5m", "30m", "1h", "24h"] as const;
export type Token = {
  id: string; symbol: string; name: string; image: string; color: string; chain: MarketChain;
  price: number; mcap: number; totalSupply: number; volume: number; liquidity: number; holders: number;
  change1m: number; change5m: number; change30m: number; change1h: number; change24h: number; age: string;
  stage: MarketStage; progress: number; buys: number; sells: number; points: number[];
  direction?: 1 | -1; updatedAtTick?: number;
  top10Pct: number; devPct: number; snipersPct: number; bundlersPct: number;
  /** Illustrative wallet tags and listing status, not measured on-chain classifications. */
  insidersPct: number; freshWalletPct: number; phishingPct: number; dexPaid: boolean; botTraders: number;
  athMcap: number; fees: number; launchpad: string; contract: string;
};
/** Flat placeholder portraits already included in the copied asset library. */
export const TOKEN_PORTRAITS: Record<string, string> = {
  nearly: "/art/coins/p65.webp", sight: "/art/coins/p11.webp",
  ribbit: "/art/coins/p34.webp", orbit: "/art/coins/p69.webp",
  shroom: "/art/coins/p12.webp", wave: "/art/coins/p68.webp",
  ember: "/art/coins/p03.webp", telly: "/art/coins/p16.webp",
  solar: "/art/coins/p29.webp", prism: "/art/coins/p57.webp",
  heart: "/art/coins/p78.webp", octo: "/art/coins/p24.webp",
  dice: "/art/coins/p77.webp", nomo: "/art/coins/p07.webp",
  sprout: "/art/coins/p72.webp", moon: "/art/coins/p73.webp",
  flow: "/art/coins/p43.webp", lucky: "/art/coins/p42.webp",
};
// The 1m and 30m columns are authored fixture changes, including short-term reversals.
const seeds: [string,string,string,number,number,number,number,number,number,MarketStage,string,string][] = [
  ["NEARLY","Nearly there","nearly",.00482,4820000,1280000,.18,10.73,24.82,"Established","3d","#a6dfcc"],
  ["SIGHT","In plain sight","sight",.00137,1370000,842000,-.64,29.42,68.41,"Established","18h","#a8b9b8"],
  ["RIBBIT","Frog fiesta","ribbit",.0000824,82400,126000,.89,19.6,42.67,"Graduating","42m","#82be74"],
  ["ORBIT","Out of orbit","orbit",.0000631,63100,98500,-.21,4.89,18.34,"Graduating","1h","#b3a0ec"],
  ["SHROOM","Shroom world","shroom",.0000218,21800,34200,3.96,65.18,126.80,"New","6m","#e9b89d"],
  ["WAVE","Make waves","wave",.000718,718000,245000,-.37,-2.7,-8.52,"Established","2d","#8cc6ec"],
  ["EMBER","Keep it burning","ember",.0000514,51400,72200,.63,14.4,31.28,"Graduating","28m","#eda179"],
  ["TELLY","Stay tuned","telly",.00000836,8360,12400,2.41,46.27,84.12,"New","3m","#e2cd77"],
  ["SOLAR","Solar season","solar",.000246,246000,181000,-.09,4.01,12.43,"Established","9h","#ebae79"],
  ["PRISM","A new spectrum","prism",.0000742,74200,115000,.16,-1.71,-4.76,"Graduating","54m","#dfb4e9"],
  ["HEART","Love the trade","heart",.0000156,15600,23800,1.23,24.76,56.20,"New","8m","#ed9daa"],
  ["OCTO","Eight moves ahead","octo",.000592,592000,314000,.24,8.36,22.17,"Established","1d","#c9a8d9"],
  ["DICE","One more roll","dice",.0000472,47200,68300,-.14,2.83,9.84,"Graduating","32m","#ced3d6"],
  ["NOMO","Never miss a move","nomo",.00214,2140000,965000,.72,14.19,37.62,"Established","7d","#1cf431"],
  ["SPROUT","Just getting started","shroom",.0000124,12400,18300,2.09,39.28,73.50,"New","4m","#a8d194"],
  ["MOON","See you up there","orbit",.00000694,6940,8600,-.81,-7.83,-12.14,"New","2m","#b3a0ec"],
  ["FLOW","Go with it","wave",.0000912,91200,167000,1.16,20.39,51.32,"Graduating","1h","#8cc6ec"],
  ["LUCKY","Feeling lucky","dice",.0000186,18600,27200,2.77,47.02,92.40,"New","9m","#ced3d6"],
];
export const TOKENS: Token[] = seeds.map(([symbol,name,art,price,mcap,volume,change1m,change30m,change24h,stage,age,color],i) => {
  const holders = Math.round(mcap/560+148+i*19);
  return ({
  id:symbol.toLowerCase(),symbol,name,image:art === "nomo" ? "/nomo/nomo-coin.webp" : `/nomo/coins/${art}-64.webp`,color,chain:"Solana",
  // Illustrative supply is fully circulating, so market cap and FDV both equal price × 1 billion.
  price,mcap,totalSupply:1_000_000_000,volume,liquidity:Math.round(mcap*.13+volume*.06),holders,
  change1m,change5m:Math.round((change24h*.13-i*.2)*100)/100,change30m,change1h:Math.round(change24h*.58*100)/100,change24h,
  age,stage,progress:stage === "Established" ? 100 : stage === "Graduating" ? 62+(i*7)%34 : 8+(i*3)%27,
  buys:Math.round(volume/218),sells:Math.round(volume/326),
  top10Pct:Number((11.2+(i*3.7)%28).toFixed(1)),devPct:Number((i%4===0?0:.3+(i*1.1)%6).toFixed(1)),
  snipersPct:Number((.4+(i*1.9)%15).toFixed(1)),bundlersPct:Number((1.2+(i*2.6)%22).toFixed(1)),
  // Stable presentation fixtures; these values do not imply verified wallet behavior or risk ratings.
  insidersPct:Number((.6+(i*1.7)%19).toFixed(1)),freshWalletPct:Number((4.8+(i*3.9)%38).toFixed(1)),
  phishingPct:Number((i%3===0?0:(i*2.3)%13).toFixed(1)),
  dexPaid:i%4!==2,botTraders:Math.round(holders*(.08+((i*7)%38)/100)),
  athMcap:Math.round(mcap*(1.08+(i%6)*.19)),fees:Math.round(volume*.008),
  launchpad:stage==="Established"?"Raydium":"Pump.fun",contract:`${["7xKp","9mQ2","4rTb","8vNc","3pWf","6hDs"][i%6]}${"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".slice(i,i+36)}pump`,
  points:Array.from({length:30},(_,j)=>Number((25+Math.sin(j*.71+i)*8+Math.cos(j*1.91+i)*5+j*(change24h>0 ? 1.2 : -.5)).toFixed(4))),
  });
});
export function changeForTime(token: Token, time: string): number {
  switch (time) {
    case "1m": return token.change1m;
    case "5m": return token.change5m;
    case "30m": return token.change30m;
    case "1h": return token.change1h;
    default: return token.change24h;
  }
}
export const compact = (n:number) => n>=1e6 ? `${(n/1e6).toFixed(2)}M` : n>=1e3 ? `${(n/1e3).toFixed(n>=1e5 ? 0 : 1)}K` : n.toLocaleString("en-US");
export const money = (n:number) => `$${compact(n)}`;
export const priceText = (n:number) => `$${n.toFixed(n<.0001 ? 7 : n<.001 ? 6 : 5)}`;
export const percent = (n:number) => `${n>=0?"+":""}${n.toFixed(2)}%`;
