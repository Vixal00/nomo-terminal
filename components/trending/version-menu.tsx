"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { VERSIONS, type Version } from "@/lib/versions";

/** "Version ▾": every route, from lib/versions.ts. Every masthead
 *  carries it, so a reviewer can move between versions without going
 *  back to the index.
 *
 *  A disclosure rather than a dialog: it is a short list of links, and
 *  a modal would take the page's keys away for the length of a glance.
 *  Closes on Escape, on a click outside and on navigation.
 *
 *  While open it does hold the board's keys, through
 *  data-hotkeys-inert (components/trending/hotkeys.ts): with the list
 *  over the board, J, K and B would act on rows the reader can't see.
 *  Its own Escape is marked handled for the same reason, so closing the
 *  menu doesn't also clear the search behind it. This listener is on
 *  document and useHotkeys' is on window, so this one runs first. */
export function VersionMenu({
  current,
  className,
  align = "end",
}: {
  current?: Version["slug"];
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} data-hotkeys-inert={open ? "" : undefined} className={cx("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="meta flex items-center gap-1 whitespace-nowrap hover:text-muted"
      >
        Version
        <span aria-hidden className={cx("inline-block transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </button>
      <ul
        id={id}
        hidden={!open}
        className={cx(
          "absolute top-full z-50 mt-1.5 w-[220px] border border-line-bright bg-elev py-1",
          align === "end" ? "right-0" : "left-0",
        )}
      >
        {VERSIONS.map((v) => (
          <li key={v.slug}>
            <Link
              href={`/v/${v.slug}`}
              aria-current={v.slug === current ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-center justify-between px-3 py-1.5 text-[12.5px]",
                v.slug === current ? "text-accent" : "text-muted hover:bg-raised hover:text-bone",
              )}
            >
              {v.name}
              <span className="meta">/v/{v.slug}</span>
            </Link>
          </li>
        ))}
        <li className="mt-1 border-t border-line pt-1">
          <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-1.5 text-[12.5px] text-dim hover:bg-raised hover:text-bone">
            All versions
          </Link>
        </li>
      </ul>
    </div>
  );
}
