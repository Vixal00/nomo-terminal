/** Third-party marks.
 *
 *  Shared because two places need them and neither owns them: the
 *  masthead uses them as icon buttons, and the leaving panel uses them
 *  to identify where a link goes. Every one takes its colour from
 *  currentColor so the element around it decides the resting and hover
 *  states rather than the glyph carrying a hard-coded fill.
 */

/** The X account mark, drawn as a stroke rather than a fill.
 *
 *  That is what keeps it in family with the hairline borders and the 1px
 *  rules the rest of the interface is built from; the solid glyph would
 *  have been the one heavy shape in the bar. */
export function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M0.666748 11.3332L5.17875 6.82117M6.81875 5.18117L11.3334 0.666504M0.666748 0.666504L8.48875 11.3332H11.3334L3.51141 0.666504H0.666748Z" />
    </svg>
  );
}

/** The platform's own mark: horns around a solid head.
 *
 *  One closed path. The earlier version drew the head as a ring with a
 *  disc inside it, which left a hairline of canvas between the two that
 *  closed up into a dark smear at masthead size; this one has no counter
 *  to lose, so it reads the same at 14px as at 400.
 *
 *  Drawn rather than photographed. The rendered logos it replaces were
 *  multi-megabyte PNGs of a bevelled 3D object being asked to survive at
 *  36px, and each one needed a sizes hint to stop the optimiser fetching
 *  a 2000px variant to paint a thumbnail. This is a few hundred bytes,
 *  sharp at every density, and takes the accent from currentColor rather
 *  than baking a green into pixels that then cannot follow the theme.
 */
export function AnsemMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 2985.27 2334.91"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M2983.4,923.42c-5.07-66.4-28.24-128.03-64-183.79-58.88-91.8-147.81-162.56-229.41-232.36l-70.25-60.1c-51.5-44.06-90.1-101.18-108.14-167.32-15.9-58.26-10.59-118.38,5.54-175.77,9.26-32.97,19.41-63.13,34.63-93.48l3.38-10.59-1.64.02c-115.58,51.51-215.27,146.75-253.25,270.66-24.61,80.26-15.3,164.02,20.62,239.44,16.47,34.58,35.91,65.3,56.44,97.62l64.35,101.29c17.07,26.87,26.35,56.81,28.15,88.35,1.72,30.16-6.76,56.81-24.49,80.16-10.53,13.87-21.61,26.2-36.83,35.45-23.08,14.02-46.99,25.06-73.23,32.66-83.89,24.32-170.36,31.37-257.25,29.79l-43.73-43.23c-77.28-70.78-167.59-124.82-266.53-161.19-135.83-49.94-283.61-61.48-425.75-35.05-68.97,11.42-132.34,33.66-195.3,63.06-91.85,42.89-174.41,101.72-244.16,176.36-73.99,1.39-146.67-4.22-218.26-20.62-34.92-8-66.58-19.75-97.47-36.55-62.3-33.93-85.34-102.61-60.3-169.37,11.64-31.04,27.12-58.98,45.32-86.44l33.57-50.65c22.61-34.1,44.14-67.18,61.47-104.2C764.51,298.95,628.67,85,433.02.02h-1.62c-.32,2.23.85,7.4,2.09,9.79,14.48,27.79,23.71,55.32,32.91,85.37,17.42,56.92,23.79,116.03,10.75,174.71-14.82,66.69-61.33,136.71-113.35,180.66l-132.02,111.54-54.64,49.6c-26.83,24.35-50.01,50.69-73.4,78.47-24.39,28.96-43.5,59.6-60.77,93.37C16.81,834.68,3.17,889.08.08,946.23l-.08,44.63c2.64,37.16,7.79,72.73,19.37,108.72,32.25,100.26,97.78,177.34,176.28,245.69,45.01,33.13,88.84,66.42,138.47,93.43,108.15,58.86,224.15,99.95,344.55,126.75,9.17,186.83,83.17,362,208.65,499.58l61.92,61.88c135.95,121.41,306.39,193.71,488.43,205.06l37.72,2.35,37.88.59,7.83-1.59,34.36-2.06c77.28-4.63,152.45-23.54,224.36-51.42,227.39-88.38,404.04-273.92,481.11-505.28,22.28-66.89,35.49-136.03,37.89-206.88,78.54-17.71,153.44-40.06,226.9-69.71l112.34-51.71,93.34-58.72c35.85-22.55,67.27-49.01,96.83-79.01l26.95-27.35c64.69-65.66,121.44-171.08,128.23-263.47l1.86-12.16v-69.97l-1.87-12.16Z" />
    </svg>
  );
}

/* ----------------------------------------------------------- Bullpen */

/* The supplied wordmark carried a clipPath whose rect matched the glyph's
   own bounding box exactly, so it clipped nothing; dropping it also drops
   the document-unique id it needed, which would have collided across the
   several copies that sit in the DOM at once. */

/** Just the animal, with the lettering left off.
 *
 *  Same paths as the wordmark, read through a viewBox cropped to their
 *  bounding box, so the two marks cannot drift apart. At icon size the
 *  lettering would have been illegible anyway, and a 112x26 wordmark
 *  squeezed into a square button is mostly empty space. */
export function BullpenGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28.6129 20.8394"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <BullpenAnimal />
    </svg>
  );
}

