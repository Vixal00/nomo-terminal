import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IndexDiscover from "@/components/nomo/index";
import { TOKENS } from "@/components/nomo/data";
import { NomoIconProvider } from "@/components/nomo/icon-system";
import "@/components/nomo/base.css";
import "@/components/nomo/index.css";
import "@/components/nomo/market-chrome.css";

export function generateStaticParams() {
  return TOKENS.map(token => ({ id: token.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const token = TOKENS.find(item => item.id === id);
  return { title: token ? `${token.symbol} — ${token.name}` : "Token not found" };
}

export default async function TokenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!TOKENS.some(token => token.id === id)) notFound();
  return <NomoIconProvider><IndexDiscover tokenId={id}/></NomoIconProvider>;
}
