/**
 * Platform mechanics, as specified.
 *
 * Everything here traces to a page of design/deployr-docs.md, and every
 * constant carries the page it came from. That provenance is the point:
 * the figures currently in lib/data.ts were invented as placeholders and
 * several of them turned out to contradict the spec, which was only
 * findable by reading the two side by side. Anything without a citation
 * below is a demo fixture and is labelled as one.
 */

/** Whether the alternate designs are reachable.
 *
 *  Design II (Black Bull) is a second identity over the same product:
 *  its own token block, its own scoped overrides and its own home page.
 *  Design III (Scene) is Design I everywhere except the home page,
 *  which leads on a rendered WebGL field instead of the key art — no
 *  token block of its own, so the rest of the site is the instrument
 *  unchanged. Off, the switch that reaches them is not rendered and the
 *  root attribute is pinned to 1, so the site is Design I and only
 *  Design I.
 *
 *  One constant, read in three places: the head script that sets the
 *  attribute before first paint, the provider that reads the stored
 *  value back, and the admin menu that draws the picker. Flipping it
 *  brings all three back at once, including the design last stored in
 *  the browser.
 */
export const DESIGN_VARIANTS = false;

export const PLATFORM = {
  /* docs 1/7. The site has never used the platform's own name. */
  name: "Ansem.io",
  chain: "Solana",
  /* docs 1/7: "a genuine pump.fun token, live on mainnet from the moment
     it's created". Lowercase is how the docs set it. */
  launchpad: "pump.fun",
  token: "ANSEM",
};

/** The networks the platform launches on.
 *
 *  The one block in this file with no citation, and deliberately so:
 *  design/deployr-docs.md describes a Solana-only platform and predates
 *  the second network entirely. Everything here is therefore a fixture
 *  until the docs catch up.
 *
 *  `accent` is recorded for the reader, not for the renderer. The ramp
 *  that actually paints the site is an html[data-chain] token block in
 *  globals.css, because a colour handed to Tailwind through a style
 *  attribute sits in the layer every utility outranks. The two have to
 *  agree; this is the copy a person can read.
 *
 *  Neither entry records whether it has a roster. It did, and the
 *  picker printed it; the field is gone with the copy that read it,
 *  because a constant nothing consumes is a claim this file makes and
 *  the site never states.
 */
export const CHAINS = [
  {
    id: 1,
    name: "Solana",
    /* Not Solana's own purple-to-green. This is the platform's accent,
       and the platform has always been green on a Solana-only build —
       the network's colours belong to its mark, which carries the real
       ramp, and not to the page around it. */
    accent: "#4ade50",
  },
  {
    id: 2,
    name: "Robinhood",
    /* Robinhood's own neon, taken from RH_symbol_neon.svg in the brand
       kit, where it is written #cf0. The same value in full. */
    accent: "#ccff00",
  },
] as const;

export type ChainId = (typeof CHAINS)[number]["id"];

/** What a wallet has to hold to be in a launch's airdrop.
 *
 *  Held here rather than typed into the page that prints it, because
 *  it is a threshold: the moment a second surface quotes a number like
 *  this one, the two can disagree, and a qualification rule the site
 *  states two ways is worse than one it does not state at all. */
export const AIRDROP_MIN_HOLD = 100;

/* ------------------------------------------------------------------
   Launch funding. docs 5/7.
------------------------------------------------------------------- */

/** What a launch actually costs, in SOL.
 *
 *  The create page priced launches purely in burned $ANSEM, which docs
 *  4/7 establishes is a tier gate rather than a fee. The real cost was
 *  missing entirely, and it is the number that decides whether someone
 *  launches at all.
 *
 *  `live` records that the docs call these values live: they update when
 *  platform settings change, so the UI has to read as a fetched figure
 *  rather than a printed one.
 */
export const LAUNCH_COST = {
  airdropBuySol: 0.05,
  gasReserveSol: 0.061,
  totalSol: 0.111,
  /* The same costs on the second network, in its own unit. The SOL
     column is the documented one and stays exactly as the docs give it;
     these are set at its dollar value against the spot table and then
     rounded to figures a price list would carry, the same way the boost
     ladder is. Converting at render instead would print 0.00216 where a
     published price says 0.002. */
  airdropBuyEth: 0.002,
  gasReserveEth: 0.0025,
  totalEth: 0.0045,
  live: true,
};

