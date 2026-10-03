"use client";

import { useEffect, useState } from "react";
import { TOKENS } from "./data";

/** Authored UI fixtures. No account, trade or X profile is fetched or verified. */
export type PreviewTrader = {
  id: string; name: string; handle: string; address: string; avatar: string;
  nomo: boolean; balance: number; pnl: number; realized: number; volume: number;
  trades: number; wins: number; tokens: number; lastMinutes: number;
};

export const PREVIEW_TRADERS: PreviewTrader[] = [
  { id: "northstar", name: "Northstar", handle: "northstar", address: "northstar.near", avatar: "/art/coins/p65.webp", nomo: true, balance: 842.6, pnl: 300.9, realized: 106.63, volume: 1830.51, trades: 42, wins: 29, tokens: 7, lastMinutes: 3 },
  { id: "moss", name: "Moss", handle: "moss", address: "moss.near", avatar: "/art/coins/p34.webp", nomo: true, balance: 1263.1, pnl: 246.81, realized: 192.44, volume: 1492.84, trades: 31, wins: 23, tokens: 5, lastMinutes: 8 },
  { id: "paperhands", name: "Paper plane", handle: "paperplane", address: "paperplane.near", avatar: "/art/coins/p11.webp", nomo: true, balance: 429.78, pnl: 188.32, realized: 123.09, volume: 2210.3, trades: 68, wins: 42, tokens: 12, lastMinutes: 12 },
  { id: "orbit", name: "Orbit", handle: "orbit", address: "orbit.near", avatar: "/art/coins/p69.webp", nomo: false, balance: 2341.42, pnl: 421.83, realized: 287.32, volume: 3284.12, trades: 54, wins: 36, tokens: 9, lastMinutes: 4 },
  { id: "lowkey", name: "Lowkey", handle: "lowkey", address: "lowkey.near", avatar: "/art/coins/p57.webp", nomo: true, balance: 592.34, pnl: 104.58, realized: 81.17, volume: 842.6, trades: 27, wins: 18, tokens: 6, lastMinutes: 26 },
  { id: "fern", name: "Fern", handle: "fern", address: "fern.near", avatar: "/art/coins/p72.webp", nomo: false, balance: 326.1, pnl: 159.27, realized: 102.44, volume: 1937.11, trades: 39, wins: 24, tokens: 8, lastMinutes: 18 },
  { id: "afterhours", name: "Afterhours", handle: "afterhours", address: "afterhours.near", avatar: "/art/coins/p16.webp", nomo: true, balance: 732.82, pnl: 62.74, realized: 43.81, volume: 721.44, trades: 22, wins: 13, tokens: 4, lastMinutes: 43 },
  { id: "echo", name: "Echo", handle: "echo", address: "echo.near", avatar: "/art/coins/p24.webp", nomo: true, balance: 184.26, pnl: 28.16, realized: 19.71, volume: 497.36, trades: 19, wins: 11, tokens: 5, lastMinutes: 67 },
  { id: "sundial", name: "Sundial", handle: "sundial", address: "sundial.near", avatar: "/art/coins/p29.webp", nomo: false, balance: 904.33, pnl: 16.29, realized: -8.71, volume: 1803.47, trades: 46, wins: 23, tokens: 9, lastMinutes: 94 },
  { id: "pebble", name: "Pebble", handle: "pebble", address: "pebble.near", avatar: "/art/coins/p77.webp", nomo: true, balance: 263.11, pnl: -12.48, realized: -23.84, volume: 682.94, trades: 25, wins: 10, tokens: 6, lastMinutes: 128 },
  { id: "bluehour", name: "Blue hour", handle: "bluehour", address: "bluehour.near", avatar: "/art/coins/p68.webp", nomo: true, balance: 138.54, pnl: -86.27, realized: -101.93, volume: 1239.22, trades: 34, wins: 12, tokens: 7, lastMinutes: 173 },
  { id: "ember", name: "Ember", handle: "ember", address: "ember.near", avatar: "/art/coins/p03.webp", nomo: false, balance: 389.12, pnl: -143.81, realized: -167.3, volume: 1628.73, trades: 41, wins: 16, tokens: 8, lastMinutes: 208 },
];

export const PREVIEW_TRADES = Array.from({ length: 36 }, (_, index) => {
  const trader = PREVIEW_TRADERS[index % 8];
  const token = TOKENS[(index * 3 + Math.floor(index / 8)) % 10];
  return { id: `trade-${index}`, address: trader.address, token, side: index % 3 === 2 ? "Sell" as const : "Buy" as const, amount: 14.6 + index * 3.17, minutes: 2 + index * 7 };
});

