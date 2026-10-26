import {
  activeOptions,
  avatarCatalog,
  avatarTransform,
  AVATAR_LAYOUT_LIMITS,
  EDITABLE_AVATAR_CATEGORIES,
  OPTIONAL_AVATAR_CATEGORIES,
  randomAvatar,
  type AvatarCategory,
  type AvatarConfig,
  type AvatarTransform,
  type EditableAvatarCategory,
  type OptionalAvatarCategory,
  type Rng,
} from '@comicle/shared';
import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { AvatarRenderer } from './avatar-renderer';

const TABS = EDITABLE_AVATAR_CATEGORIES;

const optionalCategories: ReadonlySet<AvatarCategory> = new Set(OPTIONAL_AVATAR_CATEGORIES);

function isOptional(category: AvatarCategory): category is OptionalAvatarCategory {
  return optionalCategories.has(category);
}

function withOption(
  avatar: AvatarConfig,
  category: EditableAvatarCategory,
  id: string | null,
): AvatarConfig {
  if (avatar[category] === id) return avatar;
  if (!avatar.layout) return { ...avatar, [category]: id };
  const parts = withoutPartTransform(avatar.layout.parts, category);
  return { ...avatar, [category]: id, layout: { version: 1, parts } };
}

function withoutOption(avatar: AvatarConfig, category: OptionalAvatarCategory): AvatarConfig {
  return withOption(avatar, category, null);
}

function withTransform(
  avatar: AvatarConfig,
  category: EditableAvatarCategory,
  transform: AvatarTransform,
): AvatarConfig {
  return {
    ...avatar,
    layout: { version: 1, parts: { ...avatar.layout?.parts, [category]: transform } },
  };
}

function resetTransform(avatar: AvatarConfig, category: EditableAvatarCategory): AvatarConfig {
  if (!avatar.layout?.parts[category]) return avatar;
  const parts = withoutPartTransform(avatar.layout.parts, category);
  return { ...avatar, layout: { version: 1, parts } };
}

function withoutPartTransform(
  parts: NonNullable<AvatarConfig['layout']>['parts'],
  category: EditableAvatarCategory,
) {
  return Object.fromEntries(Object.entries(parts).filter(([key]) => key !== category));
}

function clampOffset(value: number): number {
  return Math.max(AVATAR_LAYOUT_LIMITS.minOffset, Math.min(AVATAR_LAYOUT_LIMITS.maxOffset, value));
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
  const [activeTab, setActiveTab] = useState<EditableAvatarCategory>('eyes');
  const tabs = useRef(new Map<EditableAvatarCategory, HTMLButtonElement>());
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    category: EditableAvatarCategory;
    transform: AvatarTransform;
  } | null>(null);
  const transform = avatarTransform(value, activeTab);
  const hasPart = value[activeTab] != null;
  const idPrefix = useId();
  const tabId = (category: EditableAvatarCategory) => `${idPrefix}-tab-${category}`;
  const panelId = (category: EditableAvatarCategory) => `${idPrefix}-panel-${category}`;

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
      <div className="flex shrink-0 flex-col items-center gap-3 sm:sticky sm:top-4">
        <div className="rounded-xl border-comic bg-paper p-2 shadow-pop">
          <div
            className="touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => {
              if (!hasPart || !event.isPrimary || event.button !== 0) return;
              const width = event.currentTarget.getBoundingClientRect().width;
              if (width === 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                width,
                category: activeTab,
                transform,
              };
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (!start || start.pointerId !== event.pointerId) return;
              onChange(
                withTransform(value, start.category, {
                  ...start.transform,
                  x: clampOffset(start.transform.x + (event.clientX - start.x) / start.width),
                  y: clampOffset(start.transform.y + (event.clientY - start.y) / start.width),
                }),
              );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
          >
            <AvatarRenderer avatar={value} size={256} label={strings.avatar.preview} />
          </div>
        </div>
        <p className="max-w-64 text-center text-sm text-muted">{strings.avatar.fixedHead}</p>
        <p className="max-w-64 text-center text-sm text-muted">{strings.avatar.dragHint}</p>
        <Button
          variant="secondary"
          onClick={() => {
            onChange({ ...randomAvatar(rng), head: value.head });
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

        <fieldset disabled={!hasPart} className="flex flex-col gap-3 rounded-xl border-comic p-3">
          <legend className="px-1 font-bold">
            {strings.avatar.adjust(avatarCatalog.categories[activeTab].label)}
          </legend>
          {(
            [
              ['x', strings.avatar.horizontal, -35, 35],
              ['y', strings.avatar.vertical, -35, 35],
              ['scale', strings.avatar.size, 50, 200],
            ] as const
          ).map(([key, label, min, max]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="flex justify-between gap-2 font-semibold">
                {label} <output>{strings.avatar.percent(Math.round(transform[key] * 100))}</output>
              </span>
              <input
                type="range"
                aria-label={label}
                aria-valuetext={strings.avatar.percent(Math.round(transform[key] * 100))}
                min={min}
                max={max}
                step={1}
                value={Math.round(transform[key] * 100)}
                onChange={(event) => {
                  onChange(
                    withTransform(value, activeTab, {
                      ...transform,
                      [key]: Number(event.target.value) / 100,
                    }),
                  );
                }}
              />
            </label>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onChange(resetTransform(value, activeTab));
            }}
          >
            {strings.avatar.resetPart}
          </Button>
        </fieldset>
        {!hasPart && <p className="text-sm text-muted">{strings.avatar.choosePart}</p>}

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