/** The three on-chain steps that one signature covers. docs 5/7.
 *
 *  "One-signature launching" is listed as a headline differentiator in
 *  docs 1/7 and then never proven anywhere in the interface. It is only
 *  a claim until the steps it collapses are visible.
 */
export const LAUNCH_SEQUENCE = [
  {
    id: "create",
    name: "Create token",
    body: "The coin is created on pump.fun. Live on mainnet from this moment.",
  },
  {
    id: "airdrop",
    name: "Community airdrop buy",
    body: "The reserve is bought at the launch price, before anyone else can trade.",
  },
  {
    id: "dev",
    name: "Dev buy",
    body: "Your wallet buys the amount you set. You hold it; it never touches platform wallets.",
  },
] as const;

/** What the launchpad's own create form accepts, figure for figure.
 *
 *  An earlier pass cut this to "image only, four formats, 5 MB" on the
 *  grounds that docs 5/7 mentions nothing else. That read the docs as a
 *  ceiling when they are a summary: the launchpad takes video, and it
 *  takes a banner, and a creator told otherwise finds out at the file
 *  picker. These are its numbers.
 *
 *  Caps are in bytes as well as in words. A form that prints a limit it
 *  does not check moves the bad news to the far end of the upload. */
export const MEDIA_SPEC = {
  coin: {
    imageMb: 15,
    videoMb: 30,
    size: [
      "Image · max 15 MB. .jpg, .gif or .png recommended",
      "Video · max 30 MB. .mp4 recommended",
    ],
    resolution: [
      "Image · min. 1000×1000px, 1:1 square recommended",
      "Video · 16:9 or 9:16, 1080p+ recommended",
    ],
  },
  banner: {
    maxMb: 4.3,
    /* The reference blurb says 5 MB while the bullet under its own
       picker says 4.3 MB. Both are copied here except for that: a form
       that prints two different limits for one field sends somebody
       back to re-export a file that was never going to be accepted, so
       this reads 4.3, which is the one the picker enforces. */
    blurb:
      "Shown on the coin page in addition to the coin image. Images or animated GIFs up to 4.3 MB, 3:1 / 1500×500px original. This can only be done when creating the coin, and cannot be changed later.",
    size: ["Image · max 4.3 MB. .jpg, .gif or .png recommended"],
    resolution: ["3:1 aspect ratio, 1500×500px recommended"],
  },
  /** The line the launchpad closes its form with, and the reason every
   *  optional field above it is worth filling in now. */
  permanence:
    "Coin data (social links, banner, etc) can only be added now, and cannot be changed or edited after creation.",
};

/** The launchpad's own creation options.
 *
 *  Carried through rather than reimplemented: a coin created here is a
 *  real token on that launchpad, so these switches are its switches and
 *  the wording is its wording. All four are set once, at creation.
 *
 *  `pair` marks the two that share a row in the reference and share the
 *  24-hour note underneath.
 *
 *  Not currently on the create form, which gives that space to the
 *  social links instead. Kept because they are what the launchpad
 *  offers, not because something renders them — restoring the block is
 *  reading this list again. */
export const LAUNCH_OPTIONS = [
  {
    id: "rewards",
    name: "Share creator rewards",
    body: "Share creator rewards with wallets or charities.",
    info: "Creator rewards are split with the addresses you nominate, from the first trade onward.",
  },
  {
    id: "mayhem",
    name: "Mayhem mode",
    body: "Increased price volume.",
    pair: true,
  },
  {
    id: "cashback",
    name: "Cash back",
    body: "Creator rewards go to traders.",
    pair: true,
  },
  {
    id: "usdc",
    name: "Pair with USDC",
    body: "Create your coin with USDC liquidity.",
  },
] as const;

export type LaunchOptionId = (typeof LAUNCH_OPTIONS)[number]["id"];

/** Applies to Mayhem mode and Cash back, which is why it sits under
 *  their row rather than under each of them. */
export const LAUNCH_OPTIONS_NOTE =
  "Active for 24h, only set at creation. May increase coin supply.";

/** The enhanced coin page, and what it costs.
 *
 *  Cheaper bought at launch than bought later, and the form says both
 *  numbers. A discount whose full price is hidden is not a discount,
 *  it is a price with an adjective.
 *
 *  The only thing on the create form that is not set once: it can be
 *  bought from the coin's own page at any time afterwards. What expires
 *  is the discount, not the offer. */
