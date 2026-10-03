import type { ReactNode } from "react";
import { NomoIconProvider } from "@/components/nomo/icon-system";

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return <NomoIconProvider>{children}</NomoIconProvider>;
}
