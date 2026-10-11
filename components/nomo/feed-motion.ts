"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

type Position = { id: string; top: number; sequence: number };
type InlineStyle = { value: string; priority: string };
const capture = (node: HTMLElement, property: string): InlineStyle => ({
  value: node.style.getPropertyValue(property),
  priority: node.style.getPropertyPriority(property),
});
function restore(node: HTMLElement, property: string, original: InlineStyle) {
  if (original.value) node.style.setProperty(property, original.value, original.priority);
  else node.style.removeProperty(property);
}

export function useFeedMotion(ref: RefObject<HTMLDivElement | null>, tick: number) {
  const positions = useRef(new Map<HTMLElement, Position>());
  const lastTick = useRef(tick);
  const movement = useRef(new Map<HTMLElement, { tween: gsap.core.Tween; original: InlineStyle }>());
  const flashes = useRef(new Map<HTMLElement, { tween: gsap.core.Tween; original: InlineStyle }>());

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clearMotion = () => {
      movement.current.forEach(({ tween, original }, node) => { tween.kill(); restore(node, "transform", original); });
      flashes.current.forEach(({ tween, original }, node) => { tween.kill(); restore(node, "color", original); });
      movement.current.clear();
      flashes.current.clear();
    };
    const onPreference = () => { if (preference.matches) clearMotion(); };
    preference.addEventListener("change", onPreference);
    return () => {
      preference.removeEventListener("change", onPreference);
      clearMotion();
      positions.current.clear();
    };
  }, []);

  // Measure after every render so filtering and manual sorting establish a fresh
  // baseline; only a feed tick is allowed to animate a subsequent displacement.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const feedChanged = tick !== lastTick.current;
    lastTick.current = tick;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rootRect = root.getBoundingClientRect();
    const styles = getComputedStyle(root);
    const positive = styles.getPropertyValue("--nm-green").trim() || "#b8f25c";
    const negative = styles.getPropertyValue("--nm-red").trim() || "#ff7a93";
    const nextPositions = new Map<HTMLElement, Position>();
    const rows = root.querySelectorAll<HTMLElement>("[data-feed-id]");
    rows.forEach(node => {
      const scope = node.closest("[data-feed-scope]");
      if (scope && scope !== root) return;
      const id = node.dataset.feedId || "";
      const sequence = Number(node.dataset.feedSeq || 0);
      const old = positions.current.get(node);
      const offset = Number(gsap.getProperty(node, "y")) || 0;
      let scroll = 0;
      let parent = node.parentElement;
      while (parent && root.contains(parent)) {
        scroll += parent.scrollTop;
        if (parent === root) break;
        parent = parent.parentElement;
      }
      const top = node.getBoundingClientRect().top - rootRect.top + scroll - offset;
      nextPositions.set(node, { id, top, sequence });
      if (!feedChanged || reduced || !old || old.id !== id) return;

      const displacement = old.top - top;
      if (Math.abs(displacement) > 0.5) {
        const prior = movement.current.get(node);
        const original = prior?.original || capture(node, "transform");
        prior?.tween.kill();
        const tween = gsap.fromTo(node, { y: displacement + offset }, {
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
          onComplete: () => {
            restore(node, "transform", original);
            movement.current.delete(node);
          },
        });
        movement.current.set(node, { tween, original });
      }

      if (sequence <= old.sequence) return;
      const color = Number(node.dataset.feedDirection) < 0 ? negative : positive;
      const values = node.matches(".nm-tick-value") ? [node] : Array.from(node.querySelectorAll<HTMLElement>(".nm-tick-value"));
      values.forEach(value => {
        const prior = flashes.current.get(value);
        const original = prior?.original || capture(value, "color");
        prior?.tween.kill();
        restore(value, "color", original);
        const restingColor = getComputedStyle(value).color;
        const tween = gsap.fromTo(value, { color }, {
          color: restingColor,
          duration: 0.65,
          ease: "power1.out",
          overwrite: "auto",
          onComplete: () => {
            restore(value, "color", original);
            flashes.current.delete(value);
          },
        });
        flashes.current.set(value, { tween, original });
      });
    });
    positions.current = nextPositions;
    movement.current.forEach(({ tween, original }, node) => {
      if (root.contains(node)) return;
      tween.kill(); restore(node, "transform", original); movement.current.delete(node);
    });
    flashes.current.forEach(({ tween, original }, node) => {
      if (root.contains(node)) return;
      tween.kill(); restore(node, "color", original); flashes.current.delete(node);
    });
  });
}