/** The full lockup, animal and lettering. */
export function BullpenWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 112 26"
      fill="currentColor"
      aria-label="Bullpen"
      role="img"
      className={className}
    >
      <path d="M99.8511 20.6738V9.00313H104.771V10.3762C105.458 9.34639 106.762 8.77429 108.112 8.77429C110.629 8.77429 112.002 10.2846 112.002 13.0536V20.6738H107.082V13.8087C107.082 12.8476 106.67 12.4357 106.098 12.4357H106.007C105.275 12.4357 104.771 13.0764 104.771 14.0604V20.6738H99.8511Z" />
      <path d="M92.9837 20.9027C89.185 20.9027 86.8508 18.4312 86.8508 14.8385C86.8508 11.2229 89.3223 8.77429 92.9837 8.77429C96.5993 8.77429 99.1623 11.2229 99.1623 14.8385C99.1623 15.319 99.1394 15.6623 99.0936 15.9827H91.5649C91.5878 17.2413 92.0683 17.9278 92.915 17.9278H92.9837C93.6244 17.9278 94.1507 17.5159 94.3109 16.7836H98.9106C98.3156 19.2779 95.9586 20.9027 92.9837 20.9027ZM94.3796 13.351C94.2194 12.2069 93.7617 11.7263 93.0523 11.7263H92.9608C92.2743 11.7263 91.7479 12.2069 91.6564 13.351H94.3796Z" />
      <path d="M73.3793 25.2506V9.00313H78.2993V10.1473C79.0544 9.1862 80.1986 8.77429 81.3428 8.77429C84.3406 8.77429 86.5603 11.0627 86.5603 14.7927C86.5603 18.6143 84.3406 20.9027 81.3428 20.9027C80.1986 20.9027 79.1002 20.445 78.2993 19.4381V25.2506H73.3793ZM79.9927 17.4701C81.0911 17.4701 81.6632 16.4632 81.6632 14.7927C81.6632 13.2595 81.0911 12.2297 79.9927 12.2297H79.8783C78.8256 12.2297 78.2993 13.2595 78.2993 14.8385C78.2993 16.4632 78.8256 17.4701 79.8783 17.4701H79.9927Z" />
      <path d="M67.3168 20.6738V4.65521H72.2368V20.6738H67.3168Z" />
      <path d="M61.2545 20.6738V4.65521H66.1745V20.6738H61.2545Z" />
      <path d="M51.8401 20.9027C49.3229 20.9027 47.9499 19.3923 47.9499 16.6234V9.00311H52.8699V15.8682C52.8699 16.8294 53.2818 17.2413 53.8539 17.2413H53.9454C54.6777 17.2413 55.1812 16.6005 55.1812 15.6165V9.00311H60.1012V20.6738H55.1812V19.3008C54.4946 20.3306 53.1903 20.9027 51.8401 20.9027Z" />
      <path d="M32.8438 20.6738V4.65521H41.7455C44.995 4.65521 46.9172 6.5088 46.9172 8.79717C46.9172 10.7423 45.7273 12.0924 43.7822 12.5501C45.8417 12.8934 47.2605 14.2435 47.2605 16.3259C47.2605 18.8202 45.1552 20.6738 41.9972 20.6738H32.8438ZM40.8531 16.898C41.7226 16.898 42.2032 16.4632 42.2032 15.6165C42.2032 14.8156 41.7226 14.4037 40.8531 14.4037H37.7638V16.898H40.8531ZM40.67 10.7423C41.4023 10.7423 41.8599 10.3075 41.8599 9.5981C41.8599 8.86582 41.4023 8.43103 40.67 8.43103H37.7638V10.7423H40.67Z" />
      <BullpenAnimal />
    </svg>
  );
}

/** The two paths that draw the animal. Their coordinates already sit at
 *  the origin in the wordmark's viewBox, which is what lets the cropped
 *  viewBox above reuse them untouched. */
function BullpenAnimal() {
  return (
    <>
      <path d="M12.7944 13.0291C13.6199 14.8853 14.9776 17.3249 17.0434 19.4096C16.1515 19.5322 15.1269 19.6049 13.9504 19.6049C3.33417 19.6049 0 7.64689 0 3.29236C0 2.0949 0.28327 0.679138 0.28327 0.679138C3.2474 7.18348 6.77935 11.4984 12.1934 12.9104C12.3899 12.9614 12.5889 13.001 12.7944 13.0291Z" />
      <path d="M28.6129 16.3994C28.6129 18.8951 26.1604 20.8394 23.3954 20.8394C19.6669 20.8394 16.847 18.4202 14.0921 12.9474C12.8199 10.4197 11.6358 5.74603 11.6358 2.84557C11.6358 0.930651 11.9841 0 11.9841 0C13.7552 4.24218 14.5974 5.59922 17.4173 9.35757C19.6465 12.3282 21.9216 14.1793 24.9533 15.3806C25.0197 15.4074 25.0873 15.4125 25.1537 15.4125C25.4216 15.4125 25.6717 15.2428 25.7598 14.9747C25.8708 14.6402 25.6883 14.2789 25.354 14.1678C23.9109 13.6904 22.5813 12.7942 21.4699 11.8419C22.1257 11.7806 22.8633 11.7448 23.5676 11.7448C26.5049 11.7448 28.6129 13.6968 28.6129 16.3994Z" />
    </>
  );
}

/** Solana, in its own gradient.
 *
 *  The one mark on the strip that needs no label beside it — inside this
 *  ecosystem it reads faster than the three letters would, and it is the
 *  only colour on a line that is otherwise green, white and grey.
 *
 *  The gradient's id is fixed rather than generated. Two of these on one
 *  page would technically duplicate it, and the browser would resolve
 *  both to the first — which is the same gradient, so the render is
 *  identical either way; a useId() here would force every consumer to be
 *  a client component to buy nothing.
 *
 *  The source ships a clipPath whose rect is exactly the path's own
 *  bounds, so it is dropped: a clip that clips nothing is a node the
 *  browser still has to composite.
 */
