import { EMPTY_FILTER, applyFilter, commitDraft, draftOf, trendingRows, type FilterDraft, type TrendingFilter } from "@/lib/trending";
import type { Tier } from "@/lib/data";

/* The command line's grammar, onto the foundation's filter.

   Kept deliberately small: every form maps onto one TrendingFilter field,
   and every amount is parsed by commitDraft, not here, so "20k" means the
   same thing on this page as in any other version's filter panel. The
   parser only splits the line, says which field a token is for, and turns
   the draft's errors back into the token that caused them. */

export type TokenKind = "mcMin" | "mcMax" | "volMin" | "liqMin" | "top10Max" | "devMax" | "tier" | "stage" | "search";

/** `shown` is the operator and value exactly as typed ("<=1m", ">=$250K"),
 *  or the word itself. An echo prints it unchanged: an echo that
 *  rewrites what the reader typed is a second claim about the filter. */
export type Token = { raw: string; kind: TokenKind; shown: string };

export type Committed = { text: string; tokens: Token[]; filter: TrendingFilter };

export const EMPTY_COMMITTED: Committed = { text: "", tokens: [], filter: EMPTY_FILTER };

type LimitKind = "mcMin" | "mcMax" | "volMin" | "liqMin" | "top10Max" | "devMax";

/** Which limits each field takes. Only >= and <=: a strict > or < would
 *  have to be echoed as something the filter doesn't do, because the
 *  foundation's limits include the value. */
const FIELDS: Record<string, { ge?: LimitKind; le?: LimitKind }> = {
  mc: { ge: "mcMin", le: "mcMax" },
  vol: { ge: "volMin" },
  liq: { ge: "liqMin" },
  t10: { le: "top10Max" },
  dev: { le: "devMax" },
};

const TIER_WORDS: Record<string, Tier> = { free: "Free", fortress: "Fortress", diamond: "Diamond" };
const STAGE_WORDS: Record<string, "curve" | "migrated"> = { oncurve: "curve", migrated: "migrated" };

const OP = /^([a-z0-9]+)(>=|<=|=>|=<|>|<|=)(.*)$/i;

export type QueryError = { raw: string; message: string };

export type Parsed = {
  next: Committed;
  errors: QueryError[];
  /** Words to add to the blacklist (from "-word"), and to take off it ("+word"). */
  hide: string[];
  unhide: string[];
};

/** How many coins a blacklist hides. The list is a fixed roster rule,
 *  not a market figure, so the window doesn't matter and nothing
 *  simulated is read. */
export function hiddenBy(blacklist: readonly string[]): number {
  if (!blacklist.length) return 0;
  const all = trendingRows();
  return all.length - applyFilter(all, { blacklist: [...blacklist] }, "24h").length;
}

/** Line to filter. Errored limits keep the previous commit's value and
 *  token, as commitDraft does with its own errors, and the committed
 *  line carries that kept token in place of the one refused: the line,
 *  the echoes and what is applied are always the same thing. The
 *  refused token is named in the error, so it isn't lost. */
