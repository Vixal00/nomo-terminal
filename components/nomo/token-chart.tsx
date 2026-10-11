"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsIn, ArrowsOut, ChartBar, ChartLine, CrosshairSimple } from "@phosphor-icons/react";
import {
  CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries, LineStyle,
  createChart, type IChartApi, type ISeriesApi, type MouseEventParams, type Time, type UTCTimestamp,
} from "lightweight-charts";
import { type Token, compact, money, priceText } from "./data";
import "./token-chart.css";

const INTERVALS = ["1m", "5m", "15m", "1h", "4h"] as const;
type Interval = typeof INTERVALS[number];
type Metric = "price" | "mcap";
type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number };
const SECONDS: Record<Interval, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400 };
const GREEN = "#b8f25c";
const RED = "#ff7a93";

function ageSeconds(age: string) {
  const match = age.match(/^(\d+(?:\.\d+)?)([smhd])$/);
  if (!match) return 86400;
  return Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 1);
}

/** Seeded presentation history, constrained by the fixture's stated token age. */
function chartBars(token: Token, interval: Interval, now: number): Bar[] {
  let seed = [...`${token.id}:${interval}`].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const step = SECONDS[interval];
  const age = ageSeconds(token.age);
  const birth = Math.floor(now / 1000) - age;
  const boundary = Math.floor(now / 1000 / step) * step;
  const end = Math.max(boundary, birth);
  const count = Math.max(1, Math.min(160, Math.floor((end - birth) / step) + 1));
  const span = Math.min(age, count * step);
  const change = span <= 3600 ? token.change1h * Math.min(span / 3600, 1) : token.change24h * Math.min(span / 86400, 1.5);
  const target = Math.max(-.85, change / 100);
  const noise = Math.min(.036, .008 + Math.sqrt(step / 60) * .004);
  const walk: number[] = [];
  let current = 1;
  for (let i = 0; i < count; i++) { current *= 1 + (random() - .5) * noise * 2; walk.push(current); }
  const displacement = walk[count - 1] / walk[0];
  const closes = walk.map((value, index) => value / Math.pow(displacement, index / Math.max(1, count - 1)) * Math.pow(1 + target, index / Math.max(1, count - 1)));
  const scale = token.price / closes[count - 1];
  const bars: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const close = closes[i] * scale;
    const open = i ? bars[i - 1].close : close / (1 + (random() - .5) * noise);
    const spread = Math.max(Math.abs(close - open), close * noise * .22);
    bars.push({
      time: (end - (count - 1 - i) * step) as UTCTimestamp,
      open, close,
      high: Math.max(open, close) + spread * (.15 + random() * .9),
      low: Math.max(close * .05, Math.min(open, close) - spread * (.15 + random() * .9)),
      volume: token.volume * Math.min(step / Math.max(60, Math.min(age, 86400)), 1) * (.35 + random() * 1.2),
    });
  }
  return bars;
}

function priceFormat(value: number, metric: Metric, currency: "USD" | "NEAR" = "USD") {
  if (currency === "NEAR") return metric === "mcap" ? compact(value) : value > 0 && value < .0000001 ? value.toExponential(3) : value.toLocaleString("en-US", { maximumFractionDigits: value < .0001 ? 9 : 7 });
  return metric === "mcap" ? money(value) : priceText(value);
}

