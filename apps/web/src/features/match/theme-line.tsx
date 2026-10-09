import { strings } from '../../strings/pt-BR';

/** The theme of the story being read or drawn, as a highlighted reference. */
export function ThemeLine({ theme }: { theme: string }) {
  return (
    <p className="rounded-xl border-comic bg-pop-yellow px-4 py-3 text-xl font-bold shadow-pop">
      <span className="text-sm font-extrabold tracking-wide uppercase">
        {strings.match.drawing.theme}
      </span>
      <br />
      {theme}
    </p>
  );
}
