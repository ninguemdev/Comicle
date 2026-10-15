/**
 * Inputs nobody types into. A slider keeps the focus after being dragged, so counting it as a
 * field would silence every shortcut (Ctrl+Z in the editor) until a click elsewhere.
 */
const NON_TEXT_INPUTS: ReadonlySet<string> = new Set(['color', 'range']);

/** Typing in a field must never trigger a page shortcut. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type))
  );
}
