"use client";

import type { ReactNode } from "react";
import { MarketSimProvider } from "@/lib/trending-live";
import { ToastProvider } from "./toast";

/** What every version's server shell wraps its screen in: one simulated
 *  market and one toast stack for the page. A client component so the
 *  server page can stay a server page and hand it plain children. */
export function VersionShell({ children }: { children: ReactNode }) {
  return (
    <MarketSimProvider>
      <ToastProvider>{children}</ToastProvider>
    </MarketSimProvider>
  );
}