export function SolanaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="none">
      <path
        d="M13.9434 10.8843L12.1275 12.8638C12.088 12.9068 12.0402 12.9411 11.9872 12.9645C11.9341 12.988 11.8768 13 11.819 13H3.21081C3.16974 13 3.12956 12.9878 3.09521 12.9649C3.06086 12.942 3.03384 12.9094 3.01747 12.8711C3.0011 12.8328 2.99609 12.7905 3.00305 12.7494C3.01002 12.7082 3.02866 12.67 3.05668 12.6395L4.87393 10.66C4.9133 10.6171 4.96091 10.5829 5.01381 10.5595C5.06672 10.536 5.12378 10.5239 5.1815 10.5238H13.7892C13.8303 10.5238 13.8704 10.536 13.9048 10.5589C13.9391 10.5818 13.9661 10.6144 13.9826 10.6527C13.9989 10.691 14.0039 10.7333 13.997 10.7744C13.99 10.8156 13.9714 10.8538 13.9434 10.8843ZM12.1275 6.89809C12.088 6.85509 12.0402 6.82081 11.9872 6.79738C11.9341 6.77395 11.8768 6.76188 11.819 6.76191H3.21081C3.16974 6.76191 3.12956 6.7741 3.09521 6.797C3.06086 6.8199 3.03384 6.85249 3.01747 6.89077C3.0011 6.92907 2.99609 6.97139 3.00305 7.01253C3.01002 7.05367 3.02866 7.09185 3.05668 7.12239L4.87393 9.10191C4.9133 9.1448 4.96091 9.179 5.01381 9.20243C5.06672 9.22585 5.12378 9.238 5.1815 9.23809H13.7892C13.8303 9.23809 13.8704 9.2259 13.9048 9.203C13.9391 9.1801 13.9661 9.14751 13.9826 9.10923C13.9989 9.07093 14.0039 9.02861 13.997 8.98747C13.99 8.94633 13.9714 8.90815 13.9434 8.87761L12.1275 6.89809ZM3.21081 5.47619H11.819C11.8768 5.47622 11.9341 5.46415 11.9872 5.44072C12.0402 5.41728 12.088 5.383 12.1275 5.34L13.9434 3.36048C13.9714 3.32995 13.99 3.29177 13.997 3.25062C14.0039 3.20948 13.9989 3.16716 13.9826 3.12887C13.9661 3.09058 13.9391 3.05799 13.9048 3.03509C13.8704 3.0122 13.8303 3 13.7892 3H5.1815C5.12378 3.0001 5.06672 3.01224 5.01381 3.03566C4.96091 3.05909 4.9133 3.09331 4.87393 3.13619L3.05715 5.11572C3.02915 5.1462 3.01052 5.18435 3.00354 5.22544C2.99656 5.26655 3.00153 5.30883 3.01785 5.3471C3.03416 5.38538 3.06111 5.41797 3.09538 5.4409C3.12966 5.46383 3.16978 5.47609 3.21081 5.47619Z"
        fill="url(#solana-mark-ramp)"
      />
      <defs>
        <linearGradient
          id="solana-mark-ramp"
          x1="3.92853"
          y1="13.2383"
          x2="13.1209"
          y2="3.04367"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.08" stopColor="#9945FF" />
          <stop offset="0.3" stopColor="#8752F3" />
          <stop offset="0.5" stopColor="#5497D5" />
          <stop offset="0.6" stopColor="#43B4CA" />
          <stop offset="0.72" stopColor="#28E0B9" />
          <stop offset="0.97" stopColor="#19FB9B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** USDG.
 *
 *  Two-tone and carrying its own colours, like Solana's mark and the
 *  $ANSEM crest: a brand mark whose identity is the pairing does not
 *  survive being handed currentColor. The dark disc is part of the
 *  logo, not a background — it is what the light green is legible
 *  against, at any size and on any surface this site has.
 */
export function UsdgMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 194 195" aria-hidden className={className}>
      <circle cx="96.8933" cy="97.2009" r="96.8386" fill="#314012" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M168.887 102.452C166.099 139.698 134.987 169.051 97.0161 169.051C57.2109 169.051 24.9424 136.793 24.9424 97.0002C24.9424 57.2075 57.2109 24.9492 97.0161 24.9492C134.924 24.9492 165.997 54.2062 168.873 91.3651H134.414C141.936 74.7437 142.391 59.6421 134.165 52.7419C122.017 42.5517 95.537 54.1062 75.0201 78.5496C54.5032 102.993 47.7189 131.069 59.8668 141.259C72.0148 151.449 98.4949 139.895 119.012 115.451C122.588 111.191 125.747 106.82 128.461 102.452H168.887Z"
        fill="#C7E36C"
      />
      <path
        d="M102.43 102.452H131.251L120.121 117.025L102.43 109.924V102.452Z"
        fill="#C7E36C"
      />
    </svg>
  );
}

/** Ethereum's diamond.
 *
 *  currentColor, like every mark here that is not a ramp. The source
 *  ships a black fill and a <title>; the fill is replaced and the title
 *  dropped — a title inside an SVG is a tooltip on hover and an
 *  accessible name to a screen reader, and this glyph is decoration
 *  beside a figure that already names itself.
 */
