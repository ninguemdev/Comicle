import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border-comic bg-paper p-4 shadow-pop sm:p-6 ${className}`}
      {...props}
    />
  );
}
