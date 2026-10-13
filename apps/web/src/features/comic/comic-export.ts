import type { ArtistRef, PanelRef } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';
import { loadImage } from '../drawing/load-image';
import { computeComicLayout, type MaxColumns } from './compute-comic-layout';
import type { PanelImageLoader } from './use-panel-image';

// The whole story as one PNG to keep (interface.md §5, "Baixar HQ"): drawn on a canvas in the
// light theme like a printed comic, with the theme as its title, the panels glued together and
// the credits in a footer.

export interface ComicStory {
  theme: { text: string; author: ArtistRef };
  panels: readonly PanelRef[];
}

/** Sizes of the exported page, in pixels of the PNG. */
export const COMIC_EXPORT = {
  /** Half the drawn panel (1024×768): sharp enough, and a 12-panel page stays under ~2 MB. */
  panelWidth: 512,
  panelHeight: 384,
  margin: 48,
  themeLine: 64,
  maxThemeLines: 4,
  themeGap: 8,
  author: 40,
  headerGap: 32,
  /** Space between the panels and the credits. */
  creditsGap: 24,
  creditLine: 32,
  maxCreditLines: 3,
  footer: 56,
} as const;

/** The light-theme tokens of interface.md §1: a file keeps the same look on any screen. */
const COLORS = {
  paper: '#FFFBF0',
  ink: '#16161D',
  muted: '#5B5B66',
  badge: '#FFD23F',
  halftone: 'rgba(22, 22, 29, 0.12)',
} as const;

const FONTS = {
  theme: '56px Bangers, Impact, sans-serif',
  number: '24px Bangers, Impact, sans-serif',
  footer: '28px Bangers, Impact, sans-serif',
  author: '600 26px "Nunito Variable", Nunito, sans-serif',
  credits: '600 22px "Nunito Variable", Nunito, sans-serif',
  placeholder: 'bold 24px "Nunito Variable", Nunito, sans-serif',
} as const;

const ELLIPSIS = '…';
const HALFTONE_STEP = 16;
const HALFTONE_DOT = 2;
const BADGE_RADIUS = 18;
/** Gap between the badge and the corner of the panel. */
const BADGE_INSET = 10;
const BORDER_WIDTH = 4;
const PLACEHOLDER_PADDING = 32;
const PLACEHOLDER_LINE = 32;
const PLACEHOLDER_MAX_LINES = 3;
const FULL_TURN = Math.PI * 2;

/** Columns of the exported page: like the full view on a wide screen (interface.md §3). */
export function exportColumns(panelCount: number): MaxColumns {
  if (panelCount <= 1) {
    return 1;
  }
  return panelCount === 2 || panelCount === 4 ? 2 : 3;
}

/** Width of the panels area: the theme and the credits wrap to it. */
export function exportContentWidth(panelCount: number): number {
  return exportColumns(panelCount) * COMIC_EXPORT.panelWidth;
}

export interface ComicExportPlan {
  width: number;
  height: number;
  /** Top of each line of the theme, centered horizontally. */
  themeTops: number[];
  authorTop: number;
  /** Top-left corner of each panel, in reading order; neighbors share an edge. */
  panels: { x: number; y: number }[];
  /** Top of each line of the credits, centered horizontally. */
  creditTops: number[];
  footerTop: number;
}

/**
 * Where everything goes on a page with `panelCount` panels, a theme of `themeLines` lines and
 * credits of `creditLines` lines. Panels touch, as in a printed comic; a shorter last row is
 * centered, its panels still touching.
 */
export function planComicExport(
  panelCount: number,
  themeLines: number,
  creditLines: number,
): ComicExportPlan {
  const e = COMIC_EXPORT;
  const contentWidth = exportContentWidth(panelCount);
  const themeTops = Array.from({ length: themeLines }, (_, line) => e.margin + line * e.themeLine);
  const authorTop = e.margin + themeLines * e.themeLine + e.themeGap;
  let y = authorTop + e.author + e.headerGap;
  const panels: ComicExportPlan['panels'] = [];
  for (const count of computeComicLayout(panelCount, exportColumns(panelCount))) {
    const left = e.margin + (contentWidth - count * e.panelWidth) / 2;
    for (let index = 0; index < count; index++) {
      panels.push({ x: left + index * e.panelWidth, y });
    }
    y += e.panelHeight;
  }
  const creditsTop = y + e.creditsGap;
  const creditTops = Array.from(
    { length: creditLines },
    (_, line) => creditsTop + line * e.creditLine,
  );
  const footerTop = creditsTop + creditLines * e.creditLine;
  return {
    width: contentWidth + 2 * e.margin,
    height: footerTop + e.footer + e.margin,
    themeTops,
    authorTop,
    panels,
    creditTops,
    footerTop,
  };
}

