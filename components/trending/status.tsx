"use client";

import { cx } from "@/components/ui";
import { AnsemCrest, EthereumMark, RobinhoodMark, SolanaMark } from "@/components/marks";
import { useChain } from "@/components/chain";
import { LABELS } from "@/lib/labels";
import { spotStrip } from "@/lib/trending";
import { useClock, useMarketSim, useSimStatus } from "@/lib/trending-live";
import { countdown, nextReconstitution } from "@/lib/z500";
import * as fmt from "@/lib/format";

/** The network switch. SOL / RH, with each network's own mark.
 *
 *  The active state comes from useChain, whose server snapshot is
 *  network 1, so on network 2 the switch shows SOL for the frame before
 *  hydration. Everything that prices in the network's unit avoids that
 *  frame with .only-chain1 / .only-chain2; the switch can't, because it
 *  has to know which button is pressed. */
export function ChainSwitch({ className, buttonClassName }: { className?: string; buttonClassName?: string }) {
  const [chain, setChain] = useChain();
  const btn = (on: boolean) =>
    cx(
      "flex items-center gap-1.5 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors",
      on ? "bg-raised text-bone" : "text-dim hover:text-muted",
      buttonClassName,
    );
  return (
    <div role="group" aria-label="Network" className={cx("flex items-stretch border border-line", className)}>
      <button type="button" aria-pressed={chain === 1} onClick={() => setChain(1)} className={btn(chain === 1)} title="Solana">
        <SolanaMark className="h-3 w-3" />
        SOL
      </button>
      <button type="button" aria-pressed={chain === 2} onClick={() => setChain(2)} className={btn(chain === 2)} title="Robinhood Chain">
        <RobinhoodMark className="h-3 w-3" />
        RH
      </button>
    </div>
  );
}

/** The simulation's state, and the switch that pauses it.
 *
 *  Never "Live". The square is flat and dim: a glow is for what is
 *  genuinely live, and nothing here is. 'Stopped' is the tab being
 *  hidden or every board scrolled off screen, which the reader didn't
 *  ask for, so it reads differently from their own pause. */
export function SimToggle({ className }: { className?: string }) {
  const sim = useMarketSim();
  const status = useSimStatus();
  const paused = status === "paused";
  return (
    <button
      type="button"
      aria-pressed={paused}
      title={LABELS.SIM_TITLE}
      aria-label={`${LABELS.SIM_STATES[status]}. ${paused ? LABELS.SIM_RESUME : LABELS.SIM_PAUSE}. ${LABELS.SIM_TITLE}`}
      onClick={() => sim.setPaused(!paused)}
      className={cx("meta flex items-center gap-1.5 whitespace-nowrap hover:text-muted", className)}
    >
      <span
        aria-hidden
        className={cx(
          "inline-block h-[6px] w-[6px]",
          status === "sim" ? "bg-muted" : status === "paused" ? "border border-dim" : "bg-line-bright",
        )}
      />
      {LABELS.SIM_STATES[status]}
    </button>
  );
}

/** The next reconstitution. The server prints the label alone and the
 *  countdown fills in after mount from the shared clock, so no time is
 *  baked into the markup (it would be stale by the time it arrived, and
 *  a mismatch at hydration). */
export function ReconCountdown({ className }: { className?: string }) {
  const now = useClock(1000);
  const cd = now === null ? null : countdown(nextReconstitution(new Date(now)), new Date(now));
  return (
    <span className={cx("meta whitespace-nowrap", className)}>
      {LABELS.COUNTDOWN_LABEL}
      {cd !== null && (
        <>
          {" · "}
          <span className="num">{cd}</span>
        </>
      )}
    </span>
  );
}

/** The spot strip: the network's native asset and $ANSEM, tagged DEMO
 *  SPOT. Both networks are rendered and the cascade shows one
 *  (.only-chain1 / .only-chain2), so the first paint on network 2
 *  already prices ETH. */
export function SpotCells({ className, cellClassName }: { className?: string; cellClassName?: string }) {
  const cells = (chain: 1 | 2) =>
    spotStrip(chain).map((s) => (
      <span key={s.k} className={cx("flex items-center gap-1.5 whitespace-nowrap px-2", cellClassName)}>
        {s.k === "ANSEM" ? (
          <AnsemCrest className="h-3 w-3" />
        ) : s.k === "SOL" ? (
          <SolanaMark className="h-3 w-3" />
        ) : (
          <EthereumMark className="h-3 w-3" />
        )}
        <span className="meta">{s.k}</span>
        <span className="num text-[11px] text-bone">{fmt.price(s.usd)}</span>
        <span className={cx("num text-[11px]", s.d > 0 ? "text-pos" : s.d < 0 ? "text-neg" : "text-dim")}>{fmt.pct(s.d)}</span>
      </span>
    ));
  return (
    <div className={cx("flex items-center", className)}>
      <span className="only-chain1 flex items-center">{cells(1)}</span>
      <span className="only-chain2 flex items-center">{cells(2)}</span>
      <span className="meta whitespace-nowrap px-2" title={LABELS.SPOT_TITLE}>
        {LABELS.SPOT_TAG}
      </span>
    </div>
  );
}