export function EthereumMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"
      />
    </svg>
  );
}

/** Robinhood's symbol, from the brand kit's RH_symbol_neon.svg.
 *
 *  currentColor rather than the neon it ships with, which is the
 *  convention every mark in this file follows but the two brand marks
 *  above break. They break it because their identity IS a ramp — a flat
 *  Solana mark is not the Solana mark. Robinhood's is one flat colour,
 *  #cf0, and that colour is already a token here: it is the accent the
 *  whole site takes on that network. Painting it by currentColor lets
 *  the same glyph sit lit on the plate that applies it and grey on the
 *  one that does not, which a hardcoded fill could not do.
 *
 *  The source's <style>/.cls-1 indirection is dropped. A class selector
 *  inside an inline SVG is global to the document, and two of these on
 *  one page would have been two rules named .cls-1 fighting over every
 *  element on the site that happened to carry that class.
 */
export function RobinhoodMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 115.87 149.53" aria-hidden className={className} style={style}>
      <path
        fill="currentColor"
        d="m.86,149.53h3.3c.6,0,1.2-.3,1.4-.8C30.46,85.33,57.56,53.93,74.56,35.13c.7-.8.4-1.4-.6-1.4h-30.4c-1.1,0-2.03.44-2.8,1.4l-21.8,27c-3.2,4-4,7.7-4,13v27.6C7.86,122.63,3.36,136.13.06,148.33c-.2.78.1,1.2.8,1.2ZM110.56,4.03c-4.7-5-25.9-5.2-35.7-1.4-2.04.79-4,2.13-4.9,2.9-9,7.7-15,13.8-20.7,19.8-.7.7-.4,1.4.6,1.4h33.7c3.1,0,4.9,1.8,4.9,4.9v38c0,1,.8,1.3,1.4.4l20.3-26.5c3.3-4.3,4.3-5.6,5.2-11.6,1.2-8.8.5-22.3-4.8-27.9Zm-43.5,100.8l13.9-22.9c.3-.6.4-1.3.4-1.8v-38.2c0-1-.7-1.4-1.4-.6-20.9,23.3-37.2,47.8-52.3,77.3-.38.74.1,1.4,1,1.1l31.2-9.6c3.52-1.08,5.5-2.5,7.2-5.3Z"
      />
    </svg>
  );
}

/** The site's own mark, lit.
 *
 *  The rocket in the masthead is a logo; this is the crest, and it is
 *  what the token reads as in a row of currency marks. Filled with the
 *  brand's three-stop green rather than a flat one, for the same reason
 *  the palette has three stops: one green reads as a colour, a ramp
 *  reads as light.
 *
 *  Gradient id fixed rather than generated, as with SolanaMark: two on
 *  a page resolve to the same ramp, and a useId() would force every
 *  consumer to be a client component to buy nothing.
 */
export function AnsemCrest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1297.64 1230.31" aria-hidden className={className}>
      <defs>
        <linearGradient
          id="ansem-crest-ramp"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          {/* Literals, and deliberately not the ramp tokens.
     
              Reading them from --color-* made the crest follow whatever
              the page was wearing, which on the second network painted
              it chartreuse — and this mark is not the page's, it is the
              token's. $ANSEM is $ANSEM on any chain the platform
              launches on, and a brand mark that changes colour with the
              surface it is standing on is not a brand mark.

              The cost is the one this briefly fixed: under Design II the
              crest is Design I's green rather than that design's spring
              green. That is the same trade every other fixed brand mark
              on the site makes, Solana's included. */}
          <stop offset="0" stopColor="#bbfaac" />
          <stop offset="0.45" stopColor="#4ade50" />
          <stop offset="1" stopColor="#2fae37" />
        </linearGradient>
      </defs>
      <g fill="url(#ansem-crest-ramp)">
        <polygon points="890.5 309.61 879.68 276.93 1063.04 258.41 1146.66 250.04 1193.88 148.77 1153.96 0 1252.37 107.16 1297.64 228.98 1222.4 389.87 939.46 454.64 890.5 309.61" />
        <polygon points="357.69 454.47 75.53 389.85 0 229.86 8.86 204.01 44.68 107.17 142.79 .51 103.28 148.91 150.61 250.25 417.14 277.01 357.69 454.47" />
        <polygon points="1012.35 579.17 934.1 519.5 941.49 485.73 942.03 472.36 1063.84 442.86 1175.8 501.27 1105.84 564.95 1012.35 579.17" />
        <polygon points="363.03 519.41 285.58 579.3 191.67 565.08 121.41 501.57 233.92 442.99 354.94 472.2 355.45 485.08 363.03 519.41" />
        <path d="M745.02,774.66l-7.12,58.23-89.12,15.26-89.77-15.16-22.74-181.94,78.83-65.71c-29.21,14.99-56.43,32.4-84.44,49.74l-153.97-114.41-9.25-36.68,58.45-207.19,58.63-36.8,163.63,9.46,164.19-9.64,58.84,36.92,58.07,206.57-8.8,37.16-154.08,114.51c-28.11-17.64-54.84-35.15-84.95-49.68l79.08,65.63-15.49,123.71Z" />
        <polygon points="820.53 995.85 821.84 900.45 930.6 732.88 946.43 559.67 990.01 711.4 1032.13 861.63 813.11 1071.23 649.08 1230.31 532.84 1117.45 265.94 865.22 296.69 752.92 328.36 638.52 350.89 558.98 366.9 733.17 424.03 820.35 475.2 900.26 477.44 995.95 529.41 1050.42 542.27 1047.99 583.27 1097.14 714.63 1097.05 755.27 1048.05 767.65 1050.69 820.53 995.85" />
        <path d="M762.02,1030.84l-113-17.3-113.54,17.28-40.06-42.4-.51-83.68,60.05-56.5,93.31,15.57,94.08-15.62,59.98,56.52-.52,83.55-39.79,42.58ZM596.4,956.75l-10.98-32.77-36.26-19.79-4.56-14.15-18.19,19.2,58.71,60.16,11.27-12.66ZM701.08,956.94l11.79,12.9,58.03-60.63-17.86-19.05-4.88,14.04-36.14,19.93-10.94,32.81Z" />
        <polygon points="549.59 833.32 488.39 887.38 386.21 725.05 380.66 616.57 376.72 540.6 401.59 558.8 424.26 637.39 522.05 649.57 549.59 833.32" />
        <polygon points="747.75 833.25 764.02 725.21 774.93 649.72 872.62 637.47 895.7 558.82 920.28 540.73 911.14 724.4 880.27 773.58 808.91 887.26 747.75 833.25" />
        <polygon points="709.44 1086.44 588.47 1086.45 556.62 1045.18 648.93 1029.37 741.18 1045.16 709.44 1086.44" />
        <polygon points="494 636.13 431.23 629.47 412.86 565.72 494 636.13" />
        <polygon points="865.83 629.44 802.76 636.43 884.2 565.81 865.83 629.44" />
      </g>
    </svg>
  );
}

