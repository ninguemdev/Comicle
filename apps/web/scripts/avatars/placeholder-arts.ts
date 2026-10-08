import type { AvatarCategory } from '@comicle/shared';

import { ANCHORS, BRUSH, PALETTE, REFERENCE_HEAD, type Point } from './layout';
import {
  arc,
  circle,
  ellipse,
  heart,
  mirror,
  parametric,
  polar,
  quadratic,
  roundedRect,
  spiral,
} from './shapes';
import { Sketch } from './sketch';

// Placeholder arts (docs/avatares.md §5). Each one draws on the anchors of layout.ts, so any
// combination lines up; the definitive arts replace them file by file.

export interface PlaceholderArt {
  id: string;
  category: AvatarCategory;
  draw(sketch: Sketch): void;
}

const { leftEye, rightEye, leftCheek, rightCheek } = ANCHORS;
const EYES = [leftEye, rightEye] as const;
const CHEEKS = [leftCheek, rightCheek] as const;
const CENTER_X = ANCHORS.faceCenter.x;
const MEDIUM = { width: BRUSH.medium };
const THIN = { width: BRUSH.thin };

function offset(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy };
}

/** Same detail on both cheeks, mirrored for the right one. */
function onBothCheeks(draw: (cheek: Point, side: 1 | -1) => void): void {
  draw(leftCheek, -1);
  draw(rightCheek, 1);
}

const heads: PlaceholderArt[] = [
  {
    id: 'head-round',
    category: 'head',
    draw: (sketch) =>
      sketch.shape(circle(REFERENCE_HEAD.center, REFERENCE_HEAD.radius), { fill: PALETTE.yellow }),
  },
  {
    id: 'head-square',
    category: 'head',
    draw: (sketch) =>
      sketch.shape(roundedRect({ left: 100, top: 120, right: 412, bottom: 448 }, 64), {
        fill: PALETTE.orange,
      }),
  },
  {
    id: 'head-oval',
    category: 'head',
    draw: (sketch) =>
      sketch.shape(ellipse({ x: CENTER_X, y: 290 }, 148, 170), { fill: PALETTE.skin }),
  },
  {
    id: 'head-pear',
    category: 'head',
    draw: (sketch) =>
      sketch.shape(
        parametric((t) => {
          const angle = t * Math.PI * 2;
          // Narrow at the top, wide at the bottom.
          const radiusX = 146 - 30 * Math.cos(angle);
          return { x: CENTER_X + radiusX * Math.sin(angle), y: 290 - 170 * Math.cos(angle) };
        }),
        { fill: PALETTE.green },
      ),
  },
  {
    id: 'head-cloud',
    category: 'head',
    draw: (sketch) =>
      sketch.shape(
        polar({ x: CENTER_X, y: 286 }, (angle) => 150 + 16 * Math.abs(Math.cos(3 * angle))),
        { fill: PALETTE.cyan },
      ),
  },
];

const eyes: PlaceholderArt[] = [
  {
    id: 'eyes-dots',
    category: 'eyes',
    draw: (sketch) => {
      for (const eye of EYES) {
        sketch.blob(circle(eye, 15), PALETTE.black);
      }
    },
  },
  {
    id: 'eyes-wide',
    category: 'eyes',
    draw: (sketch) => {
      for (const eye of EYES) {
        sketch.shape(circle(eye, 34), { fill: PALETTE.white, stroke: MEDIUM }, () => {
          sketch.blob(circle(offset(eye, 4, 6), 14), PALETTE.black);
          sketch.blob(circle(offset(eye, -1, 1), 4.5), PALETTE.white);
        });
      }
    },
  },
  {
    id: 'eyes-sleepy',
    category: 'eyes',
    draw: (sketch) => {
      for (const eye of EYES) {
        sketch.shape(arc(eye, 34, 30, 0, 180), { fill: PALETTE.white, stroke: MEDIUM }, () => {
          sketch.blob(circle(offset(eye, 0, 14), 12), PALETTE.black);
        });
        sketch.line([offset(eye, -40, -3), offset(eye, 40, 3)]);
      }
    },
  },
  {
    id: 'eyes-happy',
    category: 'eyes',
    draw: (sketch) => {
      for (const eye of EYES) {
        sketch.line(arc(offset(eye, 0, 12), 30, 26, 180, 360));
      }
    },
  },
  {
    id: 'eyes-angry',
    category: 'eyes',
    draw: (sketch) => {
      for (const [eye, side] of [
        [leftEye, 1],
        [rightEye, -1],
      ] as const) {
        sketch.shape(circle(eye, 30), { fill: PALETTE.white, stroke: MEDIUM }, () => {
          sketch.blob(circle(offset(eye, 6 * side, 6), 12), PALETTE.black);
        });
        // Brows slope down towards the nose.
        sketch.line([offset(eye, -38 * side, -42), offset(eye, 36 * side, -22)]);
      }
    },
  },
];

