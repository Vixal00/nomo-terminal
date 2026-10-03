"use client";

import type { ReactNode } from "react";
import { CheckMark } from "@/components/marks";
import { LABELS } from "@/lib/labels";
import { auditBand, type TrendingRow, type Window } from "@/lib/trending";
import * as fmt from "@/lib/format";
import {
  BoltIcon,
  CirclesIcon,
  CrosshairIcon,
  CurveIcon,
  ParachuteIcon,
  UserBadgeIcon,
  UserPlusIcon,
  UsersIcon,
} from "./icons";
import { Live } from "./live";
import { RowTip } from "./row-tip";

/* The token-info block: the reference's two lines of four icon chips,
   each an icon and a figure, coloured by a threshold. Kept as the
   reference lays it out, with three changes the data forces:

   - The chips the fixtures can't back are replaced, not faked: insiders
     and pro traders are gone, DEX "Paid" became the boost (Ansem's own
     paid placement), and the airdrop and the curve fill the two slots.
   - Every chip names itself on hover and focus, and to a screen reader;
     the reference's glyphs have to be memorised.
   - The plates are outlined canvas, not filled, and the colour is on the
     figure only: ok teal, warn rim, bad red (AUDIT_BANDS), counts muted.
     Boost points are a count too: paid placement, not a signal, so they
     never take the accent or a band's colour. Nothing on the fixtures
     reaches the red step. */

type Tone = "ok" | "warn" | "bad" | "count" | "null" | "curve" | "dim";

function Chip({
  icon,
  label,
  tone,
  focusable,
  children,
}: {
  icon: ReactNode;
  label: string;
  tone: Tone;
  focusable: boolean;
  children: ReactNode;
}) {
  return (
    <RowTip label={label} focusable={focusable} className="dc-ti" align="center">
      <span className="dc-ti-chip" data-tone={tone}>
        {icon}
        <span className="sr-only">{label}: </span>
        {children}
      </span>
    </RowTip>
  );
}

function pctChip(v: number | null, band: ReturnType<typeof auditBand>): { text: string; tone: Tone } {
  return { text: fmt.share(v), tone: v === null ? "null" : (band ?? "null") };
}

function why(row: TrendingRow, hidden = false): string {
  if (row.real) return LABELS.NOT_INDEXED;
  if (hidden) return LABELS.TOP10_HIDDEN;
  return LABELS.NULL_TITLE;
}

export function TokenInfo({ row, w, focusable }: { row: TrendingRow; w: Window; focusable: boolean }) {
  const t10 = pctChip(row.top10Pct, auditBand("top10", row.top10Pct));
  const dev = pctChip(row.devPct, auditBand("dev", row.devPct));
  const snp = pctChip(row.snipersPct, auditBand("snipers", row.snipersPct));
  const bnd = pctChip(row.bundlersPct, auditBand("bundlers", row.bundlersPct));
  const f = focusable;

  return (
    <div className="dc-ti-grid">
      <div className="dc-ti-line">
        <Chip
          icon={<UserPlusIcon className="dc-ti-ic" />}
          label={t10.tone === "null" ? `Top 10 holders: ${why(row, row.top10Hidden)}` : "Top 10 holders, share of supply"}
          tone={t10.tone}
          focusable={f}
        >
          <span className="num">{t10.text}</span>
        </Chip>
        <Chip
          icon={<UserBadgeIcon className="dc-ti-ic" />}
          label={dev.tone === "null" ? `Dev holding: ${why(row)}` : "Dev holding, share of supply"}
          tone={dev.tone}
          focusable={f}
        >
          <span className="num">{dev.text}</span>
        </Chip>
        <Chip
          icon={<UsersIcon className="dc-ti-ic" />}
          label={row.holders === null ? `${LABELS.NULL_TITLE}: holders. ${why(row)}` : "Holders"}
          tone={row.holders === null ? "null" : "count"}
          focusable={f}
        >
          <span className="num">{fmt.compact(row.holders)}</span>
        </Chip>
        <Chip
          icon={<CrosshairIcon className="dc-ti-ic" />}
          label={snp.tone === "null" ? `Snipers: ${why(row)}` : "Snipers, share of supply"}
          tone={snp.tone}
          focusable={f}
        >
          <span className="num">{snp.text}</span>
        </Chip>
      </div>
      <div className="dc-ti-line">
        <Chip
          icon={<CirclesIcon className="dc-ti-ic" />}
          label={bnd.tone === "null" ? `Bundlers: ${why(row)}` : "Bundlers, share of supply"}
          tone={bnd.tone}
          focusable={f}
        >
          <span className="num">{bnd.text}</span>
        </Chip>
        <Chip
          icon={<BoltIcon className="dc-ti-ic" />}
          label={row.boost ? `Boost points. ${LABELS.BOOST_TITLE}` : row.real ? `Boost: ${LABELS.NOT_INDEXED}` : "Not boosted"}
          tone={row.boost ? "count" : "null"}
          focusable={f}
        >
          <span className="num">{row.boost ? fmt.compact(row.boost.points) : fmt.NULL}</span>
        </Chip>
        <Chip
          icon={<ParachuteIcon className="dc-ti-ic" />}
          label={`Airdropped. ${LABELS.AIRDROP_RESERVE}${row.airdroppedUsd === null ? `. ${LABELS.NULL_TITLE}` : ""}`}
          tone={row.airdroppedUsd === null ? "null" : "count"}
          focusable={f}
        >
          <span className="num">{fmt.usd(row.airdroppedUsd)}</span>
        </Chip>
        <CurveChip row={row} w={w} focusable={f} />
      </div>
    </div>
  );
}

/** Migrated: a tick. A Fortress curve follows the simulated cap, so it
 *  ticks. Any other curve is a roster fixture that doesn't follow market
 *  cap: printed dim with a dotted underline and the caveat, and never
 *  drawn as progress toward graduation. */
function CurveChip({ row, w, focusable }: { row: TrendingRow; w: Window; focusable: boolean }) {
  const icon = <CurveIcon className="dc-ti-ic" />;
  if (row.migrated) {
    return (
      <Chip icon={icon} label="Bonding curve: migrated" tone="count" focusable={focusable}>
        <CheckMark className="dc-ti-check" />
      </Chip>
    );
  }
  if (row.curveTrusted) {
    // Trusted because it follows the cap (Fortress) or because it is the
    // real launch's own snapshot; only the first is the Fortress rule.
    const fortress = row.tier === "Fortress";
    const label = fortress
      ? `Bonding curve. ${LABELS.CURVE_FORTRESS}`
      : row.real
        ? `Bonding curve. ${LABELS.REAL_TITLE}`
        : "Bonding curve, from market cap";
    return (
      <Chip icon={icon} label={label} tone={fortress ? "curve" : "count"} focusable={focusable}>
        <Live row={row} w={w} cell="curve" format={(v) => fmt.share(v, 0)} flash={false} className="num" />
      </Chip>
    );
  }
  return (
    <Chip icon={icon} label={`Bonding curve. ${LABELS.CURVE_CAVEAT}`} tone="dim" focusable={focusable}>
      <span className="num dc-ti-untrusted">{fmt.share(row.curve, 0)}</span>
    </Chip>
  );
}
