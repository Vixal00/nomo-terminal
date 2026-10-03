import type { MarketStage, Token } from "./data";

export type HeldStages = Partial<Record<MarketStage, boolean>>;
export type PulseSimulation = {
  tokens: Token[];
  tick: number;
  ages: Record<string, number>;
  generations: Record<string, number>;
  arrivals: string[];
};

function sample(tick: number, index: number, salt: number) {
  let value = Math.imul(tick + 23, 374761393) ^ Math.imul(index + 37, 668265263) ^ Math.imul(salt + 11, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function pulseAge(seconds: number) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

/** A deterministic local launch cycle, with no market or transaction connection. */
export function createPulseSimulation(seeds: Token[]): PulseSimulation {
  const ages: Record<string, number> = {};
  const counts: Record<MarketStage, number> = { New: 0, Graduating: 0, Established: 0 };
  return {
    tokens: seeds.map(token => {
      const index = counts[token.stage]++;
      const seconds = token.stage === "New" ? 1 + index * 5 : token.stage === "Graduating" ? 420 + index * 165 : 18 + index * 46;
      ages[token.id] = seconds;
      return { ...token, age: pulseAge(seconds), updatedAtTick: 0 };
    }),
    tick: 0, ages, generations: {}, arrivals: [],
  };
}

export function advancePulseSimulation(previous: PulseSimulation, held: HeldStages = {}): PulseSimulation {
  const tick = previous.tick + 1;
  const ages = Object.fromEntries(Object.entries(previous.ages).map(([id, age]) => [id, age + 1]));
  const generations = { ...previous.generations };
  const arrivals: string[] = [];
  const tokens = previous.tokens.map((token, index) => {
    if (sample(tick, index, 0) > (token.stage === "New" ? .65 : .4)) return { ...token, age: pulseAge(ages[token.id]) };
    const direction: 1 | -1 = sample(tick, index, 1) > .43 ? 1 : -1;
    const move = direction * (.001 + sample(tick, index, 2) * (token.stage === "New" ? .027 : .011));
    const mcap = Math.max(2200, Math.round(token.mcap * (1 + move)));
    const ratio = mcap / token.mcap;
    const volumeDelta = Math.round((token.stage === "New" ? 5 : 45) + sample(tick, index, 3) * (token.stage === "New" ? 140 : 650));
    const transactions = Math.max(1, Math.round(volumeDelta / (30 + sample(tick, index, 4) * 150)));
    const buys = Math.round(transactions * (direction > 0 ? .75 : .3));
    const change = (value: number) => Number(((1 + value / 100) * ratio * 100 - 100).toFixed(2));
    return {
      ...token, age: pulseAge(ages[token.id]), mcap, price: mcap / token.totalSupply,
      volume: token.volume + volumeDelta, fees: token.fees + volumeDelta * .008,
      liquidity: Math.round(token.liquidity * (.8 + ratio * .2)),
      athMcap: Math.max(token.athMcap, mcap),
      change1m: change(token.change1m), change5m: change(token.change5m), change30m: change(token.change30m), change1h: change(token.change1h), change24h: change(token.change24h),
      buys: token.buys + buys, sells: token.sells + transactions - buys,
      holders: token.holders + (direction > 0 && sample(tick, index, 5) > .65 ? 1 : 0),
      progress: token.stage === "Established" ? 100 : Math.min(token.stage === "New" ? 60 : 99.8, token.progress + sample(tick, index, 6) * 1.7),
      direction, updatedAtTick: tick,
      points: [...token.points.slice(1), token.points[token.points.length - 1] * ratio],
    };
  });
  const oldest = (stage: MarketStage) => tokens.filter(token => token.stage === stage).sort((a, b) => ages[b.id] - ages[a.id])[0];
  const enter = (token: Token, stage: MarketStage) => {
    token.stage = stage;
    token.launchpad = stage === "Established" ? "Raydium" : "Pump.fun";
    token.age = "0s";
    ages[token.id] = 0;
    generations[token.id] = (generations[token.id] || 0) + 1;
    arrivals.push(token.id);
    token.updatedAtTick = tick;
    token.direction = 1;
    if (stage === "Established") token.progress = 100;
    else if (stage === "Graduating") token.progress = 65 + sample(tick, 0, 7) * 9;
    else {
      const mcap = Math.round(3300 + sample(tick, 0, 8) * 1600);
      Object.assign(token, {
        mcap, price: mcap / token.totalSupply, athMcap: mcap, volume: 0, fees: 0,
        liquidity: Math.round(mcap * .13), holders: 1, buys: 0, sells: 0, progress: 0,
        change1m: 0, change5m: 0, change30m: 0, change1h: 0, change24h: 0,
        points: token.points.map(() => 25),
      });
    }
  };

  // Rotate existing, routable fixture tokens so every card remains unique and usable.
  if (tick % 18 === 0 && !held.New && !held.Graduating && !held.Established) {
    const fresh = oldest("New");
    const graduated = tokens.filter(token => token.stage === "Graduating").sort((a, b) => b.progress - a.progress)[0];
    const recycled = oldest("Established");
    if (fresh && graduated && recycled) {
      enter(fresh, "Graduating");
      enter(graduated, "Established");
      enter(recycled, "New");
    }
  } else if (tick % 4 === 0 && !held.New) {
    const incoming = oldest("New");
    if (incoming) enter(incoming, "New");
  }
  return { tokens, tick, ages, generations, arrivals };
}