export const ENHANCED = {
  fullSol: 0.5,
  launchSol: 0.35,
  /* Chosen to hold the ratio, not just the dollar value. The discount
     is quoted as a percentage on the form, and a pair rounded only for
     price-list looks would have advertised 30% off on one network and
     25% on the other for the same offer. 0.014 is exactly 70% of 0.02,
     which is what 0.35 is of 0.5. */
  fullEth: 0.02,
  launchEth: 0.014,
  get discountPct() {
    return Math.round((1 - this.launchSol / this.fullSol) * 100);
  },
};

/* ------------------------------------------------------------------
   Tiers. docs 4/7, thresholds repeated in 3/7.
------------------------------------------------------------------- */

/* The middle rung was Bronze in design/deployr-docs.md, then Gold, and
   is gone (decision, September 2026): the burn tier between Free and
   Diamond no longer exists. Its place on the launch form is taken by
   Fortress, which is not a burn at all but a curve — see FORTRESS below
   — and the ladder is Free, Fortress, Diamond. The docs transcript is a
   record of what the published docs said and is left as found. */
export type TierId = "Free" | "Fortress" | "Diamond";

/** Fortress: the deep curve (decision, September 2026).
 *
 *  A launch mode rather than a burn. The curve opens at a $100K market
 *  cap and graduates at $1M, and filling it takes 2,740 SOL. A Fortress
 *  launch is seated on the Z500 72 hours after it graduates (ROUTES).
 *  What a Fortress launch costs to create is not stated anywhere, so
 *  the form does not price it. */
export const FORTRESS = {
  openMcapUsd: 100_000,
  graduateMcapUsd: 1_000_000,
  graduateSol: 2_740,
};

/** The ladder, with the benefits the spec actually assigns.
 *
 *  Fortress sits between Free and Diamond but is the odd one out: no
 *  burn gates it, and what it changes is the curve. Diamond is an
 *  application rather than an unlock: the slot is won at auction and
 *  the launch still goes through review, so it cannot resolve instantly.
 *
 *  Free is also stated as a complete product here. The old copy ended by
 *  listing what you do not get, which sells a downgrade of the thing the
 *  spec treats as the default.
 */
export const TIER_SPEC: {
  id: TierId;
  burn: number;
  headline: string;
  body: string;
  gets: string[];
  /** Instant tiers resolve on the burn alone. Diamond does not. */
  resolves: "instant" | "review";
}[] = [
  {
    id: "Free",
    burn: 0,
    headline: "Open to everyone",
    body: "Create a coin in minutes, with the standard community-airdrop buy included.",
    gets: [
      "A genuine pump.fun token, live on mainnet",
      "The community-airdrop buy on every launch",
      "Listed on the Z500 index",
    ],
    resolves: "instant",
  },
  {
    id: "Fortress",
    burn: 0,
    headline: "The deep curve",
    body: "Opens at a $100K market cap and graduates at $1M, after 2,740 SOL. Seated on the Z500 72 hours after graduation.",
    gets: [
      "Everything in Free",
      "A curve from $100K to $1M, 2,740 SOL to graduate",
      "A Z500 seat 72 hours after graduation, for as long as the token is alive",
    ],
    resolves: "instant",
  },
  {
    id: "Diamond",
    /* The burn figure is the docs' and no longer gates the tier: Diamond
       is priced by auction (design/diamond-auction.md) and what is paid
       is burned. tierForBurn still reads it for a wallet's own tier. */
    burn: 5,
    headline: "Won at auction",
    body: "The slot is priced by auction and what you pay is burned. The team reviews the winner's proposal before it goes live.",
    gets: [
      "Everything in Free",
      "A Z500 seat 72 hours after graduation, for as long as the token is alive",
      "A submission reviewed by the team, stage by stage",
    ],
    resolves: "review",
  },
];

/** docs 3/7 and 4/7: tier follows the wallet's total verified burn, and
 *  the total can only ever go up. Burn once, keep the tier forever. */
export function tierForBurn(burned: number): TierId {
  if (burned >= 5) return "Diamond";
  return "Free";
}

/** What the one burn-gated tier costs, as a thing that can be set
 *  rather than a literal. The documented value lives in TIER_SPEC
 *  above; this is the shape the platform carries it in once an admin
 *  can move it. Fortress has no entry because no burn gates it. */