/** The strip's source control.
 *
 *  A shield with an aperture in it rather than a cog: the cog is the
 *  universal "preferences" glyph and this is not preferences, it is
 *  which of three lists the line in front of you is showing.
 *
 *  Stroked in currentColor, so it takes the button's own hover and open
 *  states instead of carrying a grey the rest of the strip does not
 *  use.
 */
export function SettingsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.25 4.17989C13.4791 4.3102 13.6694 4.4992 13.8012 4.72746C13.933 4.95572 14.0016 5.21498 14 5.47856V10.3346C14 10.8739 13.7047 11.3712 13.228 11.6332L8.728 14.4799C8.5049 14.6024 8.25451 14.6666 8 14.6666C7.74549 14.6666 7.4951 14.6024 7.272 14.4799L2.772 11.6332C2.53878 11.5058 2.34408 11.318 2.20827 11.0895C2.07247 10.8611 2.00053 10.6003 2 10.3346V5.47789C2 4.93856 2.29533 4.44189 2.772 4.17989L7.272 1.52656C7.50169 1.39991 7.75971 1.3335 8.022 1.3335C8.28429 1.3335 8.54231 1.39991 8.772 1.52656L13.272 4.17989H13.25Z" />
      <path d="M6 7.99989C6 8.53032 6.21071 9.03903 6.58579 9.4141C6.96086 9.78917 7.46957 9.99989 8 9.99989C8.53043 9.99989 9.03914 9.78917 9.41421 9.4141C9.78929 9.03903 10 8.53032 10 7.99989C10 7.46946 9.78929 6.96075 9.41421 6.58567C9.03914 6.2106 8.53043 5.99989 8 5.99989C7.46957 5.99989 6.96086 6.2106 6.58579 6.58567C6.21071 6.96075 6 7.46946 6 7.99989Z" />
    </svg>
  );
}

/* ------------------------------------------------------------ Utility */

/** Solscan, in its own two colours.
 *
 *  A drawn document-and-lens stood in here until the real mark arrived;
 *  it said "an explorer" where the button links to one explorer in
 *  particular, and next to X's own glyph a generic one read as the odd
 *  item out.
 *
 *  The source ships a clipPath whose rect is the viewBox, so it is
 *  dropped: a clip that clips nothing is a node the browser still has
 *  to composite. */
export function SolscanMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 316 315" aria-hidden className={className} fill="none">
      <path
        d="M157.501 -0.375009C158.243 -0.3738 158.986 -0.372592 159.751 -0.371347C200.901 -0.19058 238.327 15.5969 268.001 44C268.795 44.7309 269.589 45.4618 270.407 46.2148C299.639 74.0132 314.085 114.372 316.001 154C316.043 154.866 316.086 155.732 316.129 156.625C317.036 195.299 303.157 231.777 277.001 260C272.034 255.884 267.588 251.579 263.251 246.812C258.943 242.131 254.59 237.533 250.063 233.062C245.827 228.877 241.829 224.56 238.001 220C239.494 215.902 241.505 212.358 243.751 208.625C258.049 184.089 261.052 157.294 253.876 130C247.036 105.774 231.076 84.526 209.251 71.875C185.025 58.3674 158.112 53.5756 131.001 61C105.763 68.7927 83.7433 84.5134 70.9019 108.01C58.1815 132.403 54.1314 159.243 62.1256 185.875C70.2872 211.566 87.1832 233.11 111.001 246C136.273 258.52 161.194 259.401 188.125 252.452C190.247 251.941 192.193 251.796 194.376 251.75C195.47 251.711 195.47 251.711 196.587 251.672C203.77 252.648 208.21 257.811 213.024 262.73C213.77 263.481 214.516 264.231 215.285 265.004C217.656 267.392 220.016 269.789 222.376 272.188C223.986 273.813 225.596 275.437 227.208 277.061C231.147 281.033 235.077 285.013 239.001 289C237.172 293.096 234.662 294.969 230.938 297.312C230.016 297.897 230.016 297.897 229.075 298.493C208.561 311.04 185.304 315.442 161.563 315.375C160.771 315.374 159.978 315.373 159.162 315.371C119.658 315.208 81.7949 301.088 52.0006 275C51.1511 274.283 50.3016 273.567 49.4264 272.828C43.1832 267.436 38.0125 261.54 33.0006 255C32.3212 254.125 31.6419 253.249 30.942 252.348C14.9048 231.058 4.95175 206.294 1.00058 180C0.816245 178.802 0.631909 177.605 0.441987 176.371C-4.60214 134.33 7.93634 92.1714 33.7896 58.9648C59.598 26.653 96.2021 6.05584 137.122 0.414542C143.913 -0.311258 150.679 -0.395715 157.501 -0.375009Z"
        fill="#00E8B5"
      />
      <path
        d="M197.996 108.172C209.455 118.008 217.931 131.94 220 147C221.423 167.213 218.076 184.808 204.625 200.5C192.888 212.619 177.288 219.847 160.402 220.354C142.737 220.513 127.002 215.572 114.062 203.26C101.611 190.821 95.117 175.085 94.625 157.5C95.1486 140.845 100.967 125.086 112.727 113.105C137.096 90.5362 171.111 88.6825 197.996 108.172Z"
        fill="#C74AE3"
      />
    </svg>
  );
}

