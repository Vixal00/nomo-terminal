"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./feature-fire.css";

const IDLE = 0.035;
const FRAME_MS = 1000 / 30;
/** Decorative only: mount inside a positioned feature button. */
export function FeatureFire({ className = "" }: { className?: string }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const host = layer?.closest("button");
    const context = canvas?.getContext("2d", { alpha: true });
    if (!layer || !canvas || !host || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const energy = { value: IDLE };
    let tween: gsap.core.Tween | undefined;
    let raf = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let disposed = false;
    let visible = false;
    let hovered = false;
    let focused = false;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let coinCenterX = 62;
    let coinCenterY = 44;
    let coinWidth = 102;
    let corners: [number, number, number, number] = [0, 0, 0, 0];
    const seed = Array.from(host.textContent || "Nomo").reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
    const canRun = () => !disposed && visible && !document.hidden && !reduced.matches && width > 0 && height > 0;
    const target = () => hovered || focused ? 1 : IDLE;

    const draw = () => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      if (reduced.matches || !width || !height) return;
      const intensity = energy.value;
      const phase = (seed % 97) / 97 * Math.PI * 2;
      const breath = 1 + Math.sin(elapsed * 0.3 + phase) * 0.015;

      context.save();
      context.beginPath();
      context.roundRect(0, 0, width, height, corners);
      context.clip();

      // One tight radial falloff ends around the coin. Card-edge masks and
      // broad washes make a circular glow read as a rectangular backlight.
      const bloom = (radius: number, opacity: number) => {
        context.save();
        context.translate(coinCenterX, coinCenterY);
        context.scale(radius, radius);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, `rgba(47, 221, 79, ${opacity})`);
        gradient.addColorStop(0.35, `rgba(42, 199, 73, ${opacity * 0.82})`);
        gradient.addColorStop(0.58, `rgba(34, 166, 62, ${opacity * 0.4})`);
        gradient.addColorStop(0.8, `rgba(29, 141, 54, ${opacity * 0.055})`);
        gradient.addColorStop(0.95, `rgba(29, 141, 54, ${opacity * 0.005})`);
        gradient.addColorStop(1, "rgba(97,144,26,0)");
        context.fillStyle = gradient;
        context.fillRect(-1, -1, 2, 2);
        context.restore();
      };
      bloom(coinWidth * (0.57 + intensity * 0.03) * breath, intensity * 0.12);
      context.restore();
    };

    const frame = (now: number) => {
      raf = 0;
      if (!canRun()) return;
      const delta = now - lastFrame;
      if (!lastFrame || delta >= FRAME_MS) {
        elapsed += lastFrame ? Math.min(delta, 64) / 1000 * (0.4 + energy.value * 0.3) : 0;
        lastFrame = now;
        draw();
      }
      raf = window.requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = 0;
      tween?.kill();
      tween = undefined;
    };
    const start = () => {
      if (canRun() && !raf) raf = window.requestAnimationFrame(frame);
    };
    const excite = () => {
      layer.dataset.active = String(hovered || focused);
      tween?.kill();
      tween = undefined;
      if (!canRun()) { energy.value = target(); return; }
      tween = gsap.to(energy, { value: target(), duration: hovered || focused ? 0.5 : 1, ease: "power2.out" });
      start();
    };

    const resize = () => {
      if (disposed) return;
      const rectangle = layer.getBoundingClientRect();
      width = rectangle.width;
      height = rectangle.height;
      const artwork = host.querySelector(".ni-spotlight-rim")?.getBoundingClientRect();
      if (artwork) {
        coinWidth = artwork.width;
        coinCenterX = artwork.left - rectangle.left + artwork.width / 2;
        coinCenterY = artwork.top - rectangle.top + artwork.height / 2;
      }
      layer.style.setProperty("--nm-glow-x", `${coinCenterX}px`);
      layer.style.setProperty("--nm-glow-y", `${coinCenterY}px`);
      layer.style.setProperty("--nm-glow-radius", `${coinWidth * (0.57 + IDLE * 0.03)}px`);
      layer.style.setProperty("--nm-glow-active-radius", `${coinWidth * 0.6}px`);
      ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.ceil(width * ratio));
      canvas.height = Math.max(1, Math.ceil(height * ratio));
      const style = getComputedStyle(host);
      corners = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map(value => Math.min(Math.max(0, (parseFloat(value) || 0) - 1), width / 2, height / 2)) as typeof corners;
      if (canRun()) { draw(); start(); }
    };
    const syncVisibility = () => {
      if (!canRun()) { stop(); return; }
      hovered = host.matches(":hover");
      focused = host.matches(":focus-visible");
      excite();
      start();
    };
    const onPreference = () => {
      layer.dataset.motion = reduced.matches ? "reduced" : "enabled";
      stop();
      if (reduced.matches) context.clearRect(0, 0, canvas.width, canvas.height);
      else { energy.value = target(); syncVisibility(); }
    };
    const onEnter = (event: PointerEvent) => { if (event.pointerType !== "touch") { hovered = true; excite(); } };
    const onLeave = () => { hovered = false; excite(); };
    const onFocus = () => { focused = host.matches(":focus-visible"); excite(); };
    const onBlur = () => { focused = false; excite(); };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncVisibility();
    }, { threshold: 0 });

    layer.dataset.motion = reduced.matches ? "reduced" : "enabled";
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onLeave);
    host.addEventListener("focus", onFocus);
    host.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("resize", resize);
    reduced.addEventListener("change", onPreference);
    resizeObserver.observe(host);
    const artworkImage = host.querySelector(".ni-spotlight-rim");
    if (artworkImage) resizeObserver.observe(artworkImage);
    intersectionObserver.observe(host);
    resize();

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
      host.removeEventListener("focus", onFocus);
      host.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("resize", resize);
      reduced.removeEventListener("change", onPreference);
    };
  }, []);

  return <span ref={layerRef} className={`nm-feature-fire ${className}`.trim()} aria-hidden="true"><canvas ref={canvasRef} /></span>;
}

export default FeatureFire;