export type TierGates = { Diamond: number };

/** The tier a burn total earns against the live threshold. Fortress is
 *  never the answer: it is a curve a wallet picks, not a rung a burn
 *  reaches. */
export function tierAt(burned: number, gates: TierGates): TierId {
  if (burned >= gates.Diamond) return "Diamond";
  return "Free";
}

/** The burn a tier costs, against the live threshold. Free and Fortress
 *  are always nothing. */
export function gateFor(tier: TierId, gates: TierGates): number {
  return tier === "Diamond" ? gates.Diamond : 0;
}

/* ------------------------------------------------------------------
   The community airdrop. docs 6/7.
------------------------------------------------------------------- */

/** The three properties the spec gives the airdrop.
 *
 *  lib/data.ts describes this as airdropping team supply to stakers,
 *  which is a carve-out. The spec is a buy, inside the transaction that
 *  creates the coin, at the launch price. That is a stronger claim and
 *  the site was making the weaker one.
 */
export const AIRDROP_FACTS = [
  {
    k: "Bought, not granted",
    v: "The reserve is a real buy of the coin's own supply, in the same transaction that creates it.",
  },
  {
    k: "At the launch price",
    v: "The buy lands before anyone else can trade. The community enters where the creator does.",
  },
  {
    k: "On-chain from second one",
    v: "The reserve is visible immediately. Nothing about it has to be taken on trust.",
  },
];

/* ------------------------------------------------------------------
   The Diamond review pipeline. docs 7/7.
------------------------------------------------------------------- */

export type StageId = "pending" | "review" | "call" | "launch";

export const DIAMOND_PIPELINE: {
  id: StageId;
  name: string;
  body: string;
}[] = [
  {
    id: "pending",
    name: "Submitted",
    body: "Your submission lands in the queue: the coin, its links, and anything you attached.",
  },
  {
    id: "review",
    name: "Under review",
    body: "The team reads the submission and the files that came with it.",
  },
  {
    id: "call",
    name: "Alignment call",
    body: "A call to align on launch timing and the holder round.",
  },
  {
    id: "launch",
    name: "Clear to launch",
    body: "The launch button unlocks and your coin goes live with the full Diamond treatment.",
  },
];

/* ------------------------------------------------------------------
   Wallet. docs 2/7 and 3/7.
------------------------------------------------------------------- */

/** What connecting is and is not, in the words the spec uses.
 *
 *  Connect has been an inert button in the masthead. The spec gives it a
 *  contract worth stating on the button's own dialog, because every
 *  clause here answers an anxiety someone has before they click. */
export const CONNECT_TERMS = [
  "Your Solana wallet is your identity. No password, no email.",
  "You sign a short message to prove you own the address.",
  "The signature is free and gasless. It never moves funds.",
];

/* ------------------------------------------------------------------
   Demo fixtures. NOT from the docs — illustrative state for the
   preview, so the signed-in surfaces have something to render.
------------------------------------------------------------------- */

export const DEMO_WALLET = {
  address: "8vQm…4Wpx",
  /** The same person's wallet on the second network, which is a
   *  different string because it is a different kind of address: 20
   *  hex bytes rather than 32 base58 ones. Only the link page prints
   *  it — everywhere else the site shows the Solana-shaped one, because
   *  everywhere else the address it is showing came off a fixture that
   *  was written for Solana. */
  evm: "0x9F3aC7bE21d5460f8Ce77B4a2E1d93cB0a5F7D68",
  /** The handle and picture a connected wallet shows in the masthead.
   *  A real one comes from the address; this stands in until it does. */
  handle: "vaporbyte",
  avatar: "/art/coins/p07.webp",
  /** SOL, for the balance the masthead carries beside the identity. */
  sol: 4.48,
  /** $ANSEM held, per docs 2/7's list of what appears once connected.
   *
   *  Rebased from 12.4 when the index and the auction arrived: a vote
   *  is a thousand $ANSEM and an auction opens in the hundreds of
   *  thousands, and a wallet holding twelve could do neither on the
   *  screens built for them. The burn figures in the tier ladder are
   *  the docs' own and were not touched. */
  balance: 1_250_000,
  /** USDG held. The second network quotes a dollar stablecoin beside
   *  its own unit — see the buy panel's pay options — so a wallet
   *  standing there has a dollar sleeve as well as a gas balance, and
   *  this is it. Invented like the rest of the wallet, and tracked in
   *  the same one place, so the menu and the buy panel cannot end up
   *  quoting two different numbers for it. */
  usdg: 2500,
  /** Lifetime verified burn. docs 3/7: tracked on-chain, only goes up. */
  burned: 6,
};

