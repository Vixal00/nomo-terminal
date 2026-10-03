# Coin artwork

Drop an image here named after the coin's **ticker** and it appears on that
coin's card automatically — no code change, no data edit.

    HORNET.png     ->  hornet  ($HORNET)
    obsd.jpg       ->  obsidian ($OBSD)

Case is ignored. `.png .jpg .jpeg .webp .gif .avif` are all accepted. SVG is
deliberately not, since rendering it through `next/image` needs
`dangerouslyAllowSVG`.

Square (1:1) is the native shape; the avatar centre-crops to a circle.
The seven original files ship at 128x128, which is soft at 2x on the
40px list row and would benefit from being redrawn at 512.

Any coin without a matching file falls back to the generated sigil, so a
partial set is fine — the pool also cycles, so an unnamed coin borrows a
picture rather than showing nothing.

## Still missing

Nine coins have no file of their own and are currently borrowing. Artwork
for all nine has been generated and is waiting in the Higgsfield gallery;
it could not be written here directly because this session's egress policy
blocks the CDN that serves it. Save each as the filename below:

    T.png          ->  t          ($T)
    DRIFT.png      ->  driftwood  ($DRIFT)
    KSTRL.png      ->  kestrel    ($KSTRL)
    LNTRN.png      ->  lanterndao ($LNTRN)
    PYLON.png      ->  pylon      ($PYLON)
    TREMR.png      ->  tremorsol  ($TREMR)
    CINDR.png      ->  cinderx    ($CINDR)
    HUSK.png       ->  husk22     ($HUSK)
    OZONE.png      ->  ozoneprime ($OZONE)

They are 1024x1024 PNGs; downscaling to 512 before committing keeps the
repo light with no visible loss at avatar size.
