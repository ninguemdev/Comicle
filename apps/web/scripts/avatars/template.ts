import {
  ANCHORS,
  ART_SIZE,
  BRUSH,
  FACE_AREA,
  INK,
  PALETTE,
  PNG_ART_SIZE,
  REFERENCE_HEAD,
  SAFE_MARGIN,
  ZONES,
  type Box,
  type Point,
} from './layout';
import { encodeRgbaPng } from './png';
import { Raster, type Paint, type Pen } from './raster';

// The template (_template.svg / _template.png): every zone and anchor of layout.ts, to place
// under the drawing as a guide layer. The PNG has no labels; the guide doc explains the colors.

export type Guide =
  | { kind: 'rect'; box: Box; fill?: Paint; pen?: Pen }
  | { kind: 'ellipse'; center: Point; radiusX: number; radiusY: number; fill?: Paint; pen?: Pen }
  | { kind: 'line'; from: Point; to: Point; pen: Pen }
  | { kind: 'label'; at: Point; text: string; color: string; anchor?: 'start' | 'end' };

const ZONE_FILL_OPACITY = 0.12;
const GUIDE_WIDTH = 1.5;
const DASH = 6;
const LABEL_SIZE = 11;
const CROSS = 8;
const SWATCH = 12;
const SWATCH_GAP = 2;
const SWATCH_COLUMNS = 4;

function zone(box: Box, color: string, filled: boolean): Guide {
  return {
    kind: 'rect',
    box,
    pen: { color, width: GUIDE_WIDTH, dash: DASH },
    ...(filled ? { fill: { color, opacity: ZONE_FILL_OPACITY } } : {}),
  };
}

function circleGuide(center: Point, radius: number, color: string): Guide {
  return {
    kind: 'ellipse',
    center,
    radiusX: radius,
    radiusY: radius,
    pen: { color, width: GUIDE_WIDTH },
  };
}

function cross(center: Point, color: string): Guide[] {
  const pen = { color, width: GUIDE_WIDTH };
  return [
    {
      kind: 'line',
      from: { x: center.x - CROSS, y: center.y },
      to: { x: center.x + CROSS, y: center.y },
      pen,
    },
    {
      kind: 'line',
      from: { x: center.x, y: center.y - CROSS },
      to: { x: center.x, y: center.y + CROSS },
      pen,
    },
  ];
}

function horizontal(y: number, box: Box, color: string): Guide {
  return {
    kind: 'line',
    from: { x: box.left, y },
    to: { x: box.right, y },
    pen: { color, width: GUIDE_WIDTH, dash: DASH },
  };
}

function label(x: number, y: number, text: string, color: string, anchor?: 'end'): Guide {
  return { kind: 'label', at: { x, y }, text, color, ...(anchor ? { anchor } : {}) };
}

/** Color swatches to pick from with the eyedropper, in the free bottom-left corner. */
function swatches(): Guide[] {
  const top = ART_SIZE - SAFE_MARGIN - SWATCH_COLUMNS * (SWATCH + SWATCH_GAP);
  return Object.values(PALETTE).map((color, index) => {
    const left = SAFE_MARGIN + 2 + (index % SWATCH_COLUMNS) * (SWATCH + SWATCH_GAP);
    const row = Math.floor(index / SWATCH_COLUMNS);
    return {
      kind: 'rect',
      box: {
        left,
        top: top + row * (SWATCH + SWATCH_GAP),
        right: left + SWATCH,
        bottom: top + row * (SWATCH + SWATCH_GAP) + SWATCH,
      },
      fill: { color },
      pen: { color: INK, width: 1 },
    };
  });
}

/** The three brush widths, true to scale, in the free bottom-right corner. */
function brushes(): Guide[] {
  return [BRUSH.thick, BRUSH.medium, BRUSH.thin].flatMap((width, index): Guide[] => {
    const y = 442 + index * 22;
    return [
      { kind: 'line', from: { x: 446, y }, to: { x: 486, y }, pen: { color: INK, width } },
      label(438, y + 4, String(width), INK, 'end'),
    ];
  });
}