const mouths: PlaceholderArt[] = [
  {
    id: 'mouth-smile',
    category: 'mouth',
    draw: (sketch) => sketch.line(arc({ x: CENTER_X, y: 330 }, 64, 44, 160, 20)),
  },
  {
    id: 'mouth-open',
    category: 'mouth',
    draw: (sketch) =>
      sketch.shape(arc({ x: CENTER_X, y: 334 }, 58, 56, 0, 180), { fill: PALETTE.black }, () => {
        sketch.blob(ellipse({ x: CENTER_X, y: 380 }, 30, 14), PALETTE.pink);
      }),
  },
  {
    id: 'mouth-flat',
    category: 'mouth',
    draw: (sketch) =>
      sketch.line([
        { x: 206, y: 352 },
        { x: 306, y: 346 },
      ]),
  },
  {
    id: 'mouth-tongue',
    category: 'mouth',
    draw: (sketch) => {
      sketch.shape(
        arc({ x: 284, y: 366 }, 22, 26, 0, 180),
        { fill: PALETTE.pink, stroke: MEDIUM },
        () => {
          sketch.line(
            [
              { x: 284, y: 370 },
              { x: 284, y: 382 },
            ],
            THIN,
          );
        },
      );
      sketch.line(arc({ x: CENTER_X, y: 330 }, 64, 40, 160, 20));
    },
  },
  {
    id: 'mouth-teeth',
    category: 'mouth',
    draw: (sketch) => {
      sketch.shape(
        roundedRect({ left: 232, top: 354, right: 280, bottom: 388 }, 6),
        { fill: PALETTE.white, stroke: MEDIUM },
        () => {
          sketch.line(
            [
              { x: CENTER_X, y: 362 },
              { x: CENTER_X, y: 384 },
            ],
            THIN,
          );
        },
      );
      sketch.line(arc({ x: CENTER_X, y: 326 }, 70, 36, 160, 20));
    },
  },
];

const cheeks: PlaceholderArt[] = [
  {
    id: 'cheeks-blush',
    category: 'cheeks',
    draw: (sketch) => {
      for (const cheek of CHEEKS) {
        sketch.blob(ellipse(cheek, 30, 18), PALETTE.pink);
      }
    },
  },
  {
    id: 'cheeks-freckles',
    category: 'cheeks',
    draw: (sketch) => {
      onBothCheeks((cheek, side) => {
        for (const [dx, dy] of [
          [-14, -8],
          [4, -12],
          [-4, 6],
          [14, 4],
        ] as const) {
          sketch.blob(circle(offset(cheek, dx * side, dy), 5), PALETTE.darkBrown);
        }
      });
    },
  },
  {
    id: 'cheeks-swirls',
    category: 'cheeks',
    draw: (sketch) => {
      onBothCheeks((cheek, side) => {
        const turns = spiral(cheek, 24, 2);
        sketch.line(side === 1 ? turns : mirror(turns, cheek.x), { ...MEDIUM, color: PALETTE.red });
      });
    },
  },
  {
    id: 'cheeks-hearts',
    category: 'cheeks',
    draw: (sketch) => {
      for (const cheek of CHEEKS) {
        sketch.shape(heart(cheek, 40), { fill: PALETTE.red, stroke: MEDIUM });
      }
    },
  },
  {
    id: 'cheeks-stripes',
    category: 'cheeks',
    draw: (sketch) => {
      for (const cheek of CHEEKS) {
        for (const shift of [-18, 0, 18]) {
          sketch.line([offset(cheek, shift - 6, 14), offset(cheek, shift + 6, -14)], {
            ...MEDIUM,
            color: PALETTE.red,
          });
        }
      }
    },
  },
];