export type DemoProject = {
  name: string;
  ticker: string;
  tier: TierId;
  /** Diamond submissions sit in the pipeline; other tiers are already live. */
  stage: StageId | "declined" | "live";
  submitted: string;
  /** docs 7/7: notes from the team appear on the card at every stage. */
  note?: string;
  /** Who submitted it.
   *
   *  This list is two screens at once: the admin queue, which is every
   *  submission on the platform, and My projects, which is the ones
   *  belonging to whoever is holding the wallet. Without an owner the
   *  second screen was showing the first screen's contents, so the
   *  connected user appeared to have launched six coins including one
   *  that had been declined. */
  wallet: string;
};

/** Every submission on the platform. The admin queue is this list; My
 *  projects is the slice of it belonging to the connected wallet.
 *
 *  That slice is deliberately three, and deliberately these three: a
 *  launched coin whose page is unlocked, a launched coin whose page is
 *  not, and one still in the pipeline. Between them they are every
 *  state a creator can be in, which is what makes the screen worth
 *  opening — six rows that were all the same kind of thing told you
 *  less than three that are not.
 *
 *  The two launched ones are roster coins and their tiers here match
 *  lib/data, so the card and the coin page cannot disagree. The one in
 *  review deliberately is not on the roster: it has not launched, so
 *  there is nothing for it to have a coin page of. */
export const DEMO_PROJECTS: DemoProject[] = [
  /* ---------------------------------------------- The connected wallet */
  {
    /* Diamond, migrated, and its page is unlocked — the enhanced one of
       the pair. Its creator in lib/data is this same wallet. */
    name: "hornet",
    ticker: "HORNET",
    tier: "Diamond",
    stage: "live",
    submitted: "18 Jul",
    note: "Launched 24 Jul. Holder round filled in 40 minutes.",
    wallet: DEMO_WALLET.address,
  },
  {
    /* Free, still on the curve, ordinary coin page — the standard one of
       the pair. Free, not Diamond: it is Free on the roster, and a
       submission card claiming a tier the coin does not have is the one
       thing this screen must never do. */
    name: "nightwatch",
    ticker: "NGHT",
    tier: "Free",
    stage: "live",
    submitted: "29 Jul",
    note: "Launched 30 Jul at Free. Straight to the curve — no review, no queue.",
    wallet: DEMO_WALLET.address,
  },
  {
    /* In the pipeline, at the stage where the team is actually reading
       something, so the card has a note worth carrying. Not on the
       roster: it has not launched. */
    name: "stampede",
    ticker: "STMPD",
    tier: "Diamond",
    stage: "review",
    submitted: "6 Aug",
    note: "Reading through the roadmap. The team allocation looks high against the airdrop reserve, so expect notes before the call is booked.",
    wallet: DEMO_WALLET.address,
  },

  /* --------------------------------------- Other wallets, for the queue */
  {
    /* Sits at the last stage so the admin queue shows the one state that
       makes the pipeline matter: docs 7/7 says the launch button unlocks
       here and nowhere earlier. */
    name: "ronin",
    ticker: "RONIN",
    tier: "Diamond",
    stage: "launch",
    submitted: "21 Jul",
    note: "Cleared. Launch window agreed for Friday 14:00 UTC, holder round opening 30 minutes ahead of the public curve.",
    wallet: "Qw41…7fLd",
  },
  {
    name: "solstice",
    ticker: "SOLST",
    tier: "Diamond",
    stage: "call",
    submitted: "2 Aug",
    note: "Supply plan approved. Booking the call for Thursday to settle launch timing and the holder round.",
    wallet: "Mn05…wY6q",
  },
  {
    /* At the call stage with nothing in the diary, which is the one
       combination that reads as waiting on the creator rather than on
       the team. Without it the queue had no example of that state:
       every other submission at this stage already has a slot. */
    name: "blackgate",
    ticker: "BLKGT",
    tier: "Diamond",
    stage: "call",
    submitted: "1 Aug",
    note: "Read, and we are happy with it. Three slots sent for the alignment call — tell us which one works and it goes in the diary.",
    wallet: "Hx4v…9pQm",
  },
  {
    name: "quartzcat",
    ticker: "QRTZ",
    tier: "Diamond",
    stage: "pending",
    submitted: "4 Aug",
    wallet: "Ff62…rN8k",
  },
  {
    name: "husk22",
    ticker: "HUSK",
    tier: "Diamond",
    stage: "declined",
    submitted: "11 Jul",
    /* docs 7/7: a submission can be declined with feedback. Declines
       carry a reason rather than just a status. */
    note: "Declined. The supply plan puts 41% with the team and the roadmap has no holder round. Resubmit with a budget under 15% and we will look again.",
    wallet: "Gk90…vC8r",
  },
];

