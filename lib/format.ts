/**
 * Formatting for the Trending page, in one place.
 *
 * Five versions of the page print the same figures, and a figure that
 * reads "$418K" on one and "$418.3K" on another is two numbers as far as
 * a reader can tell. So every string a figure turns into is made here,
 * and a version decides only where it goes and how loud it is.
 *
 * Pure and server-safe: the server render and the first client render
 * have to produce the same characters, so nothing here reads a locale,
 * a clock or the window.
 */

/** What a missing figure prints as. An en dash, rendered dim with a
 *  title saying why, never 0: a zero is a reading and this is the
 *  absence of one. */
export const NULL = "–";

/** The minus sign, not the hyphen. In tabular figures the hyphen is
 *  narrower than a digit and a column of signed numbers stops lining
 *  up at exactly the character that matters. */
export const MINUS = "−";

const SUFFIX = ["", "K", "M", "B"] as const;

/** A number to `sig` significant figures with a K/M/B suffix, never in
 *  exponent form. toPrecision alone gives "1.00e+3" at the rollover,
 *  which is why the scale is re-picked after rounding. */
function scaled(n: number, sig: number): string {
  const a = Math.abs(n);
  if (a < 1000) {
    if (a === 0) return "0";
    // Under a thousand the digits left of the point are all significant;
    // only the fraction gets trimmed to the precision asked for.
    const digits = Math.floor(Math.log10(a)) + 1;
    const dp = Math.max(0, sig - Math.max(digits, 1));
    const s = a.toFixed(dp);
    if (Number(s) >= 1000) return scaled(1000, sig);
    return trimZeros(s);
  }
  let i = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(a) / 3));
  let v = a / 1000 ** i;
  let s = roundSig(v, sig);
  if (Number(s) >= 1000 && i < SUFFIX.length - 1) {
    i += 1;
    v = a / 1000 ** i;
    s = roundSig(v, sig);
  }
  return `${trimZeros(s)}${SUFFIX[i]}`;
}

function roundSig(v: number, sig: number): string {
  const digits = Math.floor(Math.log10(v)) + 1;
  return v.toFixed(Math.max(0, sig - digits));
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** Dollars at three significant figures: "$418K", "$1.82M", "$96.4K",
 *  "$3.63". Null prints the dash.
 *
 *  An amount that rounds to nothing prints as a bound, not as "$0": a
 *  "$0" average trade beside a non-zero volume, or a "−$0" net flow, is
 *  a reading the data doesn't have. The sign is taken from what is
 *  printed, so a zero is never signed. */
export function usd(n: number | null | undefined, sig = 3): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NULL;
  const s = scaled(n, sig);
  if (s === "0" && n !== 0) return n > 0 ? "<$0.01" : `>${MINUS}$0.01`;
  return `${n < 0 && s !== "0" ? MINUS : ""}$${s}`;
}

/** A count at three significant figures: "25.4K", "1.2M", "968".
 *  Anything that rounds to 1,000 takes the suffix ("1K", not "1000"),
 *  and a count that rounds to zero is unsigned. */
export function compact(n: number | null | undefined, sig = 3): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NULL;
  const whole = Math.round(Math.abs(n));
  if (whole < 1000) return `${n < 0 && whole !== 0 ? MINUS : ""}${whole}`;
  return `${n < 0 ? MINUS : ""}${scaled(n, sig)}`;
}

/** A signed percentage: "+42.7%", "−12.4%". Zero prints unsigned, and
 *  so does anything that rounds to it: "0.0%", never "+0.0%". */
export function pct(n: number | null | undefined, dp = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NULL;
  const s = Math.abs(n).toFixed(dp);
  if (Number(s) === 0) return `${(0).toFixed(dp)}%`;
  return `${n > 0 ? "+" : MINUS}${s}%`;
}

/** An unsigned share: "28.4%". For top-10, dev, snipers and the like,
 *  where a plus sign would read as a change. */
export function share(n: number | null | undefined, dp = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NULL;
  return `${n.toFixed(dp)}%`;
}

/** A whole count with grouping: "25,412". en-US pinned so the server
 *  and a browser in another locale agree on the separator. */
