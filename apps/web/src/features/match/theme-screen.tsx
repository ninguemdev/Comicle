import {
  codePointLength,
  normalizeText,
  THEME_DRAFT_DEBOUNCE_MS,
  THEME_MAX_LENGTH,
  THEME_MIN_LENGTH,
} from '@comicle/shared';
import { useEffect, useId, useRef, useState } from 'react';

import { useOnline, useRoomStore } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { SpeechBubble } from '../../ui/speech-bubble';
import { useActionError } from './use-action-error';

const texts = strings.match.theme;
const EXAMPLE_ROTATION_MS = 5000;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** One inspiration example after another; a single one with reduced motion (interface.md §1). */
function useRotatingExample(): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      return;
    }
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % texts.examples.length);
    }, EXAMPLE_ROTATION_MS);
    return () => {
      clearInterval(interval);
    };
  }, []);
  return texts.examples[index] ?? '';
}

/** R27: the length the server will count, after normalization. */
function themeLength(text: string): number {
  return codePointLength(normalizeText(text));
}

/** R26–R28: the player writes the theme of their story; drafts are saved as they type. */
export function ThemeScreen({ draft }: { draft: string }) {
  const actions = useRoomStore((state) => state.actions);
  const online = useOnline();
  const fieldId = useId();
  const hintId = useId();
  // R49: back from a reconnection, the field starts with the saved draft.
  const [text, setText] = useState(draft);
  const [sending, setSending] = useState(false);
  const lastSaved = useRef(draft);
  const example = useRotatingExample();
  const { report, toast } = useActionError();
  const length = themeLength(text);
  const tooLong = length > THEME_MAX_LENGTH;
  const valid = length >= THEME_MIN_LENGTH && !tooLong;

  // R28: one `theme:draft` per pause in typing; R49: a draft lost offline goes again once online.
  useEffect(() => {
    if (!online || text === lastSaved.current || themeLength(text) > THEME_MAX_LENGTH) {
      return;
    }
    const timeout = setTimeout(() => {
      void actions.draftTheme(text).then((ack) => {
        if (ack.ok) {
          lastSaved.current = text;
        }
      });
    }, THEME_DRAFT_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [actions, online, text]);

  async function submit(): Promise<void> {
    setSending(true);
    // The theme screen goes away with the next view; only a failure brings the button back.
    if (!report(await actions.submitTheme(text))) {
      setSending(false);
    }
  }

  let hint = texts.counter(length, THEME_MAX_LENGTH);
  if (tooLong) {
    hint = texts.tooLong(THEME_MAX_LENGTH);
  } else if (length > 0 && length < THEME_MIN_LENGTH) {
    hint = texts.tooShort(THEME_MIN_LENGTH);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !sending) {
          void submit();
        }
      }}
    >
      <label htmlFor={fieldId} className="font-display text-3xl tracking-wide">
        {texts.title}
      </label>
      <textarea
        id={fieldId}
        aria-describedby={hintId}
        aria-label={texts.label}
        value={text}
        placeholder={texts.placeholder}
        rows={3}
        onChange={(event) => {
          setText(event.target.value);
        }}
        className="w-full resize-none rounded-xl border-comic bg-paper p-4 text-xl font-semibold shadow-pop"
      />
      <p
        id={hintId}
        className={`text-sm font-bold ${tooLong ? 'text-ink underline decoration-pop-red decoration-4' : 'text-muted'}`}
      >
        {hint}
      </p>
      <SpeechBubble>
        <span className="text-muted">{texts.inspiration}</span> {example}
      </SpeechBubble>
      <Button type="submit" disabled={!valid || sending || !online} className="self-end">
        {texts.submit}
      </Button>
      {toast}
    </form>
  );
}
