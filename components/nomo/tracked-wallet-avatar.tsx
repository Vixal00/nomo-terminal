import { WALLET_COLORS, walletAppearance, type TrackedWallet, type WalletShape, type WalletColor } from "./tracked-wallets";

export function WalletMark({shape,color,size=30}:{shape:WalletShape;color:WalletColor;size?:number}) {
  const hex=WALLET_COLORS.find(item=>item.value===color)!.hex;
  return <svg className="ntk-wallet-mark" aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}>
    <rect x=".5" y=".5" width="31" height="31" rx="8" fill={hex} fillOpacity=".1" stroke={hex} strokeOpacity=".18"/>
    <g fill={hex}>
      {shape==="circle" && <circle cx="16" cy="16" r="8"/>}
      {shape==="square" && <rect x="8" y="8" width="16" height="16" rx="3"/>}
      {shape==="diamond" && <path d="M16 6 26 16 16 26 6 16Z"/>}
      {shape==="triangle" && <path d="M16 6 26 24H6Z"/>}
      {shape==="hexagon" && <path d="m16 6 9 5v10l-9 5-9-5V11Z"/>}
      {shape==="star" && <path d="m16 5 3.2 6.7 7.4 1-5.3 5.2 1.3 7.4-6.6-3.5-6.6 3.5 1.3-7.4-5.3-5.2 7.4-1Z"/>}
    </g>
  </svg>;
}

export function TrackedWalletAvatar({wallet,size=30}:{wallet:TrackedWallet;size?:number}) {
  return <WalletMark {...walletAppearance(wallet)} size={size}/>;
}