export function parseQuery(text: string, prev: Committed): Parsed {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const errors: QueryError[] = [];
  const hide: string[] = [];
  const unhide: string[] = [];

  /** The last well-formed token for each limit wins. */
  const limit = new Map<LimitKind, { index: number; raw: string; value: string; shown: string }>();
  /** Limits a malformed token was aimed at: they keep their previous value. */
  const failed = new Set<LimitKind>();
  /** Where each malformed limit token sat on the line, to put the kept
   *  value back in its place (or drop it when nothing is kept). */
  const failedAt: { index: number; kind: LimitKind }[] = [];
  const tiers: { index: number; raw: string; tier: Tier }[] = [];
  let stage: { index: number; raw: string; stage: "curve" | "migrated" } | null = null;
  const search: { index: number; raw: string }[] = [];
  /** Indices kept on the line after the commit. */
  const keep = new Set<number>();

  words.forEach((raw, index) => {
    const lower = raw.toLowerCase();
    if ((raw.startsWith("-") || raw.startsWith("+")) && raw.length > 1) {
      const word = raw.slice(1);
      // A hide that hides nothing would be stored for good and counted
      // as hiding something, so it is refused instead. Short words are
      // exact-only in the foundation's rule, which is why "-zz" can
      // match nothing at all.
      if (raw.startsWith("-") && hiddenBy([word]) === 0) {
        errors.push({ raw, message: `${raw}: matches no coin` });
        return;
      }
      (raw.startsWith("-") ? hide : unhide).push(word);
      return;
    }
    const m = OP.exec(raw);
    if (m) {
      const field = m[1].toLowerCase();
      const op = m[2];
      const value = m[3];
      const spec = FIELDS[field];
      keep.add(index);
      if (!spec) {
        keep.delete(index);
        errors.push({ raw, message: `${raw}: not a filter here` });
        return;
      }
      const wantsGe = op.includes(">") || (op === "=" && !!spec.ge);
      const aimed = (wantsGe ? spec.ge : spec.le) ?? spec.ge ?? spec.le!;
      if (op !== ">=" && op !== "<=") {
        failed.add(aimed);
        failedAt.push({ index, kind: aimed });
        errors.push({ raw, message: `${raw}: write >= or <= (limits include the value)` });
        return;
      }
      const kind = op === ">=" ? spec.ge : spec.le;
      if (!kind) {
        failed.add(aimed);
        failedAt.push({ index, kind: aimed });
        errors.push({ raw, message: `${raw}: ${field} takes ${spec.ge ? ">=" : "<="} only` });
        return;
      }
      if (!value.trim()) {
        failed.add(kind);
        failedAt.push({ index, kind });
        errors.push({ raw, message: `${raw}: no amount` });
        return;
      }
      limit.set(kind, { index, raw, value, shown: `${op}${value}` });
      return;
    }
    if (TIER_WORDS[lower]) {
      // Several tiers are allowed; the same one twice is one token.
      if (!tiers.some((t) => t.tier === TIER_WORDS[lower])) {
        tiers.push({ index, raw, tier: TIER_WORDS[lower] });
        keep.add(index);
      }
      return;
    }
    if (STAGE_WORDS[lower]) {
      stage = { index, raw, stage: STAGE_WORDS[lower] };
      return;
    }
    search.push({ index, raw });
    keep.add(index);
  });

  // Last wins: only the winning limit and stage tokens stay on the line.
  for (const l of limit.values()) keep.add(l.index);
  const st = stage as { index: number; raw: string; stage: "curve" | "migrated" } | null;
  if (st) keep.add(st.index);
  // Earlier duplicates of a limit are dropped from the line.
  words.forEach((raw, index) => {
    const m = OP.exec(raw);
    if (!m || !keep.has(index)) return;
    const spec = FIELDS[m[1].toLowerCase()];
    if (!spec || (m[2] !== ">=" && m[2] !== "<=")) return;
    const kind = m[2] === ">=" ? spec.ge : spec.le;
    if (kind && m[3].trim() && limit.get(kind)?.index !== index) keep.delete(index);
  });

  const draft: FilterDraft = draftOf(EMPTY_FILTER);
  const prevDraft = draftOf(prev.filter);
  const prevToken = (k: TokenKind) => prev.tokens.find((t) => t.kind === k);
  const kinds: LimitKind[] = ["mcMin", "mcMax", "volMin", "liqMin", "top10Max", "devMax"];
  for (const k of kinds) {
    const l = limit.get(k);
    if (l) draft[k] = l.value;
    else if (failed.has(k)) draft[k] = prevDraft[k];
  }
  draft.tiers = tiers.map((t) => t.tier);
  draft.stage = st ? st.stage : "all";
  draft.search = search.map((s) => s.raw).join(" ");

  const { filter, errors: draftErrors } = commitDraft(draft, prev.filter);

  // Tokens, in the order the columns read them. A field commitDraft
  // refused keeps the previous commit's token, because that is the value
  // it kept.
  const tokens: Token[] = [];
  const refused = new Set<LimitKind>();
  for (const k of kinds) {
    const e = draftErrors[k];
    if (!e) continue;
    refused.add(k);
    const l = limit.get(k);
    if (l) errors.push({ raw: l.raw, message: `${l.raw}: ${e.charAt(0).toLowerCase()}${e.slice(1)}` });
  }
  // An inverted cap range keeps the previous pair, both halves.
  if (draftErrors.mcMax === "Below the minimum") refused.add("mcMin");
  /** Limits held at the previous commit's token rather than one on this line. */
  const kept = new Map<LimitKind, Token>();
  for (const k of kinds) {
    const l = limit.get(k);
    if (l && !refused.has(k)) tokens.push({ raw: l.raw, kind: k, shown: l.shown });
    else if (refused.has(k) || failed.has(k)) {
      const p = prevToken(k);
      if (p && filter[k] !== null && filter[k] !== undefined) {
        tokens.push(p);
        kept.set(k, p);
      }
    }
  }

  // The committed line: each refused token gives its place to the value
  // actually kept for its field, once, or leaves the line when nothing
  // is kept. Without this the line would print a limit that isn't
  // applied and leave out the one that is.
  const replace = new Map<number, string>();
  const placed = new Set<LimitKind>();
  const settle = (index: number, k: LimitKind) => {
    const p = kept.get(k);
    if (p && !placed.has(k)) {
      replace.set(index, p.raw);
      placed.add(k);
      keep.add(index);
    } else keep.delete(index);
  };
  for (const f of failedAt) settle(f.index, f.kind);
  for (const k of refused) {
    const l = limit.get(k);
    if (l) settle(l.index, k);
  }
  for (const t of tiers) tokens.push({ raw: t.raw, kind: "tier", shown: t.raw });
  if (st) tokens.push({ raw: st.raw, kind: "stage", shown: st.raw });
  if (search.length) {
    const s = search.map((x) => x.raw).join(" ");
    tokens.push({ raw: s, kind: "search", shown: `"${s}"` });
  }

  const nextText = words
    .map((w, i) => (keep.has(i) ? (replace.get(i) ?? w) : null))
    .filter((w): w is string => w !== null)
    .join(" ");
  return { next: { text: nextText, tokens, filter }, errors, hide, unhide };
}

