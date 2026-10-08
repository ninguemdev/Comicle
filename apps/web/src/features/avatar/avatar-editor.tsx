import {
  activeOptions,
  avatarCatalog,
  OPTIONAL_AVATAR_CATEGORIES,
  randomAvatar,
  type AvatarCategory,
  type AvatarConfig,
  type OptionalAvatarCategory,
  type Rng,
} from '@comicle/shared';
import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { AvatarRenderer } from './avatar-renderer';

/** Tab order follows the product spec (§3.1), not the drawing order. */
const TABS: readonly AvatarCategory[] = ['head', 'eyes', 'mouth', 'cheeks', 'faceAccessory', 'hat'];

const optionalCategories: ReadonlySet<AvatarCategory> = new Set(OPTIONAL_AVATAR_CATEGORIES);

function isOptional(category: AvatarCategory): category is OptionalAvatarCategory {
  return optionalCategories.has(category);
}

function withOption(avatar: AvatarConfig, category: AvatarCategory, id: string): AvatarConfig {
  return { ...avatar, [category]: id };
}

function withoutOption(avatar: AvatarConfig, category: OptionalAvatarCategory): AvatarConfig {
  return { ...avatar, [category]: null };
}

/** Arrow keys move between tabs (WAI-ARIA tabs pattern); `null` for any other key. */
function tabIndexForKey(key: string, current: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % TABS.length;
    case 'ArrowLeft':
      return (current - 1 + TABS.length) % TABS.length;
    case 'Home':
      return 0;
    case 'End':
      return TABS.length - 1;
    default:
      return null;
  }
}

interface OptionButtonProps {
  label: string;
  selected: boolean;
  /** The current avatar with this option applied, so the thumbnail shows the result. */
  preview: AvatarConfig;
  onSelect: () => void;
}

function OptionButton({ label, selected, preview, onSelect }: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border-3 p-1 text-xs font-bold ${
        selected ? 'border-ink bg-pop-yellow shadow-pop' : 'border-transparent hover:border-ink/30'
      }`}
    >
      <AvatarRenderer avatar={preview} size={64} />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

export interface AvatarEditorProps {
  value: AvatarConfig;
  onChange: (avatar: AvatarConfig) => void;
  /** Source for the "Random" button. */
  rng: Rng;
}

/** Large preview, one tab per category and a thumbnail per option (interface.md §2). */
export function AvatarEditor({ value, onChange, rng }: AvatarEditorProps) {
  const [activeTab, setActiveTab] = useState<AvatarCategory>('head');
  const tabs = useRef(new Map<AvatarCategory, HTMLButtonElement>());
  const idPrefix = useId();
  const tabId = (category: AvatarCategory) => `${idPrefix}-tab-${category}`;
  const panelId = (category: AvatarCategory) => `${idPrefix}-panel-${category}`;

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tabIndexForKey(event.key, TABS.indexOf(activeTab));
    const category = next === null ? undefined : TABS[next];
    if (category === undefined) {
      return;
    }
    event.preventDefault();
    setActiveTab(category);
    tabs.current.get(category)?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-col items-center gap-3">
        <div className="rounded-xl border-comic bg-paper p-2 shadow-pop">
          <AvatarRenderer avatar={value} size={256} label={strings.avatar.preview} />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onChange(randomAvatar(rng));
          }}
        >
          {strings.avatar.random}
        </Button>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-4">
        <div
          role="tablist"
          aria-label={strings.avatar.parts}
          onKeyDown={handleTabKeyDown}
          className="flex flex-wrap gap-2"
        >
          {TABS.map((category) => {
            const selected = category === activeTab;
            return (
              <button
                key={category}
                ref={(element) => {
                  if (element) {
                    tabs.current.set(category, element);
                  }
                }}
                type="button"
                role="tab"
                id={tabId(category)}
                aria-selected={selected}
                aria-controls={panelId(category)}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  setActiveTab(category);
                }}
                className={`min-h-11 rounded-full border-comic px-4 font-bold ${
                  selected ? 'bg-pop-yellow shadow-pop' : 'bg-paper'
                }`}
              >
                {avatarCatalog.categories[category].label}
              </button>
            );
          })}
        </div>

        {/* Inactive panels stay mounted (hidden) so every thumbnail is already loaded. */}
        {TABS.map((category) => (
          <div
            key={category}
            role="tabpanel"
            id={panelId(category)}
            aria-labelledby={tabId(category)}
            hidden={category !== activeTab}
            className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2"
          >
            {isOptional(category) && (
              <OptionButton
                label={strings.avatar.none}
                selected={value[category] === null}
                preview={withoutOption(value, category)}
                onSelect={() => {
                  onChange(withoutOption(value, category));
                }}
              />
            )}
            {activeOptions(category).map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                selected={value[category] === option.id}
                preview={withOption(value, category, option.id)}
                onSelect={() => {
                  onChange(withOption(value, category, option.id));
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