/** Share: a node passing to two others. An arrow leaving a tray is the
 *  system share sheet, which is a different promise on a page that only
 *  copies a link. */
export function ShareMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12.2" cy="3.6" r="2" />
      <circle cx="3.8" cy="8" r="2" />
      <circle cx="12.2" cy="12.4" r="2" />
      <path d="m5.6 7.05 4.8-2.5M5.6 8.95l4.8 2.5" />
    </svg>
  );
}

/** Watch. Open when it is an offer, closed with a slash when it is
 *  already on — the same glyph answering itself rather than two. */
export function EyeMark({
  on,
  className,
}: {
  on?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.3 8S3.9 3.4 8 3.4 14.7 8 14.7 8 12.1 12.6 8 12.6 1.3 8 1.3 8Z" />
      <circle cx="8" cy="8" r="2.1" fill={on ? "currentColor" : "none"} />
    </svg>
  );
}

/** Two sheets, for copy. */
export function CopyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5.6" y="5.6" width="8.1" height="8.1" rx="1.2" />
      <path d="M10.9 5.6V3.5a1.2 1.2 0 0 0-1.2-1.2H3.5a1.2 1.2 0 0 0-1.2 1.2v6.2a1.2 1.2 0 0 0 1.2 1.2h2.1" />
    </svg>
  );
}

/** The tick that answers it. */
export function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.4 8.4 3 3 6.2-7" />
    </svg>
  );
}

/** Two bars, for pause. Square-ended and solid rather than stroked, so
 *  it holds at the 11px it is drawn at beside the tape's label. */
export function PauseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <rect x="4" y="3.5" width="2.6" height="9" />
      <rect x="9.4" y="3.5" width="2.6" height="9" />
    </svg>
  );
}

/** A padlock, closed. Shackle stroked and body filled, so it stays
 *  legible at the 11px it sits at inside a badge — an all-stroke lock
 *  at that size is three hairlines that merge. */
export function LockMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="none">
      <path
        d="M4.9 7V5.2a3.1 3.1 0 0 1 6.2 0V7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="3.1" y="7" width="9.8" height="6.6" fill="currentColor" />
    </svg>
  );
}

/** A page with a folded corner, for an attached file.
 *
 *  One glyph for every type rather than a set keyed on extension. A
 *  reviewer reads the filename to know what a file is; the mark is
 *  there to say "this row is a file", and twelve variants of it would
 *  be twelve things to learn for information the name already gives. */
export function FileMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    >
      <path d="M3.4 1.9h5.3l3.9 3.9v8.3H3.4V1.9Z" />
      {/* The fold, drawn as its own two edges so the corner reads as
          turned rather than as a notch cut out of the page. */}
      <path d="M8.7 1.9v3.9h3.9" />
    </svg>
  );
}

/** A framed picture: mountain and sun. Used to head the resolution and
 *  aspect-ratio notes, where the subject is the shape of an image
 *  rather than the file carrying it. */
export function ImageMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    >
      <rect x="1.9" y="3.1" width="12.2" height="9.8" />
      <path d="m1.9 10.4 3.2-3.1 2.8 2.7 2.3-2.2 3.9 3.8" />
      <circle cx="10.6" cy="6.1" r="1.05" />
    </svg>
  );
}

/** A chevron for a disclosure. Points down when the section is shut and
 *  is turned by the caller when it opens, so one glyph serves both
 *  states and the rotation is what carries the change. */
export function ChevronMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6.2 4 4 4-4" />
    </svg>
  );
}

/** A trace with a spike in it, for the volatility option. Drawn as one
 *  polyline rather than a filled chart: this is a mode, not a reading,
 *  and a shaded area would imply there was data behind it. */
export function PulseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.6 8.6h2.5l1.7-4.4 2.5 8.1 1.8-5.2 1.3 2.5h3" />
    </svg>
  );
}

/** A flame, for what is hot. One stroke, a single outline with the
 *  hollow at the bottom left where a flame has its lick — the second
 *  inner tongue the usual glyph carries is mush at 12px, which is the
 *  only size this is drawn at. Drawn rather than typed: the site has no
 *  emoji, because an emoji is set in whatever colour face the platform
 *  ships and reads as a sticker on a screen of hairlines. */
