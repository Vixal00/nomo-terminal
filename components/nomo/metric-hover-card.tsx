"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Portal keeps audit cards clear of the table and Pulse scroll containers. */
export function MetricChip({ label, tone, content, children }: {
  label: string; tone: string; content?: ReactNode; children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const show = () => { cancelClose(); if (content) setOpen(true); };
  const hide = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 100); };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!trigger.current || !card.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const bounds = card.current.getBoundingClientRect();
      const left = Math.max(10, Math.min(anchor.left, window.innerWidth - bounds.width - 10));
      const below = anchor.bottom + 8;
      const top = below + bounds.height <= window.innerHeight - 10 ? below : Math.max(10, anchor.top - bounds.height - 8);
      setPosition({ left, top, ready: true });
    };
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !card.current?.contains(event.target as Node)) setOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  return <>
    <span ref={trigger} className="nm-signal-chip" data-tone={tone} data-has-card={Boolean(content)} role="img" aria-label={label}
      tabIndex={content ? 0 : undefined} aria-describedby={open ? id : undefined}
      onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}
      onClick={event => { event.stopPropagation(); show(); }}>
      {children}
    </span>
    {open && content && createPortal(<span ref={card} id={id} className="nm-metric-tooltip" role="tooltip"
      style={{ left: position.left, top: position.top, visibility: position.ready ? "visible" : "hidden" }}
      onPointerEnter={cancelClose} onPointerLeave={hide}>{content}</span>, document.body)}
  </>;
}