/** The connected wallet's own submissions. One place that knows how the
 *  slice is taken, so My projects and anything else that wants it cannot
 *  drift apart. */
export const MY_PROJECTS = DEMO_PROJECTS.filter(
  (p) => p.wallet === DEMO_WALLET.address
);

/** What the review team actually sees.
 *
 *  Diamond only. docs 4/7: Free and Fortress go straight to the curve — no
 *  submission, no queue, nobody to review them — so a Free launch in a
 *  review queue is a row with no decision attached to it. It is also
 *  what lets that screen drop the tier column: every row on it is the
 *  same tier, and a badge that never varies is a badge saying nothing. */
export const REVIEW_QUEUE = DEMO_PROJECTS.filter((p) => p.tier === "Diamond");

/* ------------------------------------------------------------------
   Review calls.

   docs 7/7: the third stage of the Diamond pipeline is a call with the
   team to settle launch timing and the holder round. Something has to
   book those, and a queue that says "first call" without saying when
   leaves the reviewer to keep the diary somewhere else.
------------------------------------------------------------------- */

/** The day the calendar treats as today.
 *
 *  Fixed, like every other date in this file. Every submission here is
 *  dated "18 Jul" or "6 Aug" by hand, and a calendar that rolled with
 *  the real clock would sit under a queue whose dates never moved. It is
 *  also what lets the grid be rendered on the server and hydrated on the
 *  client without the two disagreeing about what day it is. */
export const REVIEW_TODAY = { year: 2026, /** Zero-based. 7 is August. */ month: 7, day: 10 };

export type ReviewCall = {
  ticker: string;
  name: string;
  /** ISO day, UTC. A string rather than a Date so the fixture is
   *  readable, and because ISO days sort and compare correctly as
   *  strings — no parsing needed to order a diary or ask what is still
   *  ahead. */
  date: string;
  /** UTC, because a launch window agreed in local time is a launch
   *  window agreed in two different times. */
  time: string;
  note: string;
};

/** Booked calls, in date order. Every ticker here is a submission in
 *  DEMO_PROJECTS above — a call in the diary for a project not in the
 *  queue would be a meeting about nothing.
 *
 *  Spread over three months rather than one, so stepping the calendar
 *  back or forward lands on something. */
export const REVIEW_CALLS: ReviewCall[] = [
  {
    ticker: "HUSK",
    name: "husk22",
    date: "2026-07-28",
    time: "16:30",
    note: "Supply plan walked through. Declined on the day.",
  },
  {
    ticker: "RONIN",
    name: "ronin",
    date: "2026-08-04",
    time: "14:00",
    note: "Launch window and holder round agreed. Cleared.",
  },
  {
    ticker: "SOLST",
    name: "solstice",
    date: "2026-08-13",
    time: "15:00",
    note: "Launch timing and the holder round.",
  },
  {
    ticker: "STMPD",
    name: "stampede",
    date: "2026-08-18",
    time: "13:30",
    note: "Team allocation against the airdrop reserve.",
  },
  {
    ticker: "QRTZ",
    name: "quartzcat",
    date: "2026-08-25",
    time: "11:00",
    note: "First read of the submission.",
  },
  {
    ticker: "STMPD",
    name: "stampede",
    date: "2026-09-01",
    time: "10:00",
    note: "Follow-up on the revised supply plan.",
  },
];

