/**
 * EveFit Method brand mark: a double-stroke checkmark (Adidas-stripe feel).
 * The main stroke inherits currentColor; the parallel accent stripe is scarlet.
 * Used as the logo glyph, favicon, app icon, and email avatar.
 */
export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 96"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
    >
      <path
        d="M12 43 L42 70 L114 5"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 61 L42 88 L114 23"
        stroke="#FF3B47"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
