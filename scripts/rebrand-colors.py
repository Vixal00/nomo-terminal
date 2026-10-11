"""One-off recolor for the nomo brand reskin.

Walks the terminal's stylesheets (and the few hard-coded colours in its
components) and remaps every colour by role, without touching layout:

  * neutrals (low saturation)  -> the same lightness, cool chrome tint (hue 250)
  * greens  (hue 70-165)        -> lime  (#B8F25C family, hue 84)
  * reds    (hue 335-20)        -> pink  (#FF7A93 family, hue 349)
  * everything else (coin tones, chain blues, ambers) is left alone

Run from the repo root: python3 scripts/rebrand-colors.py
"""
import colorsys, re, sys, pathlib

LIME_H, PINK_H, CHROME_H = 84 / 360, 349 / 360, 250 / 360
EXACT = {"#1cf431": "#b8f25c", "#ee7783": "#ff7a93", "#101011": "#0b0b0e"}

def parse_hex(h):
    h = h[1:]
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    a = h[6:8] if len(h) == 8 else ""
    return r, g, b, a

def remap(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if s < 0.16 or l < 0.06 or l > 0.97:
        # neutral: keep lightness, add a faint cool tint that fades toward white
        tint = 0.10 if l < 0.5 else 0.06
        nh, ns, nl = CHROME_H, tint, l
    elif 70 / 360 <= h <= 165 / 360:
        # green: rotate to lime; pale greys-with-green keep their softness
        nh = LIME_H
        ns = min(1.0, s * 1.05) if s > 0.45 else s
        nl = l
        if s > 0.6 and l > 0.4:      # the signal greens: land on the brand lime
            nl, ns = max(l, 0.62), 0.85
    elif h >= 335 / 360 or h <= 20 / 360:
        nh = PINK_H
        ns = max(s, 0.55) if l > 0.45 else s
        nl = l
    else:
        return None
    nr, ng, nb = colorsys.hls_to_rgb(nh, nl, ns)
    return nr, ng, nb

def fmt_hex(r, g, b, a=""):
    return "#" + "".join(f"{round(c * 255):02x}" for c in (r, g, b)) + a

HEX = re.compile(r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
RGBA = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)")

def sub_hex(m):
    raw = m.group(0).lower()
    if raw in EXACT:
        return EXACT[raw]
    r, g, b, a = parse_hex(raw)
    out = remap(r, g, b)
    return fmt_hex(*out, a) if out else m.group(0)

def sub_rgba(m):
    r, g, b = (int(m.group(i)) / 255 for i in (1, 2, 3))
    out = remap(r, g, b)
    if not out:
        return m.group(0)
    vals = ",".join(str(round(c * 255)) for c in out)
    alpha = m.group(4) or ""
    return f"rgba({vals}{alpha.replace(' ', '')})" if alpha else f"rgb({vals})"

def run(paths, hex_only_exact=False):
    for p in paths:
        src = p.read_text()
        if hex_only_exact:
            out = HEX.sub(lambda m: EXACT.get(m.group(0).lower(), m.group(0)), src)
        else:
            out = RGBA.sub(sub_rgba, HEX.sub(sub_hex, src))
        if out != src:
            p.write_text(out)
            print("recoloured", p)

if __name__ == "__main__":
    root = pathlib.Path(".")
    css = sorted(root.glob("components/nomo/*.css")) + [root / "app/proposals.css"]
    run(css)
    # components: full remap for chrome colours in the chart and portfolio,
    # exact swaps only elsewhere so coin tones are untouched
    run([root / "components/nomo/token-chart.tsx", root / "components/nomo/feature-fire.tsx",
         root / "components/nomo/portfolio.tsx"])
    run([p for p in root.glob("components/nomo/*.ts*") if p.name not in
         ("token-chart.tsx", "feature-fire.tsx", "portfolio.tsx", "data.ts")], hex_only_exact=True)