/* ------------------------------------------------------------------
   FAQ. docs, verbatim in substance.
------------------------------------------------------------------- */

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Are the coins real?",
    a: "Yes. Every launch creates a real token on pump.fun, on Solana mainnet, tradable anywhere pump.fun coins trade.",
  },
  {
    q: "Does the platform ever control my funds?",
    a: "No. Your trades, dev buys, burns and payments are all signed by your own wallet. The only thing you fund at launch is the coin's own launch wallet, the airdrop reserve and its gas, which exists to serve that coin's community distribution.",
  },
  {
    q: "Is burning $ANSEM reversible?",
    a: "No. Burns are permanent by design, and that is what makes the tiers mean anything.",
  },
  {
    q: "My dev buy failed but the coin launched. What now?",
    a: "The launch flow offers an instant re-sign with a fresh transaction. You can also simply buy on the coin page; the curve is live either way.",
  },
  {
    q: "Who can unlock the enhanced page?",
    a: "Only the wallet that created the coin. Once unlocked, everyone can see it, permanently.",
  },
  {
    q: "Something looks wrong. Where do I ask?",
    a: "Reach the team through the community channels linked on the Bull's X account.",
  },
];

/* ------------------------------------------------------------------
   The Z500. design/z500-spec.md.

   An index of live tokens whose seats cannot be bought. Every figure
   here is the document's own, with its section beside it; the fixtures
   that populate the index live in lib/z500.ts and cite this block.
------------------------------------------------------------------- */

/** How a seat was earned. §3.1. The marker is shown wherever the seat
 *  is: the index, the token page, the terminal, the weekly report. */
export type Route = "Fortress" | "Diamond" | "Merit" | "External";

export const ROUTES: {
  id: Route;
  /** One line, for the marker's title and the rules panel. */
  how: string;
  /** Whether the seat is scored week to week (§5). Fortress and
   *  Diamond seats are not; they hold while the token is alive. */
  scored: boolean;
}[] = [
  {
    id: "Fortress",
    how: "Launched on the deep curve, $100K to $1M, and seated 72 hours after it graduates.",
    scored: false,
  },
  {
    id: "Diamond",
    how: "Won at auction, seated 72 hours after the launch graduates.",
    scored: false,
  },
  {
    id: "Merit",
    how: "A graduated ansem.io launch that scores 50 or more at a weekly reconstitution.",
    scored: true,
  },
  {
    id: "External",
    how: "A token from anywhere on Solana or Robinhood Chain that passes review and scores 50 or more.",
    scored: true,
  },
];

export const Z500 = {
  /** §1. Fixed, and mostly empty by design. */
  capacity: 500,
  /** §2. The merit bar and the exit line, §5. */
  bar: 50,
  exit: 40,
  /** §2. Reconstitution: weekly, Wednesday 16:00 UTC. 3 is Wednesday
   *  in Date.getUTCDay(). */
  reconstitution: { weekday: 3, hour: 16, label: "Wednesday 16:00 UTC" },
  /** §2, §7.1. The most the platform spends on buybacks: a share of
   *  revenue over a trailing window. */
  capShare: 0.2,
  capWindowDays: 30,
  /** §3.1, §3.2. The grace after graduation, every route. */
  graceHours: 72,
  /** §3.2. Minimums on the merit and external routes. */
  minHolders: 1000,
  minLiquidityUsd: 10_000,
  /** §5. Two consecutive weeks under the exit line removes a scored
   *  seat; four consecutive weeks under either death floor ends an
   *  unscored one. */
  exitWeeks: 2,
  death: { weeks: 4, volume7dUsd: 100_000, mcapUsd: 250_000 },
  /** §5. Removal for cause: declared wallets selling more than this
   *  share of their declared holdings in any 7-day window. */
  teamSellLimit: 0.1,
  /** §7.3. The ballot is three to five seats, and a winner sits out
   *  the next eight ballots. */
  shortlist: { min: 3, max: 5, cooldownWeeks: 8 },
  /** §7.4. One vote per thousand $ANSEM held at the snapshot; that is
   *  also the minimum to vote. */
  voteUnit: 1000,
  /** §7.5. The buy happens within this many days of the win. */
  buyWindowDays: 14,
  /** §7.6. Where a buyback goes, and the new-trader gate. The funded
   *  account half of that gate is on hold; only the first trade is
   *  stated on the claim page. */
  distribution: {
    newTraders: 0.6,
    voters: 0.4,
    firstTradeUsd: 500,
    lockDays: 3,
    expiryDays: 30,
  },
  /** §8. The line on the index page. The second sentence, "Nothing on
   *  this page can be bought", came off at the owner's word; the page
   *  still has nothing to buy, it just no longer says so. */
  banner:
    "A weekly index of live tokens across Solana and Robinhood Chain. Seats are earned on market cap, volume, holders, and history, and re-scored every week; holders vote a seated token into a buyback funded from platform revenue.",
};

