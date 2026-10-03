import type { ReactNode } from "react";

/* Discover's small glyphs: the reference is built on 12 to 16px line
   icons, and these are the ones the shared marks (components/marks.tsx)
   don't have. One idea each, stroked in currentColor at the weight of
   the shared marks, so the element around them decides their colour.
   Where a shared mark already means the thing (flame, star, copy, the
   hexagon settings mark, the pulse), the shared one is used instead. */

type P = { className?: string };

function Line({ className, children, w = 1.35 }: P & { children: ReactNode; w?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="7" cy="7" r="4.6" />
      <path d="m10.5 10.5 3.4 3.4" />
    </Line>
  );
}

/** Market cap: a dollar in a ring. */
export function DollarIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M10.1 5.9c-.4-.6-1.1-.9-2.1-.9-1.2 0-2 .6-2 1.5 0 2.1 4.2 1 4.2 3.1 0 .9-.9 1.5-2.1 1.5-1 0-1.8-.4-2.2-1M8 3.9V5M8 11.1v1" />
    </Line>
  );
}

/** Liquidity: a drop, for the pool. */
export function DropIcon({ className }: P) {
  return (
    <Line className={className}>
      <path d="M8 1.9s-4.3 4.6-4.3 7.6a4.3 4.3 0 0 0 8.6 0C12.3 6.5 8 1.9 8 1.9Z" />
    </Line>
  );
}

/** The search chip: lines of text under a lens. */
export function KeywordIcon({ className }: P) {
  return (
    <Line className={className}>
      <path d="M2.2 4h8.4M2.2 7.2h4.4M2.2 10.4h2.6" />
      <circle cx="10.5" cy="10.1" r="2.6" />
      <path d="m12.4 12 1.7 1.7" />
    </Line>
  );
}

/** Hidden coins: a ring with a bar through it. */
export function BanIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="m3.8 3.8 8.4 8.4" />
    </Line>
  );
}

export function FunnelIcon({ className }: P) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M1.8 2.4h12.4L9.5 8.2v4.9l-3 1.5V8.2Z" />
    </svg>
  );
}

/** The quick-buy and boost bolt: the same outline BoostChip draws, flat,
 *  without its arc. */
export function BoltIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M13.9 2 4.6 13.3a.6.6 0 0 0 .46.98h5.2l-1.2 7.02a.6.6 0 0 0 1.05.49l9.3-11.3a.6.6 0 0 0-.46-.98h-5.2l1.2-7.02A.6.6 0 0 0 13.9 2Z" />
    </svg>
  );
}

/** One wallet: the creator. */
export function UserIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="8" cy="5.2" r="2.7" />
      <path d="M2.8 14c.5-2.8 2.6-4.4 5.2-4.4s4.7 1.6 5.2 4.4" />
    </Line>
  );
}

/** Top ten: a holder with more beside them. */
export function UserPlusIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="6.4" cy="5.2" r="2.6" />
      <path d="M1.8 14c.4-2.7 2.3-4.3 4.6-4.3 1.2 0 2.3.4 3.1 1.1M12.4 8.9v4.6M10.1 11.2h4.6" />
    </Line>
  );
}

/** Dev: a holder wearing a badge. */
export function UserBadgeIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="6.8" cy="5" r="2.6" />
      <path d="M2 14c.4-2.7 2.3-4.3 4.8-4.3" />
      <rect x="9.6" y="9.4" width="4.6" height="4.6" />
    </Line>
  );
}

/** Holders: two people. */
export function UsersIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="6" cy="5.4" r="2.4" />
      <path d="M1.6 13.6c.4-2.4 2.1-3.8 4.4-3.8s4 1.4 4.4 3.8M10.6 3.2a2.4 2.4 0 0 1 0 4.5M12.2 9.9c1.2.5 2 1.7 2.2 3.7" />
    </Line>
  );
}

/** Snipers. */
export function CrosshairIcon({ className }: P) {
  return (
    <Line className={className}>
      <circle cx="8" cy="8" r="5.1" />
      <path d="M8 1.4v3M8 11.6v3M1.4 8h3M11.6 8h3" />
    </Line>
  );
}

/** Bundlers: wallets that bought together. */
export function CirclesIcon({ className }: P) {
  return (
    <Line className={className} w={1.25}>
      <circle cx="8" cy="5.7" r="3.1" />
      <circle cx="5.4" cy="10.2" r="3.1" />
      <circle cx="10.6" cy="10.2" r="3.1" />
    </Line>
  );
}

/** The community airdrop. */
export function ParachuteIcon({ className }: P) {
  return (
    <Line className={className} w={1.25}>
      <path d="M1.9 7.3a6.1 6.1 0 0 1 12.2 0Z" />
      <path d="m1.9 7.3 4.9 4.8M14.1 7.3 9.2 12.1M8 7.3v4.8" />
      <rect x="6.6" y="12.1" width="2.8" height="2.3" />
    </Line>
  );
}

/** The bonding curve. */
export function CurveIcon({ className }: P) {
  return (
    <Line className={className}>
      <path d="M2 13.8h12.2" />
      <path d="M2.4 13.2C7.2 13 10.8 9.4 13.8 2.6" />
    </Line>
  );
}

/** Top, by market cap: the podium. */
export function PodiumIcon({ className }: P) {
  return (
    <Line className={className}>
      <path d="M1.8 14.2h12.4M5.8 14.2V5.6h4.4v8.6M1.8 14.2V9.4h4M14.2 14.2v-3.2h-4" />
    </Line>
  );
}

/** The index: a Z in a frame. */
export function Z500Icon({ className }: P) {
  return (
    <Line className={className}>
      <rect x="2" y="2" width="12" height="12" />
      <path d="M5.3 5.4h5.4l-5.4 5.2h5.4" />
    </Line>
  );
}

export function ChevronIcon({ className }: P) {
  return (
    <Line className={className} w={1.5}>
      <path d="m4.5 6.2 3.5 3.5 3.5-3.5" />
    </Line>
  );
}
