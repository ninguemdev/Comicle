import type { ReactNode } from 'react';

export interface SpeechBubbleProps {
  children: ReactNode;
  className?: string;
}

/** Comic balloon for state messages ("Guarde bem na memória…"). */
export function SpeechBubble({ children, className = '' }: SpeechBubbleProps) {
  return (
    <div className={`relative mb-5 ${className}`}>
      <div className="rounded-[2rem] border-comic bg-paper px-5 py-4 text-lg font-semibold shadow-pop">
        {children}
      </div>
      {/* The tail overlaps the border so the balloon reads as one shape. */}
      <svg
        viewBox="0 0 28 22"
        className="absolute -bottom-[19px] left-10 h-[22px] w-7"
        aria-hidden="true"
      >
        <path
          d="M2 0 L8 20 L24 0"
          fill="var(--color-paper)"
          stroke="var(--color-ink)"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
