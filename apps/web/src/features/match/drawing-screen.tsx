import { drawingSecondsFor, type MatchView, type PanelRef, type PlayerView } from '@comicle/shared';
import { useEffect, useEffectEvent, useState } from 'react';

import { useOnline, useRoomStore } from '../../stores/room-store';
import { strings } from '../../strings/pt-BR';
import { Button } from '../../ui/button';
import { Dialog } from '../../ui/dialog';
import { secondsLeft, Timer } from '../../ui/timer';
import { ComicPage } from '../comic/comic-page';
import { PanelFrame } from '../comic/panel-frame';
import { DrawingEditor } from '../drawing/drawing-editor';
import { DrawingDocument } from '../drawing/engine/drawing-document';
import { exportPng } from '../drawing/engine/export';
import { loadImage } from '../drawing/load-image';
import { AbortMatchButton } from './abort-match-button';
import { roundLabel } from './match-header';
import { StoryPanelStrip } from './story-panel-strip';
import { useActionError } from './use-action-error';
import { useAutosave } from './use-autosave';
import { useMyDrafts } from './use-my-draft';
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
   * panels are still on their way in the closing (R42), the end of the closing window.
   */
  deadlineAt: number | null;
  /** R66: panels the player draws this round; more than one in the individual mode. */
  panelCount: number;
  /** R48: panels with a draft to restore. */
  draftPanels: readonly number[];
  /** `round_closing` while this player's panels are still on their way (R42). */
  closing: boolean;
  /** The panels are in: the match screen may move on. */
  onSent: (roundIndex: number) => void;
}

/**
 * R38–R42, R48, R65, R66: the editor as large as the screen allows, the theme as a one-line
 * reference, autosave while drawing and every panel handed in exactly once. With several panels
 * (individual mode), a numbered strip moves between them; each keeps its own drawing and history.
 */
export function DrawingScreen({
  view,
  match,
  theme,
  previousPanels,
  deadlineAt,
  panelCount,
  draftPanels,
  closing,
  onSent,
}: DrawingScreenProps) {
  const actions = useRoomStore((state) => state.actions);
  const online = useOnline();
  const offsetMs = useRoomStore((state) => state.clockOffsetMs);
  const [documents] = useState(() =>
    Array.from({ length: Math.max(1, panelCount) }, () => new DrawingDocument()),
  );
  const [current, setCurrent] = useState(0);
  /** Bumped on every change to a drawing, so the strip and the buttons follow. */
  const [, setChanges] = useState(0);
  const [themeOpen, setThemeOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /** The reference panel shown large, if any. */
  const [enlarged, setEnlarged] = useState<PanelRef | null>(null);
  const [restored] = useState(() => new Set<number>());
  const drafts = useMyDrafts(view.room.code, draftPanels);
  const { report, toast } = useActionError();
  const { roundIndex } = match;
  const story = documents.length > 1;
  const doneTexts = story ? texts.story : texts;
  const document = documents[current];

  const submission = usePanelSubmission({
    panelCount: documents.length,
    exportPanel: (panelIndex) => {
      const panel = documents[panelIndex];
      return panel ? exportPng(panel) : Promise.resolve(null);
    },
    roundIndex,
    deadlineAt,
    offsetMs,
    send: (round, panelIndex, reason, png) => actions.submitPanel(round, panelIndex, reason, png),
    onSent,
    onError: report,
  });
  const disabled = closing || submission.status !== 'idle';

  const { markSaved } = useAutosave({
    documents,
    enabled: !disabled,
    exportPanel: (panel) => exportPng(panel),
    save: (panelIndex, png) => actions.autosavePanel(roundIndex, panelIndex, png),
  });

  // R48: each restored draft becomes the base layer of its panel, already saved on the server.
  const onDraftLoaded = useEffectEvent((panelIndex: number, image: HTMLImageElement) => {
    const panel = documents[panelIndex];
    if (panel) {
      panel.setBaseImage(image);
      markSaved(panelIndex, panel.revision);
      setChanges((count) => count + 1);
    }
  });
  useEffect(() => {
    let active = true;
    for (const [panelIndex, url] of drafts) {
      if (restored.has(panelIndex)) {
        continue;
      }
      restored.add(panelIndex);
      loadImage(url)
        .then((image) => {
          if (active) {
            onDraftLoaded(panelIndex, image);
          }
        })
        .catch(() => {
          // An unreadable draft is not worth blocking the round: that panel starts blank.
        });
    }
    return () => {
      active = false;
    };
  }, [drafts, restored]);

  /** R40: confirmation only while more than half of the time is left. */
  function requestDone(): void {
    // Offline the editor keeps drawing; only handing in waits for the connection.
    if (disabled || !online) {
      return;
    }
    const left = deadlineAt === null ? 0 : secondsLeft(deadlineAt, offsetMs);
    if (left > drawingSecondsFor(view.room.settings) / HALF) {
      setConfirming(true);
    } else {
      submission.done();
    }
  }

  // Ctrl/⌘+Enter concludes (interface.md §4; the editor itself never hands anything in, D25);
  // Alt+←/→ move between the panels of the story (R65).
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (confirming || enlarged) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      requestDone();
    } else if (story && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      setCurrent((index) => Math.min(Math.max(index + step, 0), documents.length - 1));
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
        <span className="font-display text-2xl tracking-wide">
          {roundLabel(match, view.room.settings.mode)}
        </span>
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
          {submission.status === 'idle' ? doneTexts.submit : texts.submitting}
        </Button>
        {view.me.isHost && <AbortMatchButton />}
      </header>
      {closing && (
        <p role="status" className="rounded-lg border-comic bg-pop-yellow px-3 py-1 font-bold">
          {doneTexts.collecting}
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-2 landscape:flex-row md:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          <DrawingEditor
            document={document}
            disabled={disabled}
            onChange={() => {
              setChanges((count) => count + 1);
            }}
          />
        </div>
        {previousPanels.length > 0 && (
          <div className="order-first landscape:order-last md:order-last">
            <ReferencePanels panels={previousPanels} onOpen={setEnlarged} />
          </div>
        )}
      </div>
      {story && <StoryPanelStrip documents={documents} current={current} onSelect={setCurrent} />}
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
        title={doneTexts.confirmTitle}
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
              {doneTexts.confirm}
            </Button>
          </>
        }
      >
        <p>{doneTexts.confirmBody}</p>
      </Dialog>
      {toast}
    </div>
  );
}
