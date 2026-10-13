import { PANEL_HEIGHT, PANEL_WIDTH } from '@comicle/shared';
import { useEffect, useRef } from 'react';

import { strings } from '../../strings/pt-BR';
import type { DrawingDocument } from '../drawing/engine/drawing-document';
import { renderDocument } from '../drawing/engine/renderer';

const texts = strings.match.drawing.story;

/**
 * A panel of the story, small. Painted at 1:1 (fills need it, see renderer.ts) and scaled by CSS;
 * repainted only when `revision` changes, so the panel being drawn costs nothing per stroke.
 */
function PanelThumbnail({
  document,
  revision,
}: {
  document: DrawingDocument;
  revision: number | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (revision === null) {
      return;
    }
    const ctx = canvas.current?.getContext('2d');
    if (ctx) {
      renderDocument(ctx, document);
    }
  }, [document, revision]);

  return (
    <canvas
      ref={canvas}
      width={PANEL_WIDTH}
      height={PANEL_HEIGHT}
      aria-hidden
      className="block aspect-[4/3] w-20 bg-white sm:w-24"
    />
  );
}

export interface StoryPanelStripProps {
  documents: readonly DrawingDocument[];
  /** The panel in the editor. */
  current: number;
  onSelect: (panelIndex: number) => void;
}

/**
 * R65: every panel of the story, numbered, with the drawing so far; a click opens one in the
 * editor. The panel being drawn keeps the thumbnail it had when the player got to it.
 */
export function StoryPanelStrip({ documents, current, onSelect }: StoryPanelStripProps) {
  const total = documents.length;
  const go = (panelIndex: number) => {
    if (panelIndex >= 0 && panelIndex < total) {
      onSelect(panelIndex);
    }
  };

  return (
    <nav aria-label={texts.panels} className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label={texts.previous}
        disabled={current === 0}
        onClick={() => {
          go(current - 1);
        }}
        className="min-h-11 min-w-11 rounded-lg border-comic bg-paper font-display text-2xl disabled:opacity-40"
      >
        {texts.previousArrow}
      </button>
      <ol className="flex min-w-0 flex-1 gap-2 overflow-x-auto p-1">
        {documents.map((document, index) => (
          <li key={index} className="shrink-0">
            <button
              type="button"
              aria-label={texts.panel(index + 1, total)}
              aria-current={index === current ? 'step' : undefined}
              onClick={() => {
                go(index);
              }}
              className={`relative block overflow-hidden rounded border-comic transition-transform hover:scale-105 ${
                index === current ? 'ring-4 ring-pop-yellow' : ''
              }`}
            >
              <PanelThumbnail
                document={document}
                revision={index === current ? null : document.revision}
              />
              <span className="absolute top-0 left-0 rounded-br bg-ink px-1.5 text-xs font-extrabold text-paper">
                {index + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        aria-label={texts.next}
        disabled={current === total - 1}
        onClick={() => {
          go(current + 1);
        }}
        className="min-h-11 min-w-11 rounded-lg border-comic bg-paper font-display text-2xl disabled:opacity-40"
      >
        {texts.nextArrow}
      </button>
    </nav>
  );
}