export const TEMPLATE_GUIDES: readonly Guide[] = [
  {
    kind: 'rect',
    box: { left: 0.5, top: 0.5, right: ART_SIZE - 0.5, bottom: ART_SIZE - 0.5 },
    pen: { color: PALETTE.silver, width: 1 },
  },
  zone(
    {
      left: SAFE_MARGIN,
      top: SAFE_MARGIN,
      right: ART_SIZE - SAFE_MARGIN,
      bottom: ART_SIZE - SAFE_MARGIN,
    },
    PALETTE.gray,
    false,
  ),
  zone(ZONES.hat, PALETTE.purple, true),
  label(22, 32, 'chapéu', PALETTE.purple),
  zone(ZONES.head, PALETTE.blue, false),
  label(ZONES.head.left + 4, ZONES.head.bottom - 6, 'cabeça', PALETTE.blue),
  // Reference head, outlined with the thick brush.
  {
    kind: 'ellipse',
    center: REFERENCE_HEAD.center,
    radiusX: REFERENCE_HEAD.radius,
    radiusY: REFERENCE_HEAD.radius,
    fill: { color: PALETTE.silver, opacity: 0.25 },
    pen: { color: PALETTE.gray, width: BRUSH.thick, opacity: 0.35 },
  },
  {
    kind: 'ellipse',
    center: FACE_AREA.center,
    radiusX: FACE_AREA.radiusX,
    radiusY: FACE_AREA.radiusY,
    pen: { color: PALETTE.blue, width: GUIDE_WIDTH, dash: DASH },
  },
  horizontal(ANCHORS.crownY, ZONES.head, PALETTE.red),
  label(ART_SIZE - SAFE_MARGIN - 2, ANCHORS.crownY - 4, 'topo 120', PALETTE.red, 'end'),
  horizontal(ANCHORS.hatBaseY, ZONES.head, PALETTE.purple),
  label(ART_SIZE - SAFE_MARGIN - 2, ANCHORS.hatBaseY - 4, 'base 180', PALETTE.purple, 'end'),
  zone(ZONES.faceAccessory, PALETTE.green, false),
  label(ZONES.faceAccessory.left + 4, ZONES.faceAccessory.top + 14, 'acessório', PALETTE.green),
  zone(ZONES.eyes, PALETTE.cyan, true),
  label(ZONES.eyes.left + 4, ZONES.eyes.top + 14, 'olhos', PALETTE.cyan),
  circleGuide(ANCHORS.leftEye, ANCHORS.eyeRadius, PALETTE.cyan),
  circleGuide(ANCHORS.rightEye, ANCHORS.eyeRadius, PALETTE.cyan),
  ...cross(ANCHORS.leftEye, PALETTE.cyan),
  ...cross(ANCHORS.rightEye, PALETTE.cyan),
  zone(ZONES.cheeks, PALETTE.pink, false),
  label(ZONES.cheeks.right + 4, ZONES.cheeks.top + 14, 'bochechas', PALETTE.pink),
  {
    kind: 'ellipse',
    center: ANCHORS.leftCheek,
    radiusX: ANCHORS.cheekRadius,
    radiusY: ANCHORS.cheekRadius,
    fill: { color: PALETTE.pink, opacity: 0.2 },
  },
  {
    kind: 'ellipse',
    center: ANCHORS.rightCheek,
    radiusX: ANCHORS.cheekRadius,
    radiusY: ANCHORS.cheekRadius,
    fill: { color: PALETTE.pink, opacity: 0.2 },
  },
  zone(ZONES.mouth, PALETTE.orange, true),
  label(ZONES.mouth.left + 4, ZONES.mouth.bottom - 6, 'boca', PALETTE.orange),
  ...cross(ANCHORS.mouth, PALETTE.orange),
  ...cross(ANCHORS.faceCenter, INK),
  ...swatches(),
  ...brushes(),
];

function svgPaint(prefix: 'fill' | 'stroke', paint: Paint | undefined): string {
  if (!paint) {
    return `${prefix}="none"`;
  }
  const opacity =
    paint.opacity === undefined ? '' : ` ${prefix}-opacity="${String(paint.opacity)}"`;
  return `${prefix}="${paint.color}"${opacity}`;
}

function svgPen(pen: Pen | undefined): string {
  if (!pen) {
    return svgPaint('stroke', undefined);
  }
  const dash = pen.dash === undefined ? '' : ` stroke-dasharray="${String(pen.dash)}"`;
  return `${svgPaint('stroke', pen)} stroke-width="${String(pen.width)}"${dash}`;
}

function guideSvg(guide: Guide): string {
  switch (guide.kind) {
    case 'rect': {
      const { left, top, right, bottom } = guide.box;
      return `<rect x="${String(left)}" y="${String(top)}" width="${String(right - left)}" height="${String(bottom - top)}" ${svgPaint('fill', guide.fill)} ${svgPen(guide.pen)}/>`;
    }
    case 'ellipse':
      return `<ellipse cx="${String(guide.center.x)}" cy="${String(guide.center.y)}" rx="${String(guide.radiusX)}" ry="${String(guide.radiusY)}" ${svgPaint('fill', guide.fill)} ${svgPen(guide.pen)}/>`;
    case 'line':
      return `<line x1="${String(guide.from.x)}" y1="${String(guide.from.y)}" x2="${String(guide.to.x)}" y2="${String(guide.to.y)}" ${svgPen(guide.pen)} stroke-linecap="round"/>`;
    case 'label':
      return `<text x="${String(guide.at.x)}" y="${String(guide.at.y)}" fill="${guide.color}" text-anchor="${guide.anchor ?? 'start'}">${guide.text}</text>`;
    default:
      return guide satisfies never;
  }
}

export function renderTemplateSvg(): string {
  const size = String(ART_SIZE);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="sans-serif" font-size="${String(LABEL_SIZE)}">`,
    '<!-- Gabarito das artes de avatar, gerado por "pnpm avatars:generate". Medidas em docs/avatares-guia-de-artes.md. -->',
    ...TEMPLATE_GUIDES.map(guideSvg),
    '</svg>',
    '',
  ].join('\n');
}

export function renderTemplatePng(): Uint8Array {
  const raster = new Raster(PNG_ART_SIZE, ART_SIZE);
  for (const guide of TEMPLATE_GUIDES) {
    switch (guide.kind) {
      case 'rect':
        if (guide.fill) {
          raster.fillRect(guide.box, guide.fill);
        }
        if (guide.pen) {
          raster.strokeRect(guide.box, guide.pen);
        }
        break;
      case 'ellipse':
        if (guide.fill) {
          raster.fillEllipse(guide.center, guide.radiusX, guide.radiusY, guide.fill);
        }
        if (guide.pen) {
          raster.strokeEllipse(guide.center, guide.radiusX, guide.radiusY, guide.pen);
        }
        break;
      case 'line':
        raster.strokeLine(guide.from, guide.to, guide.pen);
        break;
      case 'label':
        break;
      default:
        guide satisfies never;
    }
  }
  return encodeRgbaPng(PNG_ART_SIZE, PNG_ART_SIZE, raster.pixels);
}
