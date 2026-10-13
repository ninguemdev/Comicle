import type { MatchView, PanelRef, PlayerView } from '@comicle/shared';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useOnline, useRoomStore } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { secondsLeft, Timer } from '../../ui/timer';
import { ComicPage } from '../comic/comic-page';
import { PanelFrame } from '../comic/panel-frame';
import { DrawingEditor, type DrawingEditorHandle } from '../drawing/drawing-editor';
import { AbortMatchButton } from './abort-match-button';
import { roundLabel } from './match-header';
import { useActionError } from './use-action-error';
import { useAutosave } from './use-autosave';
import { useMyDraft } from './use-my-draft';
import { usePanelSubmission } from './use-panel-submission';

const texts = strings.match.drawing;
const HALF = 2;

/** Width of a reference thumbnail, in CSS px: as small as the presentation strip. */
const REFERENCE_WIDTH = 96;

/**
 * R38 with `showPreviousPanels`: the story's earlier panels, small, to check them; a click opens
 * one large. A column right of the editor; a strip above it on a phone held upright.
 */
function ReferencePanels({
  panels,
  onOpen,
}: {
  panels: readonly PanelRef[];
  onOpen: (panel: PanelRef) => void;
}) {
  return (
    <ul
      aria-label={texts.previousPanels}
      className="flex shrink-0 gap-2 overflow-x-auto p-1 landscape:flex-col landscape:overflow-x-visible landscape:overflow-y-auto md:flex-col md:overflow-x-visible md:overflow-y-auto"
    >
      {panels.map((panel) => (
        <li key={panel.panelId}>
          <button
            type="button"
            aria-label={texts.enlargePanel(panel.position + 1, panel.artist.nickname)}
            onClick={() => {
              onOpen(panel);
            }}
            className="block cursor-zoom-in rounded transition-transform hover:scale-105"
          >
            <PanelFrame panel={panel} width={REFERENCE_WIDTH} compact />
          </button>
        </li>
      ))}
    </ul>
  );
}

export interface DrawingScreenProps {
  view: PlayerView;
  match: MatchView;
  theme: string;
  /** R38: earlier panels to show as a reference; empty without `showPreviousPanels`. */
  previousPanels: readonly PanelRef[];
  /**
   * R38: the drawing deadline, which may start during the others' reading (R36); while the
   * panel is still on its way in the closing (R42), the end of the closing window.
   */
  deadlineAt: number | null;
  hasDraft: boolean;
  /** `round_closing` while this player's panel is still on its way (R42). */
  closing: boolean;
  /** The panel is in: the match screen may move on. */
  onSent: (roundIndex: number) => void;
}

/**
 * R38–R42, R48: the editor as large as the screen allows, the theme as a one-line reference,
 * autosave while drawing and the panel handed in exactly once.
 */
export function DrawingScreen({
  view,
  match,
  theme,
  previousPanels,
  deadlineAt,
  hasDraft,
  closing,
  onSent,
}: DrawingScreenProps) {
  const actions = useRoomStore((state) => state.actions);
  const online = useOnline();
  const offsetMs = useRoomStore((state) => state.clockOffsetMs);
  const editor = useRef<DrawingEditorHandle>(null);
  const [revision, setRevision] = useState(0);
  const [themeOpen, setThemeOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /** The reference panel shown large, if any. */
  const [enlarged, setEnlarged] = useState<PanelRef | null>(null);
  const baseImageUrl = useMyDraft(view.room.code, hasDraft);
  const { report, toast } = useActionError();
  const { roundIndex } = match;

  const submission = usePanelSubmission({
    editor,
    roundIndex,
    deadlineAt,
    offsetMs,
    send: (round, reason, png) => actions.submitPanel(round, reason, png),
    onSent,
    onError: report,
  });
  const disabled = closing || submission.status !== 'idle';

  useAutosave({
    editor,
    revision,
    enabled: !disabled,
    save: (png) => actions.autosavePanel(roundIndex, png),
  });

  /** R40: confirmation only while more than half of the time is left. */
  function requestDone(): void {
    // Offline the editor keeps drawing; only handing in waits for the connection.
    if (disabled || !online) {
      return;
    }
    const left = deadlineAt === null ? 0 : secondsLeft(deadlineAt, offsetMs);
    if (left > view.room.settings.drawingSeconds / HALF) {
      setConfirming(true);
    } else {
      submission.done();
    }
  }

  // Ctrl/⌘+Enter concludes (interface.md §4; the editor itself never hands anything in, D25).
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !confirming && !enlarged) {
      event.preventDefault();
      requestDone();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', onShortcut);
    return () => {
      window.removeEventListener('keydown', onShortcut);
    };
  }, []);

  return (
    <div className="full-screen z-30 flex flex-col gap-2 bg-paper p-2 sm:p-3">
      <header className="flex flex-wrap items-center gap-2">
        <span className="font-display text-2xl tracking-wide">{roundLabel(match)}</span>
        <button
          type="button"
          aria-expanded={themeOpen}
          aria-label={themeOpen ? texts.hideTheme : texts.showTheme}
          onClick={() => {
            setThemeOpen((open) => !open);
          }}
          className="flex min-w-0 flex-1 items-baseline gap-2 rounded-lg border-comic bg-pop-yellow px-3 py-1 text-left"
        >
          <span className="shrink-0 text-xs font-extrabold tracking-wide uppercase">
            {texts.theme}
          </span>
          <span className={`font-bold ${themeOpen ? '' : 'truncate'}`}>{theme}</span>
        </button>
        {deadlineAt !== null && <Timer deadlineAt={deadlineAt} offsetMs={offsetMs} />}
        <Button onClick={requestDone} disabled={disabled || !online}>
          {submission.status === 'idle' ? texts.submit : texts.submitting}
        </Button>
        {view.me.isHost && <AbortMatchButton />}
      </header>
      {closing && (
        <p role="status" className="rounded-lg border-comic bg-pop-yellow px-3 py-1 font-bold">
          {texts.collecting}
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-2 landscape:flex-row md:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          <DrawingEditor
            ref={editor}
            disabled={disabled}
            baseImageUrl={baseImageUrl}
            onChange={setRevision}
          />
        </div>
        {previousPanels.length > 0 && (
          <div className="order-first landscape:order-last md:order-last">
            <ReferencePanels panels={previousPanels} onOpen={setEnlarged} />
          </div>
        )}
      </div>
      <Dialog
        open={enlarged !== null}
        wide
        title={
          enlarged ? strings.comic.panelAlt(enlarged.position + 1, enlarged.artist.nickname) : ''
        }
        onClose={() => {
          setEnlarged(null);
        }}
      >
        <div className="aspect-[4/3] max-h-[70vh] w-full">
          {enlarged && <ComicPage key={enlarged.panelId} panels={[enlarged]} maxColumns={1} />}
        </div>
      </Dialog>
      <Dialog
        open={confirming}
        title={texts.confirmTitle}
        onClose={() => {
          setConfirming(false);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(false);
              }}
            >
              {texts.keepDrawing}
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                submission.done();
              }}
            >
              {texts.confirm}
            </Button>
          </>
        }
      >
        <p>{texts.confirmBody}</p>
      </Dialog>
      {toast}
    </div>
  );
}