export function FlameMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.2 1.4c.6 2.6 4 4.7 4 8.3a4.2 4.2 0 0 1-8.4 0c0-2 1.1-3.2 2-4.3.3 1.1.9 1.8 1.5 2.1-.1-2.2.1-4.1.9-6.1Z" />
    </svg>
  );
}

/** A spine with three nodes on it, for a phased roadmap. The same
 *  device the coin page draws its roadmap with, at 16px. */
export function RouteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M4.4 3.4v9.2" />
      <circle cx="4.4" cy="3.4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4.4" cy="8" r="1.5" />
      <circle cx="4.4" cy="12.6" r="1.5" />
      <path d="M8 3.4h4.4M8 8h3M8 12.6h3.6" />
    </svg>
  );
}

/** A speech bubble with two lines in it, for posting updates. Square
 *  cornered like everything else here, with the tail cut from the same
 *  path so the shape stays one outline. */
export function PostMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 2.9h12v8.3H6.6L3.4 14v-2.8H2V2.9Z" />
      <path d="M4.8 5.9h6.4M4.8 8.3h4.2" />
    </svg>
  );
}

/* ------------------------------------------------- Project channels

   The three marks a coin's own links use, beside the X mark above.
   Each is the platform's real logo drawn as one filled path in
   currentColor, so all four sit at the same weight in a row and inherit
   the button's hover state. Telegram's official artwork is a gradient
   disc with three stacked shades on the plane; only the plane is used
   here, which is the mark those shades describe and the only part of it
   that survives being one colour.
   ------------------------------------------------------------------ */

/** Telegram. The plane path from the official mark, scaled off its 240
 *  artboard, with the disc and the two shading layers dropped. */
export function TelegramMark({ className }: { className?: string }) {
  return (
    /* Cropped to the plane, not left on the original 240 artboard. That
       artboard is sized for the disc behind it, so on its own the plane
       filled about half the box and drew a third smaller than the marks
       either side of it. Square and centred on the path's own bounds, so
       a 15px box gives 15px of plane. */
    <svg viewBox="42 48 145 145" aria-hidden className={className} fill="currentColor">
      <path d="M81.486 130.178 52.2 120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229 2.1-2.2 6.489-4.523 120.106-45.36 120.106-45.36s3.208-1.081 5.1-.362a2.766 2.766 0 0 1 1.885 2.055 9.357 9.357 0 0 1 .254 2.585c-.9.752-.1 1.449-.169 2.542-.692 11.165-21.4 94.493-21.4 94.493s-1.239 4.876-5.678 5.043a8.13 8.13 0 0 1-5.925-2.292c-8.711-7.493-38.819-27.727-45.472-32.177a1.27 1.27 0 0 1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6 53.821-51.492c.108-.379-.3-.566-.848-.4-3.482 1.281-63.844 39.4-70.506 43.607a3.21 3.21 0 0 1-1.48.09Z" />
    </svg>
  );
}

/** Discord. The official mark, one path, unchanged apart from its
 *  fill. */
export function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/** A website. Deliberately the plainest thing in this file: a globe
 *  with one meridian and two latitudes, drawn in strokes at the same
 *  weight as the rest of the stroked marks. A project's own site has no
 *  logo the page can know in advance, so the mark has to say "a site"
 *  and nothing more. */
export function GlobeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.1" />
      <ellipse cx="8" cy="8" rx="2.55" ry="6.1" />
      <path d="M2.3 6h11.4M2.3 10h11.4" />
    </svg>
  );
}

/** A calendar page. For booking a call, and for anywhere else a date is
 *  the subject rather than a figure. Two hangers, a head rule, and the
 *  square corners everything stroked in this file has. */
export function CalendarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.2 3.9h11.6v9.9H2.2V3.9Z" />
      <path d="M2.2 6.9h11.6M5.4 2.2v2.6M10.6 2.2v2.6" />
    </svg>
  );
}

/** A document with a folded corner and a bar chart on the page, for the
 *  masthead's docs button.
 *
 *  Its own glyph rather than FileMark, which is the mark an attachment
 *  row wears: that one says "this is a file", and this one says "this
 *  is the writing about the platform". Sharing one would mean a change
 *  to either dragging the other with it.
 *
 *  Portrait, 16x20, so it is sized by height and left to find its own
 *  width — squaring it into the 12px box its neighbours use would
 *  stretch a page into a card. */
export function DocsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 20"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      /* 1.7 rather than the source's 2. At this size 2 read heavier
         than the X and the bull either side of it, and three marks in a
         row have to be one family. */
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 1V5C10 5.26522 10.1054 5.51957 10.2929 5.70711C10.4804 5.89464 10.7348 6 11 6H15M15 6L10 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V17C1 17.5304 1.21071 18.0391 1.58579 18.4142C1.96086 18.7893 2.46957 19 3 19H13C13.5304 19 14.0391 18.7893 14.4142 18.4142C14.7893 18.0391 15 17.5304 15 17V6ZM5 15V10M8 15V14M11 15V12" />
    </svg>
  );
}

/** A triangle with a bar in it, for a caution.
 *
 *  A triangle here and not the ring the toast failures wear: those
 *  report something that already went wrong, and this one is about
 *  something that might — which is the distinction the two shapes carry
 *  everywhere else. */
/** A pencil, for editing a thing rather than replacing a file.
 *
 *  Distinct from the picture mark on a coin's banner: that control
 *  swaps one image and nothing else, and this one opens a form. A
 *  pencil on a portrait says "change what this is", which is what a
 *  profile editor does. */