/** The line with one echo's token taken out, to re-commit when the echo
 *  is pressed. The search echo stands for every search word, so it
 *  takes them all. */
export function withoutToken(c: Committed, token: Token): string {
  const words = c.text.split(/\s+/).filter(Boolean);
  if (token.kind === "search") {
    const drop = new Set(token.raw.split(" "));
    return words.filter((w) => !drop.has(w)).join(" ");
  }
  const i = words.indexOf(token.raw);
  if (i >= 0) words.splice(i, 1);
  return words.join(" ");
}

/** What to re-commit when an echo is pressed: the line without the
 *  token, against a previous commit that no longer has it either. The
 *  second half matters when the echo is a value kept from an earlier
 *  commit because the token now on the line is malformed: without it the
 *  re-commit would keep the value again and the echo could never go. */
export function removeToken(c: Committed, token: Token): { text: string; prev: Committed } {
  const filter: TrendingFilter = { ...c.filter };
  if (token.kind === "tier") filter.tiers = filter.tiers?.filter((t) => t.toLowerCase() !== token.raw.toLowerCase());
  else if (token.kind === "stage") delete filter.stage;
  else if (token.kind === "search") delete filter.search;
  else filter[token.kind] = null;
  return {
    text: withoutToken(c, token),
    prev: { text: c.text, tokens: c.tokens.filter((t) => t !== token), filter },
  };
}