/** §4.1, §4.2. The six components: weight, floor, ceiling, and whether
 *  the scale between them is logarithmic. Order is the order the spec
 *  lists them, which is the order every breakdown prints them. */
export type ScoreComponent =
  | "mcap"
  | "volume"
  | "holders"
  | "growth"
  | "vtl"
  | "staying";

export const SCORE: {
  id: ScoreComponent;
  label: string;
  weight: number;
  floor: number;
  ceiling: number;
  log: boolean;
  /** How the value prints. */
  unit: "usd" | "count" | "pct" | "ratio" | "weeks";
}[] = [
  { id: "mcap", label: "Market cap", weight: 25, floor: 250_000, ceiling: 25_000_000, log: true, unit: "usd" },
  { id: "volume", label: "Volume, 7d", weight: 25, floor: 50_000, ceiling: 25_000_000, log: true, unit: "usd" },
  { id: "holders", label: "Holders", weight: 20, floor: 1000, ceiling: 100_000, log: true, unit: "count" },
  { id: "growth", label: "Holder growth, 7d", weight: 10, floor: 0, ceiling: 0.5, log: false, unit: "pct" },
  { id: "vtl", label: "Volume to liquidity", weight: 10, floor: 0, ceiling: 2, log: false, unit: "ratio" },
  { id: "staying", label: "Staying power", weight: 10, floor: 0, ceiling: 10, log: false, unit: "weeks" },
];

/** §4.2. One component's value to its 0–100 points. Log between floor
 *  and ceiling for the three the spec makes logarithmic, linear for
 *  the rest, clamped either way. */
export function scorePoints(id: ScoreComponent, value: number): number {
  const c = SCORE.find((s) => s.id === id)!;
  let p: number;
  if (c.log) {
    p = value <= 0 ? 0 : (100 * Math.log(value / c.floor)) / Math.log(c.ceiling / c.floor);
  } else {
    p = (100 * (value - c.floor)) / (c.ceiling - c.floor);
  }
  return Math.max(0, Math.min(100, p));
}

/* ------------------------------------------------------------------
   The Diamond auction. design/diamond-auction.md, and the staging
   build's own rules transcribed at the foot of it.

   Diamond stopped being a fixed burn: the slot is priced by auction,
   and what is paid is burned. The tier ladder above keeps its Diamond
   entry for the badge and the review pipeline, which is the approval
   step after a win; the burn figure there no longer gates it.

   The note described a Dutch auction. The build that is actually
   being shipped (September 2026, seen on the dev's staging page) is an
   ascending one, and this section follows the build: the admin sets
   the first minimum and starts the clock, every later auction opens at
   the previous winning bid, the highest escrowed total at closing
   wins, and losing wallets claim their escrow back.
------------------------------------------------------------------- */

export const AUCTION = {
  /** The first minimum, in $ANSEM: set by the admin, not a rule. This
   *  is the figure the fixtures say was set for the first one. Every
   *  later auction opens at the previous winning bid. */
  firstMinimum: 400_000,
  /** The clock is the admin's to set; this is the length the fixtures
   *  use and the desk offers by default. */
  clockHours: 24,
  /** A bid in the last N minutes extends the clock by N minutes
   *  (owner, September 2026). */
  extensionMinutes: 15,
  /** Every bid escrows in full, and a wallet's bids add up: the
   *  highest total at closing wins. Losing wallets claim 100% back
   *  after closing; nothing comes back on its own. */
  refunds: "claim" as const,
  /** After closing, the winner has this long to submit a proposal.
   *  The admin may move the deadline, and a missed one waits for an
   *  admin decision rather than burning anything. */
  proposalDays: 7,
  /** If the admin requests changes, the winner may leave with this
   *  share back and the rest burned, or submit one revised proposal. */
  leaveRefund: 0.25,
  revisions: 1,
  /** Final approval or rejection burns the whole winning total; only
   *  approval unlocks a launch. */
  burnOnDecision: 1,
  /** One auction runs at a time (decision, confirmed twice). */
  concurrent: 1,
};
