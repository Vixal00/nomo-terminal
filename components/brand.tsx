/**
 * Bull mark, drawn as geometry rather than shipped as a raster so it stays
 * crisp at every size and inherits currentColor. Horns + skull silhouette,
 * reduced to the minimum strokes that still read as a bull at 20px.
 */
export function BullMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      {/* horns */}
      <path
        d="M3 7c0 5.2 2.6 8.6 6.6 9.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M29 7c0 5.2-2.6 8.6-6.6 9.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* skull */}
      <path
        d="M9 14.5h14v5.2c0 4.2-3.1 7.3-7 7.3s-7-3.1-7-7.3v-5.2Z"
        fill="currentColor"
      />
      {/* muzzle notch, punched out so the mark reads on light or dark */}
      <path
        d="M13.6 22.4h4.8"
        stroke="var(--color-canvas)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
