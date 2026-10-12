"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Two staggered rows advance together along the lower arc of an ellipse.
const coins = [
  { name: "ember", x: -1, bottom: 76, size: 160, angle: -20, back: true },
  { name: "prism", x: 11, bottom: -35, size: 157, angle: 16, back: true },
  { name: "ribbit", x: 23, bottom: -108, size: 151, angle: -18, back: true },
  { name: "telly", x: 79, bottom: -108, size: 151, angle: 15, back: true },
  { name: "orbit", x: 91, bottom: -30, size: 157, angle: -18, back: true },
  { name: "heart", x: 101, bottom: 76, size: 160, angle: 16, back: true },
  { name: "octo", x: -3, bottom: 233, size: 166, angle: 18 },
  { name: "shroom", x: 6, bottom: 139, size: 187, angle: -13 },
  { name: "telly", x: 16, bottom: 62, size: 176, angle: -12 },
  { name: "orbit", x: 26, bottom: -7, size: 171, angle: 12 },
  { name: "heart", x: 36, bottom: -53, size: 156, angle: -10 },
  { name: "solar", x: 64, bottom: -53, size: 156, angle: -15 },
  { name: "dice", x: 74, bottom: -7, size: 171, angle: 8 },
  { name: "wave", x: 84, bottom: 62, size: 176, angle: 17 },
  { name: "nearly", x: 94, bottom: 139, size: 187, angle: -12 },
  { name: "octo", x: 103, bottom: 233, size: 166, angle: 18 },
];

// Sparkles [left %, bottom px, size px] and soap-bubble orbs, from the header art.
const sparkles = [[33, 250, 16], [62, 300, 12], [69, 150, 20], [29, 120, 11], [56, 330, 9], [42, 290, 13]];
const orbs = [[37, 205, 22], [64, 235, 16], [31, 300, 12], [71, 90, 18]];

export function LandingCoins() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const belt = beltRef.current;
    const center = centerRef.current;
    if (!scene || !belt || !center) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const orbitNodes = [...belt.querySelectorAll<HTMLDivElement>(".nl-belt-coin")];
    const angles = coins.map(coin => Math.asin((coin.x - 50) / 75));
    let beltWidth = belt.clientWidth;
    let narrow = window.innerWidth <= 760;
    let frame = 0;
    let lastTime = 0;
    const current = { belt: 0, x: 0, y: 0 };
    const target = { belt: 0, x: 0, y: 0 };
    const canTrack = () => !reducedMotion.matches && finePointer.matches && !document.hidden;

    const paint = () => {
      // Move each coin along the curve, preserving the orbit's shape and horizon.
      // Positive cursor input advances clockwise around the ellipse.
      const phase = -current.belt * Math.PI / 180;
      orbitNodes.forEach((node, index) => {
        const angle = angles[index];
        const dx = .75 * beltWidth * (Math.sin(angle + phase) - Math.sin(angle)) * (narrow ? 1.16 : 1);
        const dy = 1000 * (Math.cos(angle + phase) - Math.cos(angle)) * (narrow ? .76 : 1);
        node.style.transform = `translate(calc(-50% + ${dx.toFixed(2)}px), ${dy.toFixed(2)}px) rotate(${coins[index].angle}deg)`;
      });
      center.style.transform = `rotateX(${current.x.toFixed(3)}deg) rotateY(${current.y.toFixed(3)}deg)`;
    };

    const animate = (time: number) => {
      frame = 0;
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 16.67;
      lastTime = time;
      const ease = 1 - Math.exp(-elapsed / 180);
      let unsettled = false;
      for (const key of ["belt", "x", "y"] as const) {
        current[key] += (target[key] - current[key]) * ease;
        if (Math.abs(target[key] - current[key]) > 0.005) unsettled = true;
        else current[key] = target[key];
      }
      paint();
      if (unsettled && canTrack()) frame = requestAnimationFrame(animate);
      else lastTime = 0;
    };

    const schedule = () => {
      if (!frame && canTrack()) frame = requestAnimationFrame(animate);
    };
    const reset = () => {
      target.belt = target.x = target.y = 0;
      schedule();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      current.belt = current.x = current.y = 0;
      target.belt = target.x = target.y = 0;
      paint();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !canTrack()) return;
      const x = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1));
      target.belt = x * 1.5;
      target.x = -y * 2;
      target.y = x * 3;
      schedule();
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };
    const onPreferenceChange = () => { if (!canTrack()) stop(); };
    const onResize = () => { beltWidth = belt.clientWidth; narrow = window.innerWidth <= 760; reset(); };
    const onVisibilityChange = () => {
      scene.classList.toggle("is-paused", document.hidden);
      if (document.hidden) stop();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("blur", reset);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);
    onVisibilityChange();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return (
    <div ref={sceneRef} className="nl-scene" aria-hidden="true">
      <div className="nl-coin-glow" />
      <div ref={beltRef} className="nl-coin-belt">
        {coins.map((coin, index) => (
          <div
            key={`${coin.name}-${index}`}
            className={`nl-coin nl-belt-coin${coin.back ? " nl-belt-coin--back" : ""}`}
            style={{
              "--coin-x": `${coin.x}%`,
              "--coin-bottom": `${coin.bottom}px`,
              "--coin-size": `clamp(118px, ${coin.size / 15.4}vw, ${coin.size}px)`,
              "--coin-rotation": `${coin.angle}deg`,
              "--float-duration": `${8 + (index % 5)}s`,
              "--float-delay": `${-index * 1.7}s`,
            } as CSSProperties}
          >
            <img src={`/nomo/coins/${coin.name}.webp`} alt="" width={300} height={299} draggable={false} />
          </div>
        ))}
      </div>
      <div className="nl-coin nl-coin--nomo">
        <i className="nl-ring nl-ring--back" />
        <div ref={centerRef} className="nl-center-tilt">
          <img src="/nomo/nomo-coin.webp" alt="" width={816} height={792} fetchPriority="high" draggable={false} />
          <i className="nl-coin-sheen" />
        </div>
        <i className="nl-ring nl-ring--front" />
      </div>
      <div className="nl-social">
        <span className="nl-bubble nl-bubble--lfg">lfg</span>
        <span className="nl-bubble nl-bubble--copy">copying you</span>
        <span className="nl-bubble nl-bubble--ape">aping $NOMO</span>
        <span className="nl-pnl">+420.69%</span>
        {sparkles.map((s, i) => <i key={i} className="nl-sparkle" style={{ left: `${s[0]}%`, bottom: `${s[1]}px`, "--sparkle-size": `${s[2]}px`, "--sparkle-delay": `${-i * 0.7}s` } as CSSProperties} />)}
        {orbs.map((o, i) => <i key={i} className="nl-orb" style={{ left: `${o[0]}%`, bottom: `${o[1]}px`, "--orb-size": `${o[2]}px`, "--float-delay": `${-i * 1.3}s` } as CSSProperties} />)}
      </div>
    </div>
  );
}
