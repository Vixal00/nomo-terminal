import { coinArt } from "@/lib/coin-art";
import { trendingRows } from "@/lib/trending";
import { VersionShell } from "@/components/trending/version-shell";
import { Screen } from "@/components/v/discover/screen";
import "./discover.css";

export const metadata = { title: "Discover" };

/* Server shell. coinArt reads the disk, so the pictures are resolved
   here and handed down as a map: fs never enters the client tree. Art
   is dealt by roster position, which is why the list is every row in
   roster order. The screen is the version's own; this file stays as it
   is (see lib/versions.ts). */
export default function Page() {
  const art = coinArt(trendingRows().map((r) => r.ticker));
  return (
    <VersionShell>
      <Screen art={art} />
    </VersionShell>
  );
}
