"use client";

import { useCallback, useEffect, useState } from "react";
import { LABELS } from "@/lib/labels";
import { quickBuy, type ChainId } from "@/lib/trending";
import { useToast } from "./toast";

/** A size as it was typed: 0.1 → "0.1", never "0.10000000000000001". */
export function amountText(n: number): string {
  return String(Number(n.toPrecision(6)));
}

/** The buy that isn't one.
 *
 *  Trading isn't wired, and a button that does nothing says so: every
 *  buy key on the page calls this, and the toast states that no
 *  transaction was created, in LABELS.BUY_TOAST's words. Neutral tone,
 *  not the success tick, because nothing succeeded. */
export function usePlaceholderBuy() {
  const toast = useToast();
  return useCallback(
    (ticker: string, amount: number, unit: string) => {
      toast({ title: LABELS.BUY_TOAST(amountText(amount), unit, ticker), tone: "info" });
    },
    [toast],
  );
}

const key = (unit: string) => `ansem.terminal.qb.${unit}`;

/** The quick-buy size, in the network's own unit, remembered per unit.
 *
 *  Per unit rather than per page, because 0.1 SOL and 0.1 ETH are two
 *  very different buys: switching network must not carry a SOL-sized
 *  number over as ether. Starts on the middle preset and reads storage
 *  after mount, because the server has no storage and a first client
 *  render seeded from it would disagree with the HTML. Storage can be
 *  blocked outright; not remembering a preference is no reason to
 *  refuse to change it. */
export function useQuickBuy(
  chain: ChainId,
): [amount: number, setAmount: (n: number) => void, presets: readonly number[], unit: "SOL" | "ETH"] {
  const { unit, presets } = quickBuy(chain);
  const [amount, setState] = useState<number>(presets[1]);

  useEffect(() => {
    let next = quickBuy(chain).presets[1];
    try {
      const raw = window.localStorage.getItem(key(unit));
      const n = raw === null ? NaN : Number(raw);
      if (Number.isFinite(n) && n > 0) next = n;
    } catch {
      /* Blocked storage: the default stands. */
    }
    setState(next);
  }, [chain, unit]);

  const setAmount = useCallback(
    (n: number) => {
      if (!Number.isFinite(n) || n <= 0) return;
      setState(n);
      try {
        window.localStorage.setItem(key(unit), String(n));
      } catch {
        /* Remembered for this page only. */
      }
    },
    [unit],
  );

  return [amount, setAmount, presets, unit];
}
