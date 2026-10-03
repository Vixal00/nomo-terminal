"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { BullMark } from "@/components/brand";
import { ChainSwitch, VersionMenu } from "@/components/trending";

/* The masthead. The search is bound as typed: it narrows the board
   rather than publishing a limit, so a half-typed query costs nothing.
   One input serves every width; under 768 it is folded behind a button
   and, opened, wraps onto a line of its own inside the sticky header. */
export function Nav({
  searchRef,
  search,
  setSearch,
  searchOpen,
  setSearchOpen,
  onEscapeEmpty,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: (s: string) => void;
  searchOpen: boolean;
  setSearchOpen: (o: boolean) => void;
  /** The second Escape: the field is empty, so the selection goes too. */
  onEscapeEmpty: () => void;
}) {
  return (
    <header className="bs-nav">
      <Link href="/" className="bs-brand" aria-label="Ansem Terminal, all versions">
        <BullMark className="h-5 w-5 text-bone" />
        <span className="bs-word">Ansem Terminal</span>
      </Link>
      <span aria-hidden className="bs-navdiv" />
      <span className="meta bs-navtab">Trending</span>
      <span className="flex-1" />

      <label className="bs-search">
        <kbd aria-hidden className="meta">
          /
        </kbd>
        <input
          ref={searchRef}
          type="search"
          value={search}
          aria-label="Search ticker, name or mint"
          placeholder="Search ticker, name or mint"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            // The core map, from inside the field: the first Escape clears
            // the search, the second lets go of the field and clears the
            // selection in the same press, so two presses always do
            // "search, then selection". Marked handled so the page's own
            // Escape doesn't run on top of it.
            e.preventDefault();
            e.stopPropagation();
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
        className="meta bs-searchbtn"
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen(!searchOpen)}
      >
        Search
      </button>

      <VersionMenu current="broadside" />
      <ChainSwitch />
    </header>
  );
}
