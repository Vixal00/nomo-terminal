"use client";

import { useEffect, useRef, useState } from "react";

type UnicornScene = { paused: boolean; resize: () => void; destroy: () => void };
type UnicornRuntime = {
  addScene: (options: {
    element: HTMLElement;
    filePath: string;
    fps: number;
    dpi: number;
    scale: number;
    lazyLoad: boolean;
    interactivity: { mouse: { disabled: boolean; disableMobile: boolean } };
  }) => Promise<UnicornScene>;
};
type UnicornWindow = Window & { UnicornStudio?: UnicornRuntime };

let runtimePromise: Promise<UnicornRuntime> | undefined;

function loadRuntime() {
  const existing = (window as UnicornWindow).UnicornStudio;
  if (existing?.addScene) return Promise.resolve(existing);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<UnicornRuntime>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/nomo/scene/unicornStudio-2.3.0.umd.js";
    script.async = true;
    script.onload = () => {
      const runtime = (window as UnicornWindow).UnicornStudio;
      if (runtime?.addScene) resolve(runtime);
      else { runtimePromise = undefined; script.remove(); reject(new Error("Scene runtime unavailable")); }
    };
    script.onerror = () => {
      runtimePromise = undefined;
      script.remove();
      reject(new Error("Scene runtime could not load"));
    };
    document.head.appendChild(script);
  });
  return runtimePromise;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch { return false; }
}

export function LandingBackground() {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let generation = 0;
    let starting = false;
    let scene: UnicornScene | undefined;
    let resizeFrame = 0;
    let canvas: HTMLCanvasElement | null = null;

    const stop = () => {
      generation += 1;
      starting = false;
      canvas?.removeEventListener("webglcontextlost", onContextLost);
      canvas = null;
      scene?.destroy();
      scene = undefined;
      if (!disposed) setReady(false);
    };
    const onContextLost = () => { stop(); };

    const start = async () => {
      if (disposed || starting || scene || reducedMotion.matches || document.hidden) return;
      starting = true;
      const currentGeneration = ++generation;
      if (!supportsWebGL()) { starting = false; return; }
      try {
        const runtime = await loadRuntime();
        if (disposed || currentGeneration !== generation) return;
        const created = await runtime.addScene({
          element: host,
          filePath: "/nomo/scene/first-project.json",
          fps: 30,
          dpi: 1,
          scale: 0.75,
          lazyLoad: false,
          interactivity: { mouse: { disabled: false, disableMobile: true } },
        });
        if (disposed || currentGeneration !== generation) { created.destroy(); return; }
        scene = created;
        scene.paused = document.hidden;
        canvas = host.querySelector("canvas");
        canvas?.addEventListener("webglcontextlost", onContextLost);
        setReady(true);
      } catch {
        // The static background remains available if the scene cannot render.
        if (!disposed && currentGeneration === generation) stop();
      } finally {
        if (currentGeneration === generation) starting = false;
      }
    };

    const onMotionChange = () => { if (reducedMotion.matches) stop(); else void start(); };
    const onVisibilityChange = () => { if (scene) scene.paused = document.hidden; else if (!document.hidden) void start(); };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => scene?.resize());
    });

    observer.observe(host);
    reducedMotion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void start();

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      reducedMotion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, []);

  return <div className="nl-background" aria-hidden="true"><div ref={container} className={`nl-background-canvas${ready ? " is-ready" : ""}`} /></div>;
}
