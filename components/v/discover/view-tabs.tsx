"use client";

import type { ReactNode } from "react";
import { FlameMark, StarMark } from "@/components/marks";
import { ReconCountdown } from "@/components/trending";
import { cx } from "@/components/ui";
import { COPY, DC_TABS, TAB_NAME, type DcTab } from "./copy";
import { PodiumIcon, Z500Icon } from "./icons";

const MARK: Record<DcTab, ReactNode> = {
  trending: <FlameMark className="dc-tab-ic" />,
  top: <PodiumIcon className="dc-tab-ic" />,
  z500: <Z500Icon className="dc-tab-ic" />,
  starred: <StarMark className="dc-tab-ic" />,
};

/** R3, 56px at 1920: the views, set like the reference's (a mark, then
 *  the word; the one in view is bright, the rest dim, no underline). One
 *  board is re-sorted rather than four panels kept mounted; the screen
 *  keeps each view's scroll position. On the right, where the reference
 *  had its wallet-set pill: how many pairs the view lists, and the index
 *  calendar, which the status strip had no room for. (Whether the order
 *  is held is said in the table's sticky head, which stays in view.) */
export function ViewTabs({
  tab,
  onTab,
  count,
}: {
  tab: DcTab;
  onTab: (t: DcTab) => void;
  count: number;
}) {
  return (
    <div className="dc-tabs">
      <div role="tablist" aria-label="Views" className="dc-tablist">
        {DC_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-controls="dc-board"
            tabIndex={tab === t ? 0 : -1}
            className={cx("dc-tab", tab === t && "is-on")}
            onClick={() => onTab(t)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = DC_TABS.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
              const next = DC_TABS[(i + DC_TABS.length) % DC_TABS.length];
              onTab(next);
              requestAnimationFrame(() =>
                document.querySelector<HTMLElement>(`.v-discover .dc-tab[aria-selected="true"]`)?.focus(),
              );
            }}
          >
            {MARK[t]}
            {TAB_NAME[t]}
          </button>
        ))}
      </div>
      <div className="dc-tabs-right">
        <ReconCountdown className="dc-recon" />
        <span className="dc-pill" aria-label={COPY.PAIRS(count)}>
          <span className="num text-bone">{count}</span>
          <span>{count === 1 ? "pair" : "pairs"}</span>
        </span>
      </div>
    </div>
  );
}
