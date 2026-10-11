"""Second recolour pass for the nomo reskin: the 'trencher' push.

Runs after rebrand-colors.py (already applied). Styling only:

  * backgrounds (very dark neutrals) -> deeper ink with a violet cast
  * lines / raised surfaces          -> violet-tinted, like the chrome art's edges
  * pale, washed-out limes            -> full neon lime
  * dark lime tints (chip fills)      -> more saturated so they glow
  * pale pinks                        -> hot pink

Run once from the repo root: python3 scripts/degen-colors.py
Running it again would push the colours further.
"""
import colorsys, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location("rb", pathlib.Path(__file__).parent / "rebrand-colors.py")
rb = importlib.util.module_from_spec(spec); spec.loader.exec_module(rb)

INK_H, LIME_H, PINK_H = 258 / 360, 84 / 360, 349 / 360

def remap(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    neutral = s < 0.2 or l < 0.04
    if neutral and l < 0.115:                      # grounds and panels
        nh, nl, ns = INK_H, l * 0.8, 0.14
    elif neutral and l < 0.27:                     # lines, raised surfaces
        nh, nl, ns = INK_H, l, 0.16
    elif not neutral and abs(h - LIME_H) < 30 / 360:
        nh = LIME_H
        if l >= 0.42:                              # text, icons: neon
            nl, ns = max(l, 0.6), 0.86
        else:                                      # tints: saturate
            nl, ns = l, min(1.0, s * 1.7)
    elif not neutral and (h >= 330 / 360 or h <= 15 / 360):
        nh = PINK_H
        if l >= 0.45:
            nl, ns = max(l, 0.66), 1.0
        else:
            nl, ns = l, min(1.0, s * 1.5)
    else:
        return None
    return colorsys.hls_to_rgb(nh, nl, ns)

rb.remap = remap
rb.EXACT = {}

if __name__ == "__main__":
    root = pathlib.Path(".")
    css = [p for p in sorted(root.glob("components/nomo/*.css")) if p.name not in ("brand.css", "landing.css")]
    rb.run(css)
