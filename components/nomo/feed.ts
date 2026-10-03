"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEventHandler, type PointerEventHandler } from "react";
import { TOKENS, type Token } from "./data";

export type FeedState = { tokens: Token[]; tick: number };
export type FeedStep = { cycle: number; index: number; reorder?: boolean };

// A repeatable local feed keeps the first server and client render identical.
// These values are presentation fixtures; no chain or market service is queried.
function sample(cycle: number, index: number, salt = 0) {
  let value = Math.imul(cycle + 19, 374761393) ^ Math.imul(index + 31, 668265263) ^ Math.imul(salt + 7, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function nextToken(previous: Token, original: Token, cycle: number, index: number, tick: number): Token {
  const magnitude = 0.002 + sample(cycle, index, 1) * 0.014;
  let direction: 1 | -1 = sample(cycle, index, 2) > 0.49 ? 1 : -1;
  const currentRatio = previous.price / original.price;
  let ratio = currentRatio * (1 + direction * magnitude);
  // Keep long-running previews close to their authored market snapshot.
  if (ratio < 0.82 || ratio > 1.18) {
    direction = direction === 1 ? -1 : 1;
    ratio = currentRatio * (1 + direction * magnitude);
  }
  ratio = Math.min(1.18, Math.max(0.82, ratio));
  const price = Number((original.price * ratio).toPrecision(10));
  const actualRatio = price / original.price;
  const mcap = Math.round(original.mcap * actualRatio);
  const change = (start: number) => Number((((1 + start / 100) * actualRatio - 1) * 100).toFixed(2));
  const volumeDelta = sample(cycle, index, 3) > 0.48
    ? Math.round(35 + original.volume * (0.0001 + sample(cycle, index, 4) * 0.0004))
    : 0;
  const transactions = volumeDelta ? Math.max(1, Math.round(volumeDelta / (50 + sample(cycle, index, 5) * 160))) : 0;
  const buys = Math.round(transactions * (direction > 0 ? 0.7 : 0.3));
  const latestPoint = previous.points[previous.points.length - 1];
  return {
    ...previous,
    price,
    mcap,
    athMcap: Math.max(previous.athMcap, mcap),
    change1m: change(original.change1m),
    change5m: change(original.change5m),
    change30m: change(original.change30m),
    change1h: change(original.change1h),
    change24h: change(original.change24h),
    volume: previous.volume + volumeDelta,
    fees: previous.fees + Math.round(volumeDelta * 0.008),
    liquidity: Math.round(original.liquidity * (0.8 + actualRatio * 0.2)),
    buys: previous.buys + buys,
    sells: previous.sells + transactions - buys,
    holders: previous.holders + (direction > 0 && transactions > 0 && sample(cycle, index, 6) > 0.8 ? 1 : 0),
    points: [...previous.points.slice(1), Number((latestPoint * price / previous.price).toFixed(4))],
    direction,
    updatedAtTick: tick,
  };
}

/** Pure single-token step, also used by the scheduled feed and invariant checks. */
export function advanceMarketFeed(previous: FeedState, { cycle, index, reorder = false }: FeedStep): FeedState {
  const original = TOKENS[index];
  if (!original) return previous;
  const tick = previous.tick + 1;
  const tokens = previous.tokens.map(token => token.id === original.id
    ? nextToken(token, original, cycle, index, tick)
    : token);
  if (reorder && tokens.length > 1) {
    const at = Math.floor(sample(cycle, 0, 10) * Math.min(9, tokens.length - 1));
    [tokens[at], tokens[at + 1]] = [tokens[at + 1], tokens[at]];
  }
  return { tokens, tick };
}

export function useMarketFeed() {
  const [state, setState] = useState<FeedState>(() => ({
    tokens: TOKENS.map(token => ({ ...token, points: [...token.points] })),
    tick: 0,
  }));
  const [paused, setPaused] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [visible, setVisible] = useState(true);
  const cycleRef = useRef(0);
  const focusBoundary = useRef<HTMLElement | null>(null);
  const running = !paused && !pointerInside && !focusInside && visible;

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  // Removing a focused row need not dispatch blur. Reconcile after every
  // render so filtering or un-starring that row cannot leave the feed held.
  useEffect(() => {
    if (focusInside && !focusBoundary.current?.contains(document.activeElement)) {
      focusBoundary.current = null;
      setFocusInside(false);
    }
  });

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!cancelled) callback();
      }, delay);
      timers.add(timer);
    };
    const batch = () => {
      const cycle = ++cycleRef.current;
      const count = 3 + Math.floor(sample(cycle, 0, 8) * 4);
      const start = Math.floor(sample(cycle, 0, 9) * TOKENS.length);
      for (let position = 0; position < count; position++) {
        // Five is coprime to the 36-token snapshot: every update in a batch is distinct.
        const index = (start + position * 5) % TOKENS.length;
        schedule(() => {
          setState(previous => advanceMarketFeed(previous, { cycle, index, reorder: cycle % 4 === 0 && position === count - 1 }));
        }, position * 120 + Math.floor(sample(cycle, index, 11) * 45));
      }
      schedule(batch, 1100);
    };
    schedule(batch, 1100);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [running]);

  const onPointerEnter = useCallback<PointerEventHandler<HTMLElement>>(event => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") setPointerInside(true);
  }, []);
  const onPointerLeave = useCallback<PointerEventHandler<HTMLElement>>(() => setPointerInside(false), []);
  const onFocusCapture = useCallback<FocusEventHandler<HTMLElement>>(event => {
    focusBoundary.current = event.currentTarget;
    setFocusInside(true);
  }, []);
  const onBlurCapture = useCallback<FocusEventHandler<HTMLElement>>(event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      focusBoundary.current = null;
      setFocusInside(false);
    }
  }, []);
  const interactionProps = useMemo(() => ({
    onPointerEnter,
    onPointerLeave,
    onPointerCancel: onPointerLeave,
    onFocusCapture,
    onBlurCapture,
  }), [onPointerEnter, onPointerLeave, onFocusCapture, onBlurCapture]);

  return { tokens: state.tokens, tick: state.tick, paused, setPaused, running, interactionProps };
}
