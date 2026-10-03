"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { BullMark } from "@/components/brand";
import { StarMark } from "@/components/marks";
import { ChainSwitch, Tip, VersionMenu } from "@/components/trending";
import { cx } from "@/components/ui";
import { COPY, NAV_SOON, NAV_Z500 } from "./copy";
import { SearchIcon } from "./icons";

/** The four sections the reference's nav had room for, as Ansem would
 *  name them. None is a page in this build, so none is a link: each is
 *  a button that says so, set dim so it reads as unavailable before it
 *  is pointed at. The Z500 one points at the view that does exist. */
const NAV_OTHER = ["Z500", "Launch", "Portfolio", "Airdrops"] as const;
const NAV_TIP: Record<(typeof NAV_OTHER)[number], string> = {
  Z500: NAV_Z500,
  Launch: NAV_SOON,
  Portfolio: NAV_SOON,
  Airdrops: NAV_SOON,
};

/** R1, 80px at 1920: the mark and wordmark, the nav, and on the right
 *  the search, the network switch (where the reference had Deposit and a
 *  balance: there is no custody and no balance to show), the starred
 *  shortcut and the version menu (where the bell and the avatar were). */
export function Masthead({
  searchRef,
  search,
  setSearch,
  searchOpen,
  setSearchOpen,
  onEscapeEmpty,
  onStarred,
  starCount,
  starredOn,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (s: string) => void;
  searchOpen: boolean;
  setSearchOpen: (o: boolean) => void;
  onEscapeEmpty: () => void;
  onStarred: () => void;
  starCount: number | null;
  starredOn: boolean;
}) {
  return (
    <header className="dc-mast">
      <Link href="/" className="dc-brand" title="All versions">
        <BullMark className="dc-bull" />
        <span className="display cased dc-word">Ansem</span>
        <span className="sr-only">, all versions</span>
      </Link>

      <nav aria-label="Sections" className="dc-nav">
        <Link href="/v/discover" aria-current="page" className="dc-nav-item is-on">
          Discover
        </Link>
        {NAV_OTHER.map((n) => (
          <Tip key={n} label={NAV_TIP[n]} focusable={false} className={cx("dc-nav-tip", `dc-nav-${n.toLowerCase()}`)}>
            <button type="button" aria-disabled="true" className="dc-nav-item is-off" aria-label={`${n}. ${NAV_TIP[n]}`}>
              {n}
            </button>
          </Tip>
        ))}
      </nav>

      <div className="dc-mast-right">
        <label className={cx("dc-search", searchOpen && "is-open")}>
          <SearchIcon className="dc-search-ic" />
          <span className="sr-only">Search by token name, ticker or contract address. Press / to focus.</span>
          <input
            ref={searchRef}
            type="search"
            value={search}
            placeholder={COPY.SEARCH_PH}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => {
              if (!search) setSearchOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.preventDefault();
              if (search) setSearch("");
              else {
                e.currentTarget.blur();
                setSearchOpen(false);
                onEscapeEmpty();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="dc-search-btn"
          aria-label="Search"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon className="h-4 w-4" />
        </button>

        <ChainSwitch className="dc-chain" buttonClassName="dc-chain-btn" />

        <Tip label={starCount === null ? "Starred coins" : `Starred coins (${starCount})`} focusable={false} align="end">
          <button
            type="button"
            className={cx("dc-roundbtn", starredOn && "is-on")}
            aria-label="Show starred coins"
            aria-pressed={starredOn}
            onClick={onStarred}
          >
            <StarMark className="h-[15px] w-[15px]" />
          </button>
        </Tip>

        <VersionMenu current="discover" className="dc-version" />
      </div>
    </header>
  );
}
