export const TRACKER_CHAINS = ["NEAR", "Solana", "Robinhood Chain", "Ethereum", "Base"] as const;
export type TrackerChain = typeof TRACKER_CHAINS[number];
export const WALLET_SHAPES = [
  { value:"circle", label:"Circle" }, { value:"square", label:"Square" },
  { value:"diamond", label:"Diamond" }, { value:"triangle", label:"Triangle" },
  { value:"hexagon", label:"Hexagon" }, { value:"star", label:"Star" },
] as const;
export const WALLET_COLORS = [
  { value:"sage", label:"Sage", hex:"#bdcea3" },
  { value:"mint", label:"Mint", hex:"#79cbb3" },
  { value:"sky", label:"Sky", hex:"#86b8e6" },
  { value:"lilac", label:"Lilac", hex:"#b6a0e5" },
  { value:"amber", label:"Amber", hex:"#e2bb77" },
  { value:"coral", label:"Coral", hex:"#df929d" },
] as const;
export type WalletShape = typeof WALLET_SHAPES[number]["value"];
export type WalletColor = typeof WALLET_COLORS[number]["value"];
export type TrackedWallet = {
  address:string; name:string; monitor:boolean; trades:boolean; addedAt:number;
  chain?:TrackerChain; shape?:WalletShape; color?:WalletColor;
};

export const normalizeWalletAddress = (address:string, chain:TrackerChain = "NEAR") => chain === "Solana" ? address.trim() : address.trim().toLowerCase();
export const trackedWalletKey = (wallet:Pick<TrackedWallet,"address"|"chain">) => `${wallet.chain || "NEAR"}:${normalizeWalletAddress(wallet.address,wallet.chain)}`;
export function walletAppearance(wallet:Pick<TrackedWallet,"address"|"chain"|"shape"|"color">):{shape:WalletShape;color:WalletColor} {
  let hash=2166136261;
  for(const character of trackedWalletKey(wallet)) hash=Math.imul(hash^character.charCodeAt(0),16777619)>>>0;
  return {shape:wallet.shape || WALLET_SHAPES[hash%WALLET_SHAPES.length].value,color:wallet.color || WALLET_COLORS[Math.floor(hash/WALLET_SHAPES.length)%WALLET_COLORS.length].value};
}
export const isNearAccount = (address:string) => address.length >= 2 && address.length <= 64 && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(address);
export function isWalletAddress(address:string, chain:TrackerChain) {
  const value=normalizeWalletAddress(address,chain);
  if(chain === "NEAR") return isNearAccount(value);
  if(chain !== "Solana") return /^0x[0-9a-f]{40}$/.test(value);
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let decoded=0n;
  for(const character of value) decoded=decoded*58n+BigInt(alphabet.indexOf(character));
  let bytes=0;
  while(decoded>0n){bytes++;decoded >>= 8n;}
  return bytes+(value.match(/^1*/)?.[0].length || 0) === 32;
}

const isChain = (value:unknown):value is TrackerChain => TRACKER_CHAINS.some(chain=>chain===value);
const isShape = (value:unknown):value is WalletShape => WALLET_SHAPES.some(shape=>shape.value===value);
const isColor = (value:unknown):value is WalletColor => WALLET_COLORS.some(color=>color.value===value);
export function isStoredTrackedWallet(value:unknown):value is TrackedWallet {
  if(!value || typeof value !== "object") return false;
  const wallet=value as Partial<TrackedWallet>;
  return typeof wallet.address === "string" && typeof wallet.name === "string" &&
    typeof wallet.monitor === "boolean" && typeof wallet.trades === "boolean" &&
    typeof wallet.addedAt === "number" && Number.isFinite(wallet.addedAt) &&
    (wallet.chain === undefined || isChain(wallet.chain)) &&
    (wallet.shape === undefined || isShape(wallet.shape)) &&
    (wallet.color === undefined || isColor(wallet.color));
}

type ImportedWallet = Pick<TrackedWallet,"address"|"name"|"chain"|"shape"|"color">;
export function parseWalletImport(value:string):ImportedWallet[] {
  const found=new Map<string,ImportedWallet>();
  const add=(address:string,name="",chain:TrackerChain="NEAR",shape?:WalletShape,color?:WalletColor)=>{
    const clean=normalizeWalletAddress(address,chain);
    if(!isWalletAddress(clean,chain)) return;
    const wallet={address:clean,name:name.trim().slice(0,32)||(clean.length>26?`${clean.slice(0,12)}…${clean.slice(-9)}`:clean),chain,shape,color};
    found.set(trackedWalletKey(wallet),wallet);
  };
  try {
    const parsed:unknown=JSON.parse(value);
    for(const item of Array.isArray(parsed)?parsed:[parsed]){
      if(typeof item === "string") add(item);
      else if(item && typeof item === "object" && "address" in item && typeof item.address === "string"){
        const chain="chain" in item?item.chain:"NEAR";
        if(!isChain(chain)) continue;
        add(item.address,"name" in item && typeof item.name === "string"?item.name:"",chain,"shape" in item && isShape(item.shape)?item.shape:undefined,"color" in item && isColor(item.color)?item.color:undefined);
      }
    }
  } catch {
    for(const line of value.split(/\r?\n/).filter(line=>line.trim())){
      const [address,...name]=line.trim().split(/[,;\t ]+/);
      add(address,name.join(" "));
    }
  }
  return [...found.values()];
}