/** Temple arms of glasses, from the outer edge of each lens to the side of the head. */
function templeArms(sketch: Sketch): void {
  sketch.line(
    [
      { x: 146, y: 244 },
      { x: 98, y: 230 },
    ],
    MEDIUM,
  );
  sketch.line(
    [
      { x: 366, y: 244 },
      { x: 414, y: 230 },
    ],
    MEDIUM,
  );
}

/** Right half of the mustache, from the middle of the top edge to the middle of the bottom. */
const MUSTACHE_HALF: Point[] = [
  { x: 256, y: 306 },
  { x: 286, y: 298 },
  { x: 318, y: 304 },
  { x: 342, y: 298 },
  { x: 358, y: 284 },
  { x: 356, y: 306 },
  { x: 334, y: 324 },
  { x: 298, y: 330 },
  { x: 268, y: 326 },
  { x: 256, y: 320 },
];

const faceAccessories: PlaceholderArt[] = [
  {
    id: 'face-accessory-glasses',
    category: 'faceAccessory',
    draw: (sketch) => {
      templeArms(sketch);
      for (const eye of EYES) {
        sketch.shape(circle(eye, 50), { stroke: MEDIUM });
      }
      sketch.line(quadratic({ x: 246, y: 250 }, { x: 256, y: 236 }, { x: 266, y: 250 }), MEDIUM);
    },
  },
  {
    id: 'face-accessory-sunglasses',
    category: 'faceAccessory',
    draw: (sketch) => {
      templeArms(sketch);
      for (const eye of EYES) {
        const lens = { left: eye.x - 52, top: 214, right: eye.x + 52, bottom: 290 };
        sketch.shape(roundedRect(lens, 24), { fill: PALETTE.black, stroke: MEDIUM }, () => {
          sketch.line([offset(eye, -32, -20), offset(eye, -12, -20)], {
            ...THIN,
            color: PALETTE.white,
          });
        });
      }
      sketch.line(
        [
          { x: 248, y: 236 },
          { x: 264, y: 236 },
        ],
        MEDIUM,
      );
    },
  },
  {
    id: 'face-accessory-mustache',
    category: 'faceAccessory',
    draw: (sketch) => {
      const leftHalf = mirror(MUSTACHE_HALF, CENTER_X).reverse().slice(1, -1);
      sketch.shape([...MUSTACHE_HALF, ...leftHalf], { fill: PALETTE.darkBrown, stroke: MEDIUM });
    },
  },
  {
    id: 'face-accessory-eyepatch',
    category: 'faceAccessory',
    draw: (sketch) => {
      sketch.line(
        [
          { x: 110, y: 188 },
          { x: 300, y: 236 },
          { x: 418, y: 270 },
        ],
        MEDIUM,
      );
      sketch.shape(ellipse(offset(rightEye, 0, 2), 46, 40), {
        fill: PALETTE.black,
        stroke: MEDIUM,
      });
    },
  },
  {
    id: 'face-accessory-monocle',
    category: 'faceAccessory',
    draw: (sketch) => {
      sketch.line(quadratic({ x: 346, y: 292 }, { x: 360, y: 410 }, { x: 412, y: 360 }), {
        ...THIN,
        color: PALETTE.gray,
      });
      sketch.shape(circle(rightEye, 44), { stroke: { ...THIN, color: PALETTE.yellow } });
      sketch.shape(circle(rightEye, 52), { stroke: MEDIUM });
    },
  },
];

const CROWN_TIPS = [
  { x: 144, y: 82 },
  { x: CENTER_X, y: 58 },
  { x: 368, y: 82 },
] as const;