/** R55 for the whole page at once: "Quadros: 1 Ana · 2 Bia", in reading order. */
export function comicCredits(panels: readonly PanelRef[]): string {
  return strings.comic.exportCredits(
    [...panels]
      .sort((a, b) => a.position - b.position)
      .map((panel) => `${String(panel.position + 1)} ${panel.artist.nickname}`),
  );
}

/** Cuts `text` to fit `width` (as `measure` sees it), ending with "…" when it ran out. */
function fitWithEllipsis(text: string, width: number, measure: (text: string) => number): string {
  if (measure(text) <= width) {
    return text;
  }
  let cut = text;
  while (cut.length > 0 && measure(`${cut}${ELLIPSIS}`) > width) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}${ELLIPSIS}`;
}

/**
 * Lines of at most `width`, broken between words (a word too long for a line is broken where it
 * must); past `maxLines`, the last line ends with "…".
 */
export function wrapText(
  text: string,
  width: number,
  measure: (text: string) => number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter((part) => part.length > 0)) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (measure(candidate) <= width) {
      line = candidate;
      continue;
    }
    if (line !== '') {
      lines.push(line);
    }
    line = word;
    while (measure(line) > width && line.length > 1) {
      let fits = line.length - 1;
      while (fits > 1 && measure(line.slice(0, fits)) > width) {
        fits--;
      }
      lines.push(line.slice(0, fits));
      line = line.slice(fits);
    }
  }
  if (line !== '') {
    lines.push(line);
  }
  if (lines.length <= maxLines) {
    return lines;
  }
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitWithEllipsis(`${kept[maxLines - 1] ?? ''}${ELLIPSIS}`, width, measure);
  return kept;
}

const COMBINING_MARKS = /[̀-ͯ]/g;
const MAX_SLUG_LENGTH = 40;

/** `comicle-2-um-gato-prefeito.png`: the story number and its theme, safe in any file system. */
export function comicFileName(themeText: string, storyNumber: number): string {
  const slug = themeText
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');
  return `comicle-${String(storyNumber)}-${slug === '' ? 'historia' : slug}.png`;
}

type PanelPicture =
  { kind: 'image'; image: HTMLImageElement } | { kind: 'empty' } | { kind: 'failed' };

async function loadPicture(
  panel: PanelRef,
  loader: PanelImageLoader,
  signal: AbortSignal,
): Promise<PanelPicture> {
  if (panel.status === 'empty') {
    return { kind: 'empty' };
  }
  try {
    const url = URL.createObjectURL(await loader(panel.panelId, signal));
    try {
      return { kind: 'image', image: await loadImage(url) };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    // One missing picture should not cost the whole page: it gets the placeholder.
    return { kind: 'failed' };
  }
}

function drawCentered(ctx: CanvasRenderingContext2D, text: string, centerX: number, top: number) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, centerX, top);
}

function drawHalftone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { panelWidth, panelHeight } = COMIC_EXPORT;
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.fillStyle = COLORS.halftone;
  for (let dotY = HALFTONE_STEP / 2; dotY < panelHeight; dotY += HALFTONE_STEP) {
    for (let dotX = HALFTONE_STEP / 2; dotX < panelWidth; dotX += HALFTONE_STEP) {
      ctx.beginPath();
      ctx.arc(x + dotX, y + dotY, HALFTONE_DOT, 0, FULL_TURN);
      ctx.fill();
    }
  }
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  panel: PanelRef,
  picture: PanelPicture,
  at: { x: number; y: number },
) {
  const { panelWidth, panelHeight } = COMIC_EXPORT;
  const centerX = at.x + panelWidth / 2;
  if (picture.kind === 'image') {
    ctx.drawImage(picture.image, at.x, at.y, panelWidth, panelHeight);
  } else {
    drawHalftone(ctx, at.x, at.y);
    const message =
      picture.kind === 'empty'
        ? strings.comic.notDrawn(panel.artist.nickname)
        : strings.comic.loadFailed;
    ctx.font = FONTS.placeholder;
    ctx.fillStyle = COLORS.muted;
    const measure = (text: string) => ctx.measureText(text).width;
    const lines = wrapText(
      message,
      panelWidth - 2 * PLACEHOLDER_PADDING,
      measure,
      PLACEHOLDER_MAX_LINES,
    );
    const top = at.y + (panelHeight - lines.length * PLACEHOLDER_LINE) / 2;
    lines.forEach((line, index) => {
      drawCentered(ctx, line, centerX, top + index * PLACEHOLDER_LINE);
    });
  }
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeRect(at.x, at.y, panelWidth, panelHeight);

  // The panel number, as on the page in the game.
  const badgeX = at.x + BADGE_RADIUS + BADGE_INSET;
  const badgeY = at.y + BADGE_RADIUS + BADGE_INSET;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, BADGE_RADIUS, 0, FULL_TURN);
  ctx.fillStyle = COLORS.badge;
  ctx.fill();
  ctx.lineWidth = BORDER_WIDTH - 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.font = FONTS.number;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(panel.position + 1), badgeX, badgeY + 1);
}

/** Waits for the game fonts, so the canvas does not fall back to the system ones. */
async function fontsReady(): Promise<void> {
  if (typeof document.fonts === 'undefined') {
    return;
  }
  await Promise.all(
    [FONTS.theme, FONTS.author, FONTS.credits, FONTS.placeholder].map((font) =>
      document.fonts.load(font).catch(() => []),
    ),
  );
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('O navegador não gerou o PNG da HQ'));
      }
    }, 'image/png');
  });
}

/** The story as one PNG page: theme on top, the numbered panels glued together, the credits. */
export async function exportComicPng(
  story: ComicStory,
  loader: PanelImageLoader,
  signal: AbortSignal,
): Promise<Blob> {
  const panels = [...story.panels].sort((a, b) => a.position - b.position);
  const [pictures] = await Promise.all([
    Promise.all(panels.map((panel) => loadPicture(panel, loader, signal))),
    fontsReady(),
  ]);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    throw new Error('Canvas 2D indisponível neste navegador');
  }

  const contentWidth = exportContentWidth(panels.length);
  const measure = (text: string) => ctx.measureText(text).width;
  ctx.font = FONTS.theme;
  const themeLines = wrapText(story.theme.text, contentWidth, measure, COMIC_EXPORT.maxThemeLines);
  ctx.font = FONTS.credits;
  const creditLines = wrapText(
    comicCredits(panels),
    contentWidth,
    measure,
    COMIC_EXPORT.maxCreditLines,
  );
  const plan = planComicExport(panels.length, themeLines.length, creditLines.length);
  // Resizing resets the context, so it comes after measuring.
  canvas.width = plan.width;
  canvas.height = plan.height;
  const centerX = plan.width / 2;

  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, plan.width, plan.height);

  ctx.fillStyle = COLORS.ink;
  ctx.font = FONTS.theme;
  themeLines.forEach((line, index) => {
    drawCentered(ctx, line, centerX, plan.themeTops[index] ?? 0);
  });
  ctx.fillStyle = COLORS.muted;
  ctx.font = FONTS.author;
  drawCentered(
    ctx,
    strings.match.presentation.themeBy(story.theme.author.nickname),
    centerX,
    plan.authorTop,
  );

  panels.forEach((panel, index) => {
    const at = plan.panels[index];
    const picture = pictures[index];
    if (at && picture) {
      drawPanel(ctx, panel, picture, at);
    }
  });

  ctx.fillStyle = COLORS.muted;
  ctx.font = FONTS.credits;
  creditLines.forEach((line, index) => {
    drawCentered(ctx, line, centerX, plan.creditTops[index] ?? 0);
  });
  ctx.font = FONTS.footer;
  drawCentered(ctx, strings.comic.exportFooter, centerX, plan.footerTop + COMIC_EXPORT.creditsGap);

  return canvasToPng(canvas);
}
