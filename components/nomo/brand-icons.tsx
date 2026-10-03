import { Hexagon } from "@phosphor-icons/react";
import { RobinhoodMark } from "@/components/marks";
import type { MarketChain } from "./data";

type BrandIconProps = { size?: number; className?: string };

// Official assets: solana.com/branding; circle.com/pressroom#brandkit;
// pump.fun/pump-logomark.svg; near/docs assets/logo_rev.svg;
// raydium-io/raydium-frontend public/logo/logo-only-icon.svg.
function BrandAsset({ name, size = 14, className }: BrandIconProps & { name: string }) {
  return <img src={`/nomo/icons/${name}.svg`} width={size} height={size} alt="" aria-hidden="true" className={className} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", objectFit: "contain", flexShrink: 0 }} />;
}

export function NearIcon({ size = 14, className }: BrandIconProps) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="108 108 351 351" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false" className={className} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}><path d="m421.61,108c-13,0-25.07,6.74-31.88,17.82l-73.37,108.93c-2.39,3.59-1.42,8.43,2.17,10.82,2.91,1.94,6.76,1.7,9.41-.58l72.22-62.64c1.2-1.08,3.05-.97,4.13.23.49.55.75,1.26.75,1.99v196.12c0,1.62-1.31,2.92-2.93,2.92-.87,0-1.69-.38-2.24-1.05L181.56,121.24c-7.11-8.39-17.55-13.23-28.54-13.24h-7.63c-20.65,0-37.39,16.74-37.39,37.39v276.22c0,20.65,16.74,37.39,37.39,37.39,13,0,25.07-6.74,31.88-17.82l73.37-108.93c2.39-3.59,1.42-8.43-2.17-10.82-2.91-1.94-6.76-1.7-9.41.58l-72.22,62.64c-1.2,1.08-3.05.97-4.13-.23-.49-.55-.75-1.26-.74-1.99v-196.17c0-1.62,1.31-2.92,2.93-2.92.86,0,1.69.38,2.24,1.05l218.28,261.37c7.11,8.39,17.55,13.23,28.54,13.24h7.63c20.65.01,37.4-16.72,37.42-37.37V145.39c0-20.65-16.74-37.39-37.39-37.39Z" /></svg>;
}

export function SolanaIcon(props: BrandIconProps) {
  return <BrandAsset name="solana" {...props} />;
}

export function MarketChainIcon({ chain, size = 14, className }: BrandIconProps & { chain: MarketChain }) {
  if (chain === "Solana") return <SolanaIcon size={size} className={className} />;
  if (chain === "Robinhood Chain") return <span className={className} style={{ width: size, height: size, display: "inline-flex", color: "#c5f34b", flexShrink: 0 }}><RobinhoodMark /></span>;
  return <BrandAsset name={chain === "NEAR" ? "near-circle" : chain.toLowerCase()} size={size} className={className} />;
}

export function UsdcIcon(props: BrandIconProps) {
  return <BrandAsset name="usdc" {...props} />;
}

export function DexscreenerIcon({ size = 14, className }: BrandIconProps) {
  return <span aria-hidden="true" className={className} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0, backgroundColor: "currentColor", mask: "url(/nomo/icons/dexscreener.svg) center / contain no-repeat", WebkitMask: "url(/nomo/icons/dexscreener.svg) center / contain no-repeat" }} />;
}

export function LaunchpadIcon({ name, size = 14, className }: BrandIconProps & { name: string }) {
  const normalized = name.trim().toLowerCase().replace(/[\s._-]/g, "");
  if (normalized === "pumpfun" || normalized === "pump") return <BrandAsset name="pump" size={size} className={className} />;
  if (normalized === "raydium") return <BrandAsset name="raydium" size={size} className={className} />;
  return <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Hexagon size={size} aria-hidden="true" /><span>{name}</span></span>;
}