export function TokenChart({ token, quoteCurrency = "USD", quoteUsdValue = 1, initialMetric = "mcap" }: { token: Token; quoteCurrency?: "USD" | "NEAR"; quoteUsdValue?: number; initialMetric?: Metric }) {
  const quoteValue = Number.isFinite(quoteUsdValue) && quoteUsdValue > 0 ? quoteUsdValue : 1;
  const [interval, setInterval] = useState<Interval>(() => ageSeconds(token.age) < 3600 ? "1m" : "5m");
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const [mode, setMode] = useState<"candles" | "line">("candles");
  const [reading, setReading] = useState<Bar | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [notice, setNotice] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candles = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const line = useRef<ISeriesApi<"Line"> | null>(null);
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);
  const bars = useRef<Bar[]>([]);
  const currentMetric = useRef(metric);
  const currentToken = useRef(token);
  const hoveredTime = useRef<Time | undefined>(undefined);
  const seriesKey = useRef("");
  const lastVolume = useRef(token.volume);
  currentMetric.current = metric;
  currentToken.current = token;

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const instance = createChart(host, {
      width: host.clientWidth, height: host.clientHeight,
      layout: { background: { type: ColorType.Solid, color: "#0b0b0e" }, textColor: "#726e86", fontSize: 10, fontFamily: getComputedStyle(host).fontFamily },
      grid: { vertLines: { color: "#1c1b22" }, horzLines: { color: "#212027" } },
      rightPriceScale: { borderColor: "#27262e", scaleMargins: { top: .12, bottom: .22 }, minimumWidth: 66 },
      timeScale: { borderColor: "#27262e", timeVisible: true, secondsVisible: false, rightOffset: 6, barSpacing: 6, minBarSpacing: 2, fixLeftEdge: false },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#555264", style: LineStyle.Dashed, labelBackgroundColor: "#2f2d38" }, horzLine: { color: "#555264", style: LineStyle.Dashed, labelBackgroundColor: "#2f2d38" } },
      handleScroll: { vertTouchDrag: false },
      localization: { locale: "en-US" },
    });
    chart.current = instance;
    const candleSeries = instance.addSeries(CandlestickSeries, { upColor: GREEN, downColor: RED, borderVisible: false, wickUpColor: GREEN, wickDownColor: RED, priceLineColor: "#657946", priceLineStyle: LineStyle.Dashed, priceLineWidth: 1 });
    const lineSeries = instance.addSeries(LineSeries, { color: GREEN, lineWidth: 2, visible: false, crosshairMarkerRadius: 3, priceLineColor: "#657946", priceLineStyle: LineStyle.Dashed });
    const volumeSeries = instance.addSeries(HistogramSeries, { priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: .84, bottom: 0 }, visible: false });
    candles.current = candleSeries;
    line.current = lineSeries;
    volume.current = volumeSeries;
    const crosshair = (event: MouseEventParams<Time>) => {
      hoveredTime.current = event.time;
      const bar = event.time ? bars.current.find(item => item.time === event.time) : bars.current.at(-1);
      if (bar) setReading(bar);
    };
    instance.subscribeCrosshairMove(crosshair);
    const resize = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) instance.resize(entry.contentRect.width, entry.contentRect.height);
    });
    resize.observe(host);
    setFullscreenAvailable(Boolean(document.fullscreenEnabled && panel.current?.requestFullscreen));
    const onFullscreen = () => setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      resize.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreen);
      instance.unsubscribeCrosshairMove(crosshair);
      instance.remove();
      chart.current = null;
      candles.current = null;
      line.current = null;
      volume.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chart.current || !candles.current || !line.current || !volume.current) return;
    const latestToken = currentToken.current;
    const nextKey = `${latestToken.id}:${interval}`;
    const historyChanged = nextKey !== seriesKey.current;
    if (historyChanged) {
      bars.current = chartBars(latestToken, interval, Date.now());
      seriesKey.current = nextKey;
      lastVolume.current = latestToken.volume;
      hoveredTime.current = undefined;
    }
    const factor = (metric === "mcap" ? latestToken.totalSupply : 1) / quoteValue;
    const quotedPrice = latestToken.price / quoteValue;
    const format = { type: "custom" as const, minMove: metric === "mcap" ? 1 : Math.pow(10, -(quoteCurrency === "NEAR" && quotedPrice < .00001 ? 9 : quotedPrice < .0001 ? 8 : quotedPrice < .001 ? 7 : 6)), formatter: (value: number) => priceFormat(value, metric, quoteCurrency) };
    candles.current.applyOptions({ priceFormat: format });
    line.current.applyOptions({ priceFormat: format, color: latestToken.change24h < 0 ? RED : GREEN });
    const range = chart.current.timeScale().getVisibleLogicalRange();
    candles.current.setData(bars.current.map(bar => ({ time: bar.time, open: bar.open * factor, high: bar.high * factor, low: bar.low * factor, close: bar.close * factor })));
    line.current.setData(bars.current.map(bar => ({ time: bar.time, value: bar.close * factor })));
    volume.current.setData(bars.current.map(bar => ({ time: bar.time, value: bar.volume / quoteValue, color: bar.close >= bar.open ? "#4a652288" : "#7b3c4888" })));
    setReading(bars.current.at(-1) ?? null);
    if (historyChanged) chart.current.timeScale().fitContent();
    else if (range) chart.current.timeScale().setVisibleLogicalRange(range);
  }, [token.id, interval, metric, quoteCurrency, quoteValue]);

  useEffect(() => {
    const latest = bars.current.at(-1);
    if (!latest || !candles.current || !line.current || !volume.current) return;
    // Updating only the newest fixture candle preserves the user's pan and zoom.
    const updated = { ...latest, close: token.price, high: Math.max(latest.high, token.price), low: Math.min(latest.low, token.price), volume: latest.volume + Math.max(0, token.volume - lastVolume.current) };
    bars.current[bars.current.length - 1] = updated;
    lastVolume.current = token.volume;
    const factor = (currentMetric.current === "mcap" ? token.totalSupply : 1) / quoteValue;
    candles.current.update({ time: updated.time, open: updated.open * factor, high: updated.high * factor, low: updated.low * factor, close: updated.close * factor });
    line.current.update({ time: updated.time, value: updated.close * factor });
    volume.current.update({ time: updated.time, value: updated.volume / quoteValue, color: updated.close >= updated.open ? "#4a652288" : "#7b3c4888" });
    if (!hoveredTime.current || hoveredTime.current === updated.time) setReading(updated);
  }, [token.price, token.volume, token.totalSupply, quoteValue]);

  useEffect(() => {
    candles.current?.applyOptions({ visible: mode === "candles" });
    line.current?.applyOptions({ visible: mode === "line" });
  }, [mode]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === panel.current) await document.exitFullscreen();
      else await panel.current?.requestFullscreen();
      setNotice("");
    } catch { setNotice("Full screen is unavailable in this browser."); }
  };
  const factor = (metric === "mcap" ? token.totalSupply : 1) / quoteValue;
  return <section className="ntc-chart" ref={panel} aria-label={`${token.symbol} chart`}>
    <div className="ntc-toolbar">
      <div className="ntc-intervals" role="group" aria-label="Chart candle interval">
        {INTERVALS.map(item => <button key={item} type="button" className={interval === item ? "active" : ""} aria-pressed={interval === item} onClick={() => setInterval(item)}>{item}</button>)}
      </div>
      <span className="ntc-divider" />
      <div className="ntc-metrics" role="group" aria-label="Chart value">
        <button type="button" className={metric === "price" ? "active" : ""} aria-pressed={metric === "price"} onClick={() => setMetric("price")}>Price</button>
        <button type="button" className={metric === "mcap" ? "active" : ""} aria-pressed={metric === "mcap"} onClick={() => setMetric("mcap")}>MCap</button>
      </div>
      <div className="ntc-tools">
        <button type="button" aria-label={mode === "candles" ? "Show line chart" : "Show candlestick chart"} title={mode === "candles" ? "Line chart" : "Candlestick chart"} onClick={() => setMode(mode === "candles" ? "line" : "candles")}>{mode === "candles" ? <ChartLine size={16} /> : <ChartBar size={16} />}</button>
        <button type="button" aria-label="Fit chart to data" title="Fit chart" onClick={() => { chart.current?.priceScale("right").applyOptions({ autoScale: true }); chart.current?.timeScale().fitContent(); }}><CrosshairSimple size={16} /></button>
        {fullscreenAvailable && <button type="button" aria-label={fullscreen ? "Exit chart full screen" : "Expand chart"} title={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>{fullscreen ? <ArrowsIn size={15} /> : <ArrowsOut size={15} />}</button>}
      </div>
    </div>
    <div className="ntc-readout">
      <span className="ntc-chart-label">{token.symbol}<span> / {quoteCurrency}</span></span>
      {reading && <div className={`ntc-ohlc ${reading.close >= reading.open ? "is-up" : "is-down"}`}>
        {([['O', reading.open], ['H', reading.high], ['L', reading.low], ['C', reading.close]] as const).map(([label, value]) => <span key={label}><i>{label}</i>{priceFormat(value * factor, metric, quoteCurrency)}</span>)}
      </div>}

    </div>
    <div className="ntc-canvas" ref={container} aria-label={`Interactive ${interval} ${metric === "mcap" ? "market cap" : "price"} chart quoted in ${quoteCurrency}. Drag to pan, scroll to zoom.`} />
    {notice && <p className="ntc-notice" role="status">{notice}</p>}
  </section>;
}
