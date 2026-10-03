/**
 * Mock OHLCV for the token chart.
 *
 * Visualisation only. No provider indexes a bonding-curve token reliably
 * before it migrates, and picking one is a separate decision, so these
 * bars are generated rather than fetched. Everything here is placeholder
 * data in the same sense as the rest of lib/data.ts.
 *
 * Two properties are worth keeping even in a fake series. It is seeded
 * from the ticker, so a coin's chart is the same shape on every visit
 * rather than reshuffling under the reader. And the last close is pinned
 * to the price shown beside it, so the chart and the header cannot
 * disagree, which is the tell that gives a placeholder chart away.
 */

export type Frame = "1H" | "1D" | "1W" | "1M" | "1Y" | "All";

export type Bar = {
  /** Seconds since epoch, which is what the chart's time scale wants. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Seconds per bar, so a longer frame shows a longer history at a coarser
 *  grain rather than the same candles stretched wider. */
const BAR_SECONDS: Record<Frame, number> = {
  "1H": 20,
  /* 180 bars of 480s is exactly 24 hours, so the 1D frame really does
     span the window the 24h figure beside it describes. */
  "1D": 480,
  "1W": 3360,
  "1M": 14400,
  "1Y": 175200,
  All: 262800,
};

/** Per-bar volatility. Short frames are noisier per bar than long ones
 *  are, which is what makes a zoomed-in chart look zoomed in. */
const VOLATILITY: Record<Frame, number> = {
  "1H": 0.012,
  "1D": 0.026,
  "1W": 0.05,
  "1M": 0.08,
  "1Y": 0.13,
  All: 0.16,
};

/** How far the whole window travels, as a return. Used for every frame
 *  except 1D, which takes the coin's own 24h figure instead so the chart
 *  and the percentage printed above it cannot disagree. */
const WINDOW_RETURN: Record<Frame, number> = {
  "1H": 0.05,
  "1D": 0,
  "1W": 0.55,
  "1M": 1.2,
  "1Y": 3.5,
  All: 5,
};

const COUNT = 180;

function seeded(key: string) {
  let s = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function candles(
  ticker: string,
  frame: Frame,
  lastPrice: number,
  d24: number | null,
  baseVolume: number
): Bar[] {
  const rand = seeded(ticker + frame);
  const step = BAR_SECONDS[frame];
  const vol = VOLATILITY[frame];

  /* The window's total travel, as a return. A coin quoted up has to
     arrive at its price from below, which is the direction an earlier
     version had backwards: it drew a collapse under a +42.70% badge.
     Clamped above -0.9 so the walk cannot be asked to end at zero. */
  const up = (d24 ?? 0) >= 0;
  const target =
    frame === "1D"
      ? d24 !== null
        ? d24 / 100
        : up
          ? 0.3
          : -0.3
      : WINDOW_RETURN[frame] * (up ? 1 : -1);
  /* Noise first, with no drift in it at all. */
  const walk: number[] = [];
  let v = 1;
  for (let i = 0; i < COUNT; i++) {
    v *= 1 + (rand() - 0.5) * 2 * vol;
    walk.push(Math.max(v, 0.02));
  }

  /* Then de-trend, so whatever displacement the noise happened to
     accumulate is divided back out and the walk starts and ends on the
     same level. Simply adding drift to each step would not do this: over
     180 bars the noise wanders about twenty percent either way on its
     own, which is enough to swallow the drift entirely. A +42.70% day was
     drawing as a +4% one for exactly that reason.
     Removing it first means the target below is the whole displacement. */
  const realised = walk[COUNT - 1] / walk[0];

  const closes = walk.map(
    (w, i) =>
      (w / Math.pow(realised, i / (COUNT - 1))) *
      Math.pow(1 + Math.max(target, -0.9), i / (COUNT - 1))
  );

  const scale = lastPrice / closes[COUNT - 1];
  // Bars end on the current bar boundary so the newest candle sits at the
  // right edge rather than floating in the future.
  const end = Math.floor(Date.now() / 1000 / step) * step;

  const bars: Bar[] = [];
  for (let i = 0; i < COUNT; i++) {
    const close = closes[i] * scale;
    const open = i === 0 ? close * (1 - (rand() - 0.5) * vol) : bars[i - 1].close;
    const body = Math.abs(close - open);
    // Wicks are drawn off the body rather than off the price, so a quiet
    // bar gets a short wick and a violent one gets a long one.
    const hi = Math.max(open, close) + body * rand() * 1.6 + close * vol * 0.12 * rand();
    const lo = Math.min(open, close) - body * rand() * 1.6 - close * vol * 0.12 * rand();

    bars.push({
      time: end - (COUNT - 1 - i) * step,
      open,
      close,
      high: Math.max(hi, open, close),
      low: Math.max(Math.min(lo, open, close), close * 0.02),
      // Volume tracks the size of the move, which is the correlation a
      // real tape has and the thing a flat random series misses.
      volume: baseVolume * (0.35 + rand() * 1.3 + (body / close) * 14),
    });
  }

  return bars;
}

/** Decimal places for a price that may be eight zeros deep. */
export function precisionFor(price: number) {
  if (price >= 1) return 4;
  if (price >= 0.01) return 6;
  if (price >= 0.0001) return 8;
  return 10;
}

/** "$0.00041827" as it appears in the roster, back to a number. */
export function parsePrice(s: string) {
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
}

/** "$96.4K" back to a number, for a volume baseline. */
export function parseVolume(s: string) {
  const n = Number(s.replace(/[^0-9.]/g, "")) || 0;
  if (/M/i.test(s)) return n * 1_000_000;
  if (/K/i.test(s)) return n * 1_000;
  return n;
}
