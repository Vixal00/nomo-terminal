import { readdirSync } from "node:fs";
import { join } from "node:path";
import { COINS } from "./data";

/** Server-only. Scans public/art/coins at build time.
 *
 *  A file named after a ticker binds to that coin (HORNET.avif -> $HORNET).
 *  Every other coin is dealt a picture from the same pool, cycling in
 *  order, so no card is left bare while the set is smaller than the
 *  roster. Assignment follows roster position, so a coin keeps the same
 *  picture across filters, views and rebuilds. */
const EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

/** Stems that bind to a coin. Read from the roster rather than guessed,
 *  so renaming a coin cannot silently orphan its artwork. */
const TICKERS = new Set(COINS.map((c) => c.ticker.toUpperCase()));

function readPool(): { byTicker: Record<string, string>; pool: string[] } {
  const dir = join(process.cwd(), "public", "art", "coins");
  const byTicker: Record<string, string> = {};
  const pool: string[] = [];

  let files: string[];
  try {
    files = readdirSync(dir).sort();
  } catch {
    // Directory absent is the normal empty case, not an error.
    return { byTicker, pool };
  }

  for (const file of files) {
    const dot = file.lastIndexOf(".");
    if (dot < 1) continue;
    if (!EXT.has(file.slice(dot).toLowerCase())) continue;
    const src = `/art/coins/${file}`;
    const stem = file.slice(0, dot).toUpperCase();
    byTicker[stem] = src;
    // Pool entries are the unbound files only. A picture named for a
    // ticker belongs to that coin, so leaving it in the cycle deals it a
    // second time to some unrelated coin: with the pool at 86 and the
    // roster at 78, that was the whole of the duplication.
    if (!TICKERS.has(stem)) pool.push(src);
  }
  return { byTicker, pool };
}

export function coinArt(tickers: string[]): Record<string, string> {
  const { byTicker, pool } = readPool();
  const out: Record<string, string> = {};
  if (pool.length === 0) return out;

  // A named file always wins for its own coin; everything else cycles.
  let cursor = 0;
  for (const ticker of tickers) {
    const named = byTicker[ticker.toUpperCase()];
    if (named) {
      out[ticker] = named;
      continue;
    }
    out[ticker] = pool[cursor % pool.length];
    cursor++;
  }
  return out;
}