export type TrackedWallet = { address: string; name: string; avatar: string; monitor: boolean; trades: boolean; addedAt: number };
export const normalizeTrackedAccount = (address: string) => PREVIEW_TRADERS.find(trader => trader.address.replace(/\.near$/, ".preview.near") === address)?.address || address;
export const TRACKED_WALLETS_KEY = "nomo.preview.tracked-wallets.v1";
const WALLET_EVENT = "nomo:tracked-wallets";
const initialWallets = PREVIEW_TRADERS.slice(0, 3).concat(PREVIEW_TRADERS[4]).map(trader => ({ address: trader.address, name: trader.name, avatar: trader.avatar, monitor: true, trades: true, addedAt: 0 }));
const isWallet = (value: unknown): value is TrackedWallet => {
  if (!value || typeof value !== "object") return false;
  const wallet = value as Partial<TrackedWallet>;
  return typeof wallet.address === "string" && typeof wallet.name === "string" && typeof wallet.avatar === "string" && wallet.avatar.startsWith("/art/coins/") && typeof wallet.monitor === "boolean" && typeof wallet.trades === "boolean" && typeof wallet.addedAt === "number";
};

export function useTrackedWallets() {
  const [wallets, setWallets] = useState<TrackedWallet[]>(initialWallets);
  useEffect(() => {
    const read = () => {
      try {
        const raw: unknown = JSON.parse(localStorage.getItem(TRACKED_WALLETS_KEY) || "null");
        if (Array.isArray(raw)) {
          const normalized = raw.filter(isWallet).map(wallet => ({ ...wallet, address: normalizeTrackedAccount(wallet.address) }));
          setWallets(normalized.filter((wallet, index) => normalized.findIndex(item => item.address === wallet.address) === index));
        }
      } catch { /* A blocked or empty store keeps the local preview usable. */ }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(WALLET_EVENT, read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener(WALLET_EVENT, read); };
  }, []);
  const saveWallets = (next: TrackedWallet[]) => {
    setWallets(next);
    try { localStorage.setItem(TRACKED_WALLETS_KEY, JSON.stringify(next)); window.dispatchEvent(new Event(WALLET_EVENT)); } catch { /* Session state remains available. */ }
  };
  const toggleTrader = (trader: PreviewTrader) => {
    const exists = wallets.some(wallet => wallet.address === trader.address);
    saveWallets(exists ? wallets.filter(wallet => wallet.address !== trader.address) : [...wallets, { address: trader.address, name: trader.name, avatar: trader.avatar, monitor: true, trades: true, addedAt: Date.now() }]);
  };
  return { wallets, saveWallets, toggleTrader };
}

export const traderForWallet = (address: string) => PREVIEW_TRADERS.find(trader => trader.address === address);
export const shortAccount = (address: string) => address.length > 26 ? `${address.slice(0, 12)}…${address.slice(-9)}` : address;
export const nearAmount = (amount: number) => Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const signedNear = (amount: number) => `${amount < 0 ? "−" : "+"}${nearAmount(amount)}`;
export const PREVIEW_NEAR_USD = 4.7;
export const previewUsd = (amount: number) => `${amount < 0 ? "−" : ""}$${(Math.abs(amount) * PREVIEW_NEAR_USD).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const activityAge = (minutes: number) => minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
export const isNearAccount = (address: string) => address.length >= 2 && address.length <= 64 && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(address);

export const TRADER_PERIODS = ["24h", "7 days", "30 days", "All time"] as const;
export type TraderPeriod = typeof TRADER_PERIODS[number];
export function periodTrader(trader: PreviewTrader, period: TraderPeriod): PreviewTrader {
  const index = PREVIEW_TRADERS.findIndex(item => item.id === trader.id);
  const multiplier = period === "24h" ? [0.12, 0.24, 0.19, 0.11, 0.27][index % 5] : period === "30 days" ? 2.8 + index % 3 * 0.45 : period === "All time" ? 5.3 + index % 4 * 0.9 : 1;
  const trades = Math.max(2, Math.round(trader.trades * multiplier));
  return { ...trader, pnl: trader.pnl * multiplier, realized: trader.realized * multiplier, volume: trader.volume * multiplier, trades, wins: Math.min(trades, Math.round(trader.wins / trader.trades * trades)), tokens: Math.max(1, Math.round(trader.tokens * Math.sqrt(multiplier))) };
}
