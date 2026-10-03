export const TRACKER_CHAINS = ["NEAR", "Solana", "Robinhood Chain", "Ethereum", "Base"] as const;
export type TrackerChain = typeof TRACKER_CHAINS[number];
export const WALLET_EMOJIS = [
  { value:"🐳", label:"Whale" }, { value:"🐬", label:"Dolphin" },
  { value:"🦈", label:"Shark" }, { value:"🦅", label:"Eagle" },
  { value:"🐂", label:"Bull" }, { value:"🦊", label:"Fox" },
  { value:"🐸", label:"Frog" }, { value:"🦉", label:"Owl" },
  { value:"🐺", label:"Wolf" }, { value:"🦁", label:"Lion" },
  { value:"🐙", label:"Octopus" }, { value:"🦍", label:"Gorilla" },
] as const;
export type WalletEmoji = typeof WALLET_EMOJIS[number]["value"];
export type TrackedWallet = {
  address:string; name:string; avatar:string; monitor:boolean; trades:boolean; addedAt:number;
  chain?:TrackerChain; emoji?:WalletEmoji;
};

export const normalizeWalletAddress = (address:string, chain:TrackerChain = "NEAR") => chain === "Solana" ? address.trim() : address.trim().toLowerCase();
export const trackedWalletKey = (wallet:Pick<TrackedWallet,"address"|"chain">) => `${wallet.chain || "NEAR"}:${normalizeWalletAddress(wallet.address,wallet.chain)}`;
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
const isEmoji = (value:unknown):value is WalletEmoji => WALLET_EMOJIS.some(emoji=>emoji.value===value);
export function isStoredTrackedWallet(value:unknown):value is TrackedWallet {
  if(!value || typeof value !== "object") return false;
  const wallet=value as Partial<TrackedWallet>;
  return typeof wallet.address === "string" && typeof wallet.name === "string" &&
    typeof wallet.avatar === "string" && wallet.avatar.startsWith("/art/coins/") &&
    typeof wallet.monitor === "boolean" && typeof wallet.trades === "boolean" &&
    typeof wallet.addedAt === "number" && Number.isFinite(wallet.addedAt) &&
    (wallet.chain === undefined || isChain(wallet.chain)) &&
    (wallet.emoji === undefined || isEmoji(wallet.emoji));
}

type ImportedWallet = Pick<TrackedWallet,"address"|"name"|"chain"|"emoji">;
export function parseWalletImport(value:string):ImportedWallet[] {
  const found=new Map<string,ImportedWallet>();
  const add=(address:string,name="",chain:TrackerChain="NEAR",emoji?:WalletEmoji)=>{
    const clean=normalizeWalletAddress(address,chain);
    if(!isWalletAddress(clean,chain)) return;
    const wallet={address:clean,name:name.trim().slice(0,32)||(clean.length>26?`${clean.slice(0,12)}…${clean.slice(-9)}`:clean),chain,emoji};
    found.set(trackedWalletKey(wallet),wallet);
  };
  try {
    const parsed:unknown=JSON.parse(value);
    for(const item of Array.isArray(parsed)?parsed:[parsed]){
      if(typeof item === "string") add(item);
      else if(item && typeof item === "object" && "address" in item && typeof item.address === "string"){
        const chain="chain" in item?item.chain:"NEAR";
        if(!isChain(chain)) continue;
        add(item.address,"name" in item && typeof item.name === "string"?item.name:"",chain,"emoji" in item && isEmoji(item.emoji)?item.emoji:undefined);
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
