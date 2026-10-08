import { strings } from '../strings/pt-BR';

/** Game name lettered like a comic cover. */
export function Logo({ className = 'text-6xl sm:text-7xl' }: { className?: string }) {
  return (
    <span
      className={`inline-block -rotate-2 font-display tracking-wider text-pop-yellow [-webkit-text-stroke:2px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:4px_4px_0_var(--color-ink)] ${className}`}
    >
      {strings.app.title}
    </span>
  );
}