export function PencilMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.1 2.4a1.7 1.7 0 0 1 2.5 2.4l-7.4 7.4-3.2.8.8-3.2 7.3-7.4Z" />
      <path d="m10.2 3.4 2.4 2.4" />
    </svg>
  );
}

/** An arrow going right, for "this leads somewhere".
 *
 *  A chevron would do the same job in fewer strokes, but this site
 *  already spends chevrons on disclosures and sort columns — things
 *  that open in place. A shafted arrow is the one that means you will
 *  end up on another page. */
export function ArrowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.8 8h10.4M9 3.8 13.2 8 9 12.2" />
    </svg>
  );
}

/** A door with an arrow leaving it, for disconnect.
 *
 *  The one destructive entry in the wallet menu, and the only one that
 *  is not a link. Everything above it goes somewhere; this ends the
 *  session, and a mark pointing out of a box says that before the word
 *  under the cursor does. */
export function ExitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 12"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3.333V2c0-.354-.14-.693-.39-.943S7.02.667 6.667.667H2c-.354 0-.693.14-.943.39S.667 1.646.667 2v8c0 .354.14.693.39.943s.59.39.943.39h4.667c.353 0 .692-.14.942-.39s.391-.59.391-.943V8.667M4.667 6h8M10.667 8l2-2-2-2" />
    </svg>
  );
}

/** A star, for the thing a page can be upgraded to.
 *
 *  Filled rather than outlined, and it is the only filled mark in the
 *  coin card's control row: every button beside it is a stroked glyph
 *  that does something to the page you are on, and this one buys
 *  something. A solid shape among outlines is the cheapest way to say
 *  that without a second colour doing the work alone.
 *
 *  Five points on a 16 grid with the inner radius at 0.382 of the outer
 *  — the classic pentagram ratio. Fatter and it reads as a flower;
 *  thinner and the arms disappear at 12px, which is the only size this
 *  is ever drawn at. */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 .9l1.96 3.97 4.38.64-3.17 3.09.75 4.36L8 10.9l-3.92 2.06.75-4.36L1.66 5.5l4.38-.64L8 .9Z" />
    </svg>
  );
}

export function WarnMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.9 15 14.3H1L8 1.9Z" />
      <path d="M8 6.4v3.4" />
      <path d="M8 11.9h.01" />
    </svg>
  );
}

/** A clock, for how long a coin has been out.
 *
 *  Hands at ten past ten rather than straight up: two hands on top of
 *  each other at 12 read as one hand at this size, and the site draws
 *  ages beside this ("2d 14h"), which is exactly the string that would
 *  be misread as a countdown without something saying it looks
 *  backwards. */
export function ClockMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.1" />
      <path d="M8 4.4V8l2.6 1.7" />
    </svg>
  );
}

/** A cross, for closing and removing.
 *
 *  Not to be confused with XMark above, which is the X account's logo —
 *  a leaning glyph with a thick and a thin stroke that reads as a brand
 *  the moment it sits next to anything. This one is two even strokes at
 *  45 degrees and means "take this away". They ended up used
 *  interchangeably once, which put a social network's mark on a delete
 *  button. */
export function CloseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.6 3.6 12.4 12.4M12.4 3.6 3.6 12.4" />
    </svg>
  );
}

/** A wallet: a folded card with a clasp on the outer edge.
 *
 *  Stroked at the same weight as the rest of the small marks here, and
 *  in currentColor rather than the fill it arrived with, so the strip it
 *  sits in decides its colour like every other glyph. */
export function WalletMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.33341 3.33317V1.33317C9.33341 1.15636 9.26318 0.98679 9.13815 0.861766C9.01313 0.736742 8.84356 0.666504 8.66675 0.666504H2.00008C1.64646 0.666504 1.30732 0.80698 1.05727 1.05703C0.807224 1.30708 0.666748 1.64622 0.666748 1.99984M9.33341 3.33317H2.00008C1.64646 3.33317 1.30732 3.19269 1.05727 2.94265C0.807224 2.6926 0.666748 2.35346 0.666748 1.99984M9.33341 3.33317H10.0001C10.1769 3.33317 10.3465 3.40341 10.4715 3.52843C10.5965 3.65346 10.6667 3.82303 10.6667 3.99984V5.99984M0.666748 1.99984V9.99984C0.666748 10.3535 0.807224 10.6926 1.05727 10.9426C1.30732 11.1927 1.64646 11.3332 2.00008 11.3332H10.0001C10.1769 11.3332 10.3465 11.2629 10.4715 11.1379C10.5965 11.0129 10.6667 10.8433 10.6667 10.6665V8.6665M11.3334 5.99984V8.6665H8.66675C8.31313 8.6665 7.97399 8.52603 7.72394 8.27598C7.47389 8.02593 7.33341 7.68679 7.33341 7.33317C7.33341 6.97955 7.47389 6.64041 7.72394 6.39036C7.97399 6.14031 8.31313 5.99984 8.66675 5.99984H11.3334Z" />
    </svg>
  );
}

/** An i in a ring, for a hint that opens on hover or focus. */
export function InfoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.1" />
      <path d="M8 7.2v4" />
      <path d="M8 4.9v.2" strokeWidth="1.8" />
    </svg>
  );
}

/** Three bars, for a figure kept behind a hover: the count, the
 *  wallets, whatever the row does not have room to say. */
export function BarsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M3.5 13.5V9" />
      <path d="M8 13.5V4" />
      <path d="M12.5 13.5V6.5" />
    </svg>
  );
}
