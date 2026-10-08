// Decorative inline icons: the accessible name always comes from the surrounding element.

interface IconProps {
  className?: string;
}

const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function CloseIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...STROKE_PROPS}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...STROKE_PROPS}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CrownIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"
        fill="var(--color-pop-yellow)"
        stroke="var(--color-ink)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