const hats: PlaceholderArt[] = [
  {
    id: 'hat-cap',
    category: 'hat',
    draw: (sketch) => {
      sketch.shape(circle({ x: CENTER_X, y: 64 }, 12), { fill: PALETTE.red, stroke: MEDIUM });
      sketch.shape(arc({ x: CENTER_X, y: 186 }, 160, 112, 180, 360), { fill: PALETTE.red }, () => {
        sketch.line(
          quadratic({ x: 200, y: 186 }, { x: 214, y: 100 }, { x: CENTER_X, y: 76 }),
          THIN,
        );
        sketch.line(
          quadratic({ x: 312, y: 186 }, { x: 298, y: 100 }, { x: CENTER_X, y: 76 }),
          THIN,
        );
      });
      sketch.shape(
        [
          { x: 240, y: 176 },
          { x: 452, y: 176 },
          { x: 478, y: 190 },
          { x: 456, y: 206 },
          { x: 240, y: 204 },
        ],
        { fill: PALETTE.red },
      );
    },
  },
  {
    id: 'hat-top',
    category: 'hat',
    draw: (sketch) => {
      sketch.shape(
        [
          { x: 178, y: 40 },
          { x: 334, y: 40 },
          { x: 328, y: 176 },
          { x: 184, y: 176 },
        ],
        { fill: PALETTE.black },
        () => {
          sketch.blob(
            [
              { x: 182, y: 136 },
              { x: 330, y: 136 },
              { x: 329, y: 166 },
              { x: 183, y: 166 },
            ],
            PALETTE.red,
          );
        },
      );
      sketch.shape(ellipse({ x: CENTER_X, y: 182 }, 150, 20), { fill: PALETTE.black });
    },
  },
  {
    id: 'hat-beanie',
    category: 'hat',
    draw: (sketch) => {
      sketch.shape(arc({ x: CENTER_X, y: 190 }, 156, 128, 180, 360), { fill: PALETTE.blue }, () => {
        for (const x of [196, CENTER_X, 316]) {
          sketch.line(
            [
              { x, y: 100 },
              { x, y: 170 },
            ],
            { ...THIN, color: PALETTE.indigo },
          );
        }
      });
      sketch.shape(roundedRect({ left: 96, top: 160, right: 416, bottom: 206 }, 20), {
        fill: PALETTE.indigo,
      });
      sketch.shape(circle({ x: CENTER_X, y: 58 }, 26), { fill: PALETTE.white, stroke: MEDIUM });
    },
  },
  {
    id: 'hat-crown',
    category: 'hat',
    draw: (sketch) => {
      const [leftTip, middleTip, rightTip] = CROWN_TIPS;
      sketch.shape(
        [
          { x: 150, y: 176 },
          leftTip,
          { x: 200, y: 128 },
          middleTip,
          { x: 312, y: 128 },
          rightTip,
          { x: 362, y: 176 },
        ],
        { fill: PALETTE.yellow },
        () => {
          sketch.blob(circle({ x: CENTER_X, y: 150 }, 12), PALETTE.red);
          sketch.blob(circle({ x: 200, y: 154 }, 9), PALETTE.cyan);
          sketch.blob(circle({ x: 312, y: 154 }, 9), PALETTE.cyan);
        },
      );
      for (const tip of CROWN_TIPS) {
        sketch.shape(circle(tip, 10), { fill: PALETTE.yellow, stroke: MEDIUM });
      }
    },
  },
  {
    id: 'hat-party',
    category: 'hat',
    draw: (sketch) => {
      sketch.shape(
        [
          { x: CENTER_X, y: 40 },
          { x: 330, y: 176 },
          { x: 182, y: 176 },
        ],
        { fill: PALETTE.purple },
        () => {
          sketch.blob(circle({ x: CENTER_X, y: 88 }, 8), PALETTE.yellow);
          sketch.blob(circle({ x: 232, y: 136 }, 9), PALETTE.yellow);
          sketch.blob(circle({ x: 282, y: 152 }, 9), PALETTE.yellow);
        },
      );
      sketch.shape(circle({ x: CENTER_X, y: 42 }, 18), { fill: PALETTE.yellow, stroke: MEDIUM });
    },
  },
];

export const PLACEHOLDER_ARTS: readonly PlaceholderArt[] = [
  ...heads,
  ...cheeks,
  ...eyes,
  ...mouths,
  ...faceAccessories,
  ...hats,
];

export function drawPlaceholder(art: PlaceholderArt): Sketch {
  const sketch = new Sketch(art.id);
  art.draw(sketch);
  return sketch;
}
