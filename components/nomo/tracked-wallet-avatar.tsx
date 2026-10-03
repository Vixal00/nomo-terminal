import type { TrackedWallet } from "./tracked-wallets";

export function TrackedWalletAvatar({wallet,size=30}:{wallet:TrackedWallet;size?:number}) {
  return wallet.emoji ? <i aria-hidden="true" style={{width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,borderRadius:6,background:"#242427",fontSize:Math.round(size*.64),lineHeight:1,fontStyle:"normal"}}>{wallet.emoji}</i> : <img src={wallet.avatar} width={size} height={size} alt=""/>;
}