export function count(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NULL;
  return Math.round(n).toLocaleString("en-US");
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** A token price with the zeros after the point counted rather than
 *  printed: 0.00041827 → "$0.0₃4183". Four significant figures, which
 *  is what a pro screen reads a sub-cent price to; eight zeros in a
 *  row is a thing to count, not a thing to read. Below three zeros the
 *  plain decimal is short enough to leave alone. */
export function price(n: number | null | undefined, sig = 4): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n <= 0) {
    return n === 0 ? "$0" : NULL;
  }
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let zeros = Math.max(0, -Math.floor(Math.log10(n)) - 1);
  let mant = Math.round(n * 10 ** (zeros + sig));
  // 0.00099999 rounds up to a whole extra digit: one zero fewer. Just
  // under a dollar there is no zero left to take away, and the price
  // rounds to the dollar itself.
  if (mant >= 10 ** sig) {
    zeros -= 1;
    if (zeros < 0) return price(1);
    mant = Math.round(n * 10 ** (zeros + sig));
  }
  const digits = trimZeros(`0.${mant}`).slice(2) || "0";
  if (zeros < 3) return `$0.${"0".repeat(zeros)}${digits}`;
  const sub = [...String(zeros)].map((d) => SUB[Number(d)]).join("");
  return `$0.0${sub}${digits}`;
}

/** An age in minutes, in the roster's own four shapes: "26m",
 *  "5h 31m", "3d 19h", "3w 2d". The same shapes as the fixture strings,
 *  so the server render of a roster age and a ticking one agree. */
export function age(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return NULL;
  const m = Math.max(0, Math.floor(minutes));
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  const d = Math.floor(m / 1440);
  if (d < 7) return `${d}d ${Math.floor((m % 1440) / 60)}h`;
  return `${Math.floor(d / 7)}w ${d % 7}d`;
}

/** "$418K" → ["$418", "K"], so a version can dim the unit without a
 *  second formatter. A string with no suffix comes back whole. For a
 *  ticking figure, useLiveCell's `split` option does this on every
 *  commit. */
export function splitSuffix(s: string): [string, string] {
  const m = /^(.*?\d)\s?([KMB%]|SOL|ETH|USDG)$/.exec(s);
  return m ? [m[1], m[2]] : [s, ""];
}

/** Whether a change prints as zero at `dp` decimals, the way pct()
 *  rounds it. A "0.0%" cell is neither a gain nor a loss, so whatever
 *  colours it (data-sign, a sparkline's direction, a heat band) reads
 *  the rounded figure, not the raw one. */
export function roundsToZero(n: number, dp = 1): boolean {
  return Number(Math.abs(n).toFixed(dp)) === 0;
}

/** A formatter that keeps a roster string's precision.
 *
 *  The roster prints HORNET at "$418.3K" and usd() would print "$418K".
 *  Starting on the roster string and switching to usd() on the first
 *  tick makes a figure change its shape with no trade behind it, so a
 *  cell that starts on a roster label formats every later value at the
 *  same scale and decimals the label had. */
export function usdLike(label: string): (n: number | null) => string {
  const m = /^\$([0-9.]+)([KMB]?)$/.exec(label.trim());
  if (!m) return (n) => usd(n);
  const dp = m[1].includes(".") ? m[1].split(".")[1].length : 0;
  const scale = m[2] === "B" ? 1e9 : m[2] === "M" ? 1e6 : m[2] === "K" ? 1e3 : 1;
  return (n) => {
    if (n === null || !Number.isFinite(n)) return NULL;
    const v = n / scale;
    const s = v.toFixed(dp);
    // A value that has left the label's scale altogether takes the
    // general format rather than printing "$1003.1K". Tested on the
    // rounded digits, because 999.6 at no decimals is "1000" and
    // "$1000K" is the same failure one step earlier.
    if (Number(s) >= 1000 || (scale > 1 && v < 1)) return usd(n);
    return `$${s}${m[2]}`;
  };
}

/** An age formatter that keeps a roster string's shape.
 *
 *  The roster writes a migrated coin eight days old as "8d 4h" in one
 *  place and a seven-day-old one as "1w 0d" in another, so no single
 *  rule reproduces every fixture string. A ticking age cell starts on the
 *  roster's own shape and only ever moves to a coarser one ("59m" to
 *  "1h 0m"), so its first render is the fixture string exactly. */
export function ageLike(label: string): (minutes: number | null) => string {
  const unit = /w/.test(label) ? 3 : /d/.test(label) ? 2 : /h/.test(label) ? 1 : 0;
  return (minutes) => {
    if (minutes === null || !Number.isFinite(minutes)) return NULL;
    const m = Math.max(0, Math.floor(minutes));
    // Days never promote to weeks on their own: "8d 4h" is a shape the
    // roster uses, and a cell that flipped to "1w 1d" would read as a jump.
    const need = m < 60 ? 0 : m < 1440 ? 1 : 2;
    const u = Math.max(unit, need);
    if (u === 0) return `${m}m`;
    if (u === 1) return `${Math.floor(m / 60)}h ${m % 60}m`;
    if (u === 2) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
    const d = Math.floor(m / 1440);
    return `${Math.floor(d / 7)}w ${d % 7}d`;
  };
}
