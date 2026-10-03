"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function useNavMotion() {
  const nav = useRef<HTMLElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const removeListeners: (() => void)[] = [];

      nav.current?.querySelectorAll<HTMLButtonElement>("[data-nav-motion]").forEach(button => {
        const icon = button.querySelector("svg");
        if (!icon) return;

        gsap.set(icon, { transformOrigin: "50% 50%" });
        const motion = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });

        switch (button.dataset.navMotion) {
          case "discover":
            motion.to(icon, { rotation: -8, duration: 0.22 })
              .to(icon, { rotation: 0, duration: 0.3 });
            break;
          case "pairs":
            motion.to(icon, { scale: 1.06, duration: 0.22 })
              .to(icon, { scale: 1, duration: 0.3 });
            break;
          case "portfolio":
            motion.to(icon, { y: -0.8, duration: 0.22 })
              .to(icon, { y: 0, duration: 0.3 });
            break;
          case "pulse":
          case "trackers":
          case "leaderboard":
          case "bridge":
            motion.to(icon, { x: 1.2, duration: 0.22 })
              .to(icon, { x: 0, duration: 0.3 });
            break;
        }

        // Reuse one timeline per icon, even when the feed rerenders or a user
        // repeatedly enters a tab. Event callbacks never create more tweens.
        const play = () => { motion.restart(); };
        const onEnter = (event: PointerEvent) => { if (event.pointerType !== "touch") play(); };
        const onFocus = () => { if (button.matches(":focus-visible")) play(); };
        button.addEventListener("pointerenter", onEnter);
        button.addEventListener("focus", onFocus);
        button.addEventListener("click", play);
        removeListeners.push(() => {
          button.removeEventListener("pointerenter", onEnter);
          button.removeEventListener("focus", onFocus);
          button.removeEventListener("click", play);
        });
      });

      return () => removeListeners.forEach(remove => remove());
    });

    return () => media.revert();
  }, { scope: nav });

  return nav;
}
