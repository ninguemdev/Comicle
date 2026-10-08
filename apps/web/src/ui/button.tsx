import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BASE_CLASSES =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2 text-center ' +
  'font-bold transition-[translate,box-shadow] duration-100 select-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Ink border and hard shadow; pressing pushes the button into its shadow. */
const PRESSABLE_CLASSES =
  'border-comic shadow-pop active:translate-x-[3px] active:translate-y-[3px] ' +
  'active:shadow-pop-pressed disabled:translate-none disabled:shadow-pop';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `${PRESSABLE_CLASSES} bg-pop-yellow font-display text-xl font-normal tracking-wide`,
  secondary: `${PRESSABLE_CLASSES} bg-paper`,
  // Ink text: paper on pop-red would fall below AA contrast.
  danger: `${PRESSABLE_CLASSES} bg-pop-red`,
  ghost: 'border-3 border-transparent underline-offset-4 hover:underline',
};

/** Classes of a button, also for links that look like one (`<Link className={…}>`). */
export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`.trim();
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}
