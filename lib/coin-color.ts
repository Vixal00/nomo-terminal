import tones from "./coin-tones.json";

/**
 * Theme colour for a coin, taken from its own artwork.
 *
 * The enhanced profile is themed to the coin rather than to the site, the
 * way a member profile takes its accent from the avatar rather than from
 * the app. Six cosmetics in the same colour on every coin would read as a
 * template, which is the one thing paying to stand out has to avoid.
 *
 * Precomputed rather than derived at request time. sharp has no
 * synchronous API, so reading pixels inside a server component would mean
 * either an async boundary in the render path or a lie about what the
 * call does; a generated map is honest and costs nothing. Regenerate with
 * `node scripts/coin-tones.mjs` after changing the avatar pool.
 *
 * Values are stored as "r g b" so they drop straight into
 * `rgb(var(--coin) / <alpha>)` without a parse on the client.
 */
const MAP = tones as Record<string, string>;

/** Fallback is the ice token: neutral enough to sit under any artwork
 *  whose colour could not be read. */
export const DEFAULT_TONE = "126 229 237";

export function coinTone(src: string | undefined): string {
  if (!src) return DEFAULT_TONE;
  return MAP[src] ?? DEFAULT_TONE;
}
