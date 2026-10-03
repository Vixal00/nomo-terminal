import type { Metadata } from "next";
import "@/components/nomo/base.css";
import "@/components/nomo/index.css";
import "@/components/nomo/market-chrome.css";
import IndexDiscover from "@/components/nomo/index";
import { NomoIconProvider } from "@/components/nomo/icon-system";
export const metadata: Metadata = { title: "Portfolio" };
export default function Page() { return <NomoIconProvider><IndexDiscover workspace="portfolio"/></NomoIconProvider>; }
