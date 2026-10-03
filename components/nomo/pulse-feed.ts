"use client";

import { useEffect, useState } from "react";
import type { Token } from "./data";
import { advancePulseSimulation, createPulseSimulation, type HeldStages } from "./pulse-simulation";

export function usePulseFeed(seeds: Token[], paused: boolean, held: HeldStages) {
  const [state, setState] = useState(() => createPulseSimulation(seeds));
  const holdNew = Boolean(held.New);
  const holdGraduating = Boolean(held.Graduating);
  const holdMigrated = Boolean(held.Established);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setState(previous => advancePulseSimulation(previous, { New: holdNew, Graduating: holdGraduating, Established: holdMigrated }));
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, holdNew, holdGraduating, holdMigrated]);
  return state;
}
