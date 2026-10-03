"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Chain = 1 | 2;

/* The network lives on <html data-chain> (set before paint by the script
   in the root layout) and in localStorage, not in React state. Reading it
   through useSyncExternalStore keeps every component that asks in step,
   and the server snapshot is network 1 so the first render matches the
   default the head script writes when storage is empty. */
const listeners = new Set<() => void>();

function read(): Chain {
  return document.documentElement.dataset.chain === "2" ? 2 : 1;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useChain(): [Chain, (next: Chain) => void] {
  const chain = useSyncExternalStore(subscribe, read, () => 1 as Chain);
  const set = useCallback((next: Chain) => {
    document.documentElement.dataset.chain = String(next);
    try {
      localStorage.setItem("ansem.chain", String(next));
    } catch {
      // Private mode: the switch still works for this page, it just is not remembered.
    }
    listeners.forEach((fn) => fn());
  }, []);
  return [chain, set];
}

/** Native unit per network. Network 2 prices in ETH. */
export function nativeUnit(chain: Chain) {
  return chain === 2 ? "ETH" : "SOL";
}
