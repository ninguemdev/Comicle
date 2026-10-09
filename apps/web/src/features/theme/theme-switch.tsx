import { useId } from 'react';

import { THEME_PREFERENCES, useThemeStore } from '../../stores/theme-store';
import { strings } from '../../strings/pt-BR';

const texts = strings.themeSwitch;

/** Light, dark or the system's choice (interface.md §1, Modo escuro); remembered per browser. */
export function ThemeSwitch() {
  const preference = useThemeStore((state) => state.preference);
  const actions = useThemeStore((state) => state.actions);
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <legend className="float-left mr-1 font-bold">{texts.label}</legend>
      <div className="flex overflow-hidden rounded-lg border-comic">
        {THEME_PREFERENCES.map((option) => (
          <label
            key={option}
            className="cursor-pointer px-3 py-1 font-bold has-checked:bg-pop-yellow has-checked:text-night has-focus-visible:outline-4 has-focus-visible:outline-pop-yellow [&:not(:first-child)]:border-l-3 [&:not(:first-child)]:border-ink"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={preference === option}
              onChange={() => {
                actions.choose(option);
              }}
              className="sr-only"
            />
            {texts.options[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
