import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Button */

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

/** Controls read as terminal keys: square, monospace, uppercase, and
 *  reporting state through inversion rather than elevation. */
export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  const base =
    "pressable inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.1em] font-medium whitespace-nowrap border disabled:opacity-40 disabled:pointer-events-none";
  const sizes = {
    sm: "h-8 px-3 text-[10.5px]",
    md: "h-10 px-4 text-[11px]",
    lg: "h-12 px-6 text-[12px]",
  };
  const variants = {
    primary:
      "bg-accent text-black border-accent hover:bg-accent-deep hover:border-accent-deep",
    secondary:
      "bg-transparent text-bone border-line-bright hover:bg-bone hover:text-black hover:border-bone",
    ghost:
      "bg-transparent text-muted border-transparent hover:text-accent hover:border-line",
    /* For the one confirm on the site that cannot be undone. Filled
       rather than outlined, because it is the primary action of the
       dialog it lives in — a destructive step should still be the
       obvious button once somebody has decided to take it. */
    danger:
      "bg-neg text-black border-neg hover:bg-neg/85 hover:border-neg/85",
  };
  const cls = cx(base, sizes[size], variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({
  children,
  className,
  padded = true,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cx(
        "bg-surface hairline",
        padded && "p-5",
        interactive && "pressable hover:border-line-bright hover:bg-raised",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */

/** Bracket-framed rather than a pill. The brackets are drawn as text so
 *  they inherit the monospace matrix instead of faking it with padding. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "pos" | "neg" | "ember";
}) {
  const tones = {
    neutral: "text-muted",
    accent: "text-accent",
    pos: "text-pos",
    neg: "text-neg",
    ember: "text-ember",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em]",
        tones[tone]
      )}
    >
      <span aria-hidden className="text-line-bright">
        [
      </span>
      {children}
      <span aria-hidden className="text-line-bright">
        ]
      </span>
    </span>
  );
}

/** A live boost, in points. docs: boosts stack while their windows
 *  overlap, so this is the summed total rather than the largest buy.
 *
 *  A filled bolt and a figure in the accent, on a plate of their own.
 *  Green rather than gold, which also settles a collision: gold is what
 *  a tier is now, and a boost is not a rank — any coin can carry one and
 *  it expires.
 *
 *  These land on arbitrary artwork, some of it near-white, and unbacked
 *  colour on a pale photograph is invisible — the plate is opaque canvas
 *  rather than a frosted one, so it backs the mark without touching the
 *  picture it sits on.
 */
export function BoostChip({
  points,
  bare,
  className,
}: {
  points: number;
  /** Drops the plate: bolt and figure only, a size down.
   *
   *  For the one place these sit on the interface rather than on a
   *  photograph — the identity row of a coin with no banner, in a line
   *  that already has a tier plate, a wallet and an age in it. A second
   *  framed object in that line read as a control you could press, and
   *  the plate is only there to hold the colour off artwork that might
   *  be near-white. On a canvas ground there is nothing to hold it
   *  off. */
  bare?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 whitespace-nowrap text-accent",
        !bare && "border border-accent/45 bg-canvas py-[2px] pl-1 pr-1.5",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
        className={cx("bolt-arc", bare ? "h-[13px] w-[13px]" : "h-[15px] w-[15px]")}
      >
        <path d="M13.9 2 4.6 13.3a.6.6 0 0 0 .46.98h5.2l-1.2 7.02a.6.6 0 0 0 1.05.49l9.3-11.3a.6.6 0 0 0-.46-.98h-5.2l1.2-7.02A.6.6 0 0 0 13.9 2Z" />
      </svg>
      <span
        className={cx(
          "num font-semibold tabular-nums",
          bare ? "text-[11px]" : "text-[12px]"
        )}
      >
        {points.toLocaleString("en-US")}
      </span>
      <span className="sr-only">boost points</span>
    </span>
  );
}

/** The tier, everywhere. Glyph, then the word, on a plate.
 *
 *  The one tier badge on this site. It replaced a flat chip — a
 *  bordered word in rim yellow, or a filled cyan box — that survived in
 *  four corners of the project after the tiles, tables and pickers had
 *  moved on, which left the same fact rendered two ways depending on
 *  which screen you were reading.
 *
 *  Ink and plate, with no outline. The type and glyph take the hue the
 *  border used to carry, which leaves the tag one colour told two ways
 *  rather than three edges deep. Both are painted with a moving ramp
 *  rather than a fill: the label through background-clip, the glyph as
 *  a mask over the same ramp, so they cannot drift apart.
 *
 *  Coloured ink on a dark plate needs more separation than white ink did
 *  on a mid one, so the fills drop a long way under it: gold rests at
 *  7.5:1 and ice at 9.1:1, rising to 14.3:1 and 12.5:1 as the sheen
 *  crosses.
 *
 *  Free wears one only where it is asked to, and the line is whether the
 *  tier is a field or a decoration. On the grid the tile itself is the
 *  badge, so a steel tag on two thirds of a wall of pictures is a
 *  caption saying "ordinary" over and over. In a table, a record or a
 *  picker it is the opposite: a Tier column with most of its cells empty
 *  reads as data that failed to load, not as a default.
 */
const TIER_TAG = {
  Free: { cls: "tier-free", box: "w-[8.1px]" },
  Fortress: { cls: "tier-fortress", box: "w-[10px]" },
  Diamond: { cls: "tier-ice", box: "w-[8.7px]" },
} as const;

export function TierMark({
  tier,
  showFree = false,
  className,
}: {
  tier: "Free" | "Fortress" | "Diamond";
  showFree?: boolean;
  className?: string;
}) {
  if (tier === "Free" && !showFree) return null;
  const tag = TIER_TAG[tier];
  return <SheenTag cls={tag.cls} box={tag.box} label={tier} className={className} />;
}

/** The tag itself: ink and plate, glyph and word, on the moving ramp.
 *  TierMark is one use of it; the seat's route marker is the other, so
 *  a route and a tier two columns apart are the same object rather
 *  than two drawings of one idea. cls names the CSS pair that sets the
 *  ramp, the plate and the glyph; box is the glyph's width at 7px
 *  tall, since each shape has its own proportion. */
export function SheenTag({
  cls,
  box,
  label,
  title,
  square,
  className,
}: {
  cls: string;
  box: string;
  label: string;
  title?: string;
  /** Drop the tag's own corners, for a caller that supplies them.
   *  A joined tag keeps its rounding on its outer edges only, and its
   *  rounded inner edge against a square neighbour left two dark
   *  notches at the seam. Stated as a prop rather than overridden with
   *  rounded-l-none from outside, because which of two utilities on
   *  the same property wins is Tailwind's sort order, not the order
   *  they are written in. */
  square?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "tag-sheen inline-flex shrink-0 items-center gap-[5px] py-[4px] pl-[6px] pr-[8px] font-mono text-[8.5px] font-semibold uppercase leading-none tracking-[0.1em]",
        square ? "rounded-none" : "rounded-[5px]",
        cls,
        className
      )}
      style={{ backgroundColor: "var(--plate)" }}
      title={title}
    >
      {/* Matched by height, not by box. A keep is 1.43 wide to its
          height and a cut stone 1.24; fitting both inside one square
          would letterbox the wider one and read as the smaller glyph.
          Equal heights and free widths is what "the same size" means
          for two shapes of different proportion. Free's hexagon is
          1.15 — an unworked blank beside a keep and a cut stone, which
          is the whole of what it has to say.

          7px, which is under the cap height of the 8.5px label beside
          it — a mark that stands taller than the word reads as the
          subject rather than as its prefix.

          A masked span rather than an inline <svg>, so the glyph takes
          the same moving ramp the letters do. See .tier-glyph. */}
      <span aria-hidden className={cx("tier-glyph h-[7px]", box)} />
      <span className="tag-ink">{label}</span>
    </span>
  );
}

/** A tag with nothing in it but its glyph.
 *
 *  Same plate, same ramp, same mask as SheenTag — so the mark takes
 *  the moving metal the lettered tags do — with the label and its
 *  padding taken out. For a mark that needs no word beside it: the
 *  thing it sits on is already named. */
export function GlyphBadge({
  cls,
  box,
  title,
  label,
  className,
}: {
  cls: string;
  box: string;
  title?: string;
  /** What the glyph says, for a reader who cannot see it. */
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "tag-sheen inline-flex shrink-0 items-center justify-center rounded-[4px] px-[5px] py-[4px] align-middle",
        cls,
        className,
      )}
      style={{ backgroundColor: "var(--plate)" }}
      title={title ?? label}
    >
      <span aria-hidden className={cx("tier-glyph h-[8px]", box)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** What a wallet's burn has unlocked. Not a badge.
 *
 *  The docs draw a line the interface had been crossing. A tier belongs
 *  to a launch — "every launch belongs to one of three tiers" — and the
 *  badge belongs to a coin. A wallet has a tier too, but only in the sense of a ceiling
 *  the burn total has raised: "your tier is determined by your wallet's
 *  total verified burn".
 *
 *  So the fact stays and the badge goes. No bull head, because that mark
 *  is what a coin wears; the tier's own colour is kept, because that is
 *  the ladder itself rather than the coin's decoration.
 */
export function TierLevel({
  tier,
  className,
}: {
  tier: "Free" | "Fortress" | "Diamond";
  className?: string;
}) {
  const tone = {
    Free: "text-accent/85",
    Fortress: "text-rim",
    Diamond: "text-ice",
  }[tier];

  return (
    <span
      className={cx(
        "inline-flex items-baseline gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em]",
        className
      )}
    >
      <span className={tone}>{tier}</span>
      <span className="text-dim">unlocked</span>
    </span>
  );
}

/* -------------------------------------------------------------- CurveBar */

/** Bonding curve progress.
 *
 *  The fill runs dim at the origin to full accent at the head, so it
 *  reads as travelling rather than as a block of colour that got wider.
 *  A completed curve switches to a solid bar with a steady glow.
 *
 *  It also carries the tier. The metal used to be a ring around the
 *  whole tile, which put the loudest thing on the card around its
 *  outside and boxed in artwork that had nothing to do with it. The bar
 *  is a better host: it is already the one element on the card that is
 *  pure signal, it is 3px of it rather than a full perimeter, and a
 *  gold curve filling up says the same thing as a gold frame without
 *  framing anything.
 */
export function CurveBar({
  curve,
  migrated,
  tier = "Free",
  size = "sm",
}: {
  curve: number;
  migrated: boolean;
  tier?: "Free" | "Fortress" | "Diamond";
  size?: "sm" | "md";
}) {
  const metal = tier !== "Free";
  return (
    <div
      aria-hidden
      className={cx(
        "relative w-full overflow-hidden bg-raised",
        size === "md" ? "h-[5px]" : "h-[3px]"
      )}
    >
      <div
        className={cx(
          "absolute inset-y-0 left-0",
          metal
            ? cx(
                "curve-metal",
                tier === "Fortress" ? "metal-fortress" : "metal-ice",
                migrated && "curve-metal-done"
              )
            : migrated
              ? "curve-done"
              : "curve-fill"
        )}
        style={{ width: `${curve}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Delta */

export function Delta({ value, className }: { value: number; className?: string }) {
  if (value === 0) {
    return <span className={cx("num text-dim text-[12px]", className)}>0.00%</span>;
  }
  const up = value > 0;
  return (
    <span className={cx("num text-[12px]", up ? "text-pos" : "text-neg", className)}>
      {up ? "+" : "−"}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* ------------------------------------------------------------- SectionHead */

export function SectionHead({
  eyebrow,
  title,
  sub,
  action,
  index,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  action?: ReactNode;
  /** Section register, e.g. "02". Rendered as a structural numeral. */
  index?: string;
}) {
  return (
    <div className="mb-8 border-b border-line pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            {index && (
              <span className="num text-[11px] text-line-bright">{index}</span>
            )}
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h2 className="display mt-3 text-[clamp(26px,4vw,42px)]">{title}</h2>
          {sub && (
            <p className="prose-measure mt-3.5 text-[14.5px] leading-relaxed text-muted">
              {sub}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

/* MockNotice removed by request. The footer still carries the placeholder
 * disclosure, which is now the only place it appears. */

/* ------------------------------------------------------------ EmptyState */

/** Composed empty state: a mark, a headline that names the state, one line
 *  of explanation, and the action that resolves it.
 *
 *  Every app surveyed treats an empty screen as a screen rather than a
 *  message. Base, Phantom and Crypto.com all pair a mark with a heading
 *  and a single primary action; none of them leave a paragraph sitting in
 *  a box, which is what these pages did before. */
export function EmptyState({
  glyph,
  art,
  title,
  body,
  actions,
}: {
  /** Short mark, drawn in the monospace matrix so it reads as part of the
   *  instrument rather than clip art. */
  glyph?: string;
  /** Artwork, for the states that have a piece made for them. It stands
   *  in for the glyph rather than joining it: two marks stacked over one
   *  heading is a decoration, not a state. */
  art?: string;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="px-5 py-14 text-center sm:py-20">
      {art ? (
        <Image
          src={art}
          alt=""
          width={512}
          height={512}
          /* Declared, so the optimiser sizes the request from what is
             drawn rather than from the intrinsic width. */
          sizes="128px"
          className="mx-auto h-16 w-auto object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="num mx-auto flex h-14 w-14 items-center justify-center border border-line bg-elev text-[18px] text-line-bright"
        >
          {glyph}
        </span>
      )}
      <h2 className="display mt-6 text-[19px]">{title}</h2>
      <p className="prose-measure mx-auto mt-2.5 text-[13px] leading-relaxed text-muted">
        {body}
      </p>
      {actions && (
        <div className="mt-7 flex flex-wrap justify-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Rule */

/** Section terminator. The barcode field marks the end of an operational
 *  unit the way a printed manual breaks between assemblies. */
export function Rule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="barcode h-2.5 w-24 shrink-0 opacity-60" aria-hidden />
      <div className="h-px flex-1 bg-line" />
      {label && <span className="meta shrink-0">{label}</span>}
    </div>
  );
}

/* ------------------------------------------------------------- CoinAvatar */

/** Row-height artwork, or the ticker's opening letters when a coin has
 *  none on disk.
 *
 *  Square rather than round: every other edge in a list on this site is
 *  a right angle, and a circle among them reads as a chat avatar.
 *
 *  Shared, because the table view and the masthead search both draw a
 *  coin at row height, and the second copy of this is how the two end
 *  up with different borders. */
export function CoinAvatar({
  ticker,
  src,
  size = 26,
}: {
  ticker: string;
  src?: string;
  size?: number;
}) {
  const box = { width: size, height: size };
  if (!src) {
    return (
      <span
        style={box}
        className="flex shrink-0 items-center justify-center border border-line bg-elev"
      >
        <span
          className="num text-accent"
          style={{ fontSize: Math.round(size * 0.35) }}
        >
          {ticker.slice(0, 2)}
        </span>
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      /* The intrinsic pair the optimiser needs; `sizes` is what decides
         the width actually requested. */
      width={128}
      height={128}
      sizes={`${size}px`}
      style={box}
      className="shrink-0 border border-line object-cover"
    />
  );
}

/* ------------------------------------------------------------ WalletSigil */

/** Five tokens the site already owns. A wallet mark drawn in arbitrary
 *  HSL would be the only colour on the site that answers to nothing. */
const SIGIL_INK = [
  "text-accent",
  "text-rim",
  "text-ice",
  "text-azure",
  "text-ember",
] as const;

/** A wallet's picture, drawn from its address.
 *
 *  Derived rather than uploaded, because a wallet has no picture: it is
 *  32 bytes, and every product that shows one either asks the owner or
 *  generates it. Generating it is the honest half — the mark is a
 *  reading of the address, so two wallets cannot share one and nobody
 *  is being told a profile picture exists where none does.
 *
 *  Five columns mirrored about the centre, which is what makes an
 *  identicon read as a face rather than as noise. */
export function WalletSigil({
  address,
  size = 40,
  className,
}: {
  address: string;
  size?: number;
  className?: string;
}) {
  let s = [...address].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 5381) >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const ink = SIGIL_INK[Math.floor(next() * SIGIL_INK.length)];
  const cells: boolean[] = [];
  for (let y = 0; y < 5; y++) {
    const half = [next() < 0.55, next() < 0.55, next() < 0.62];
    cells.push(half[0], half[1], half[2], half[1], half[0]);
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cx(
        "flex shrink-0 items-center justify-center border border-line bg-elev",
        ink,
        className
      )}
    >
      <svg viewBox="0 0 5 5" className="h-[62%] w-[62%]" fill="currentColor">
        {cells.map((on, i) =>
          on ? (
            <rect key={i} x={i % 5} y={Math.floor(i / 5)} width="1" height="1" />
          ) : null
        )}
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------- Spinner */

/** Three quarters of a ring. The gap is what shows it turning — a full
 *  circle spinning looks like a circle.
 *
 *  Shared, because two panels now put one inside a button while a
 *  signature is pending and a second copy of the same twelve lines is
 *  how two spinners end up different sizes. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cx("spin shrink-0", className ?? "h-[13px] w-[13px]")}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28 10"
      />
    </svg>
  );
}
