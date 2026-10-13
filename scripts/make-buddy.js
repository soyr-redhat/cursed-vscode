// Generates the buddy sprite frames into media/, with no image dependencies.
// Four frames, cycled on a timer by src/buddy.js to fake animation:
// eyes centered, eyes left, blinking, eyes right. Each frame also bobs
// vertically so the thing looks alive rather than pasted on.
//
// Run: node scripts/make-buddy.js

const fs = require('fs');
const path = require('path');
const { encode } = require('./png');

const SIZE = 160;

const FUR = [0x8b, 0x2f, 0xc9];
const FUR_DARK = [0x5f, 0x1c, 0x8c];
const MUZZLE = [0xe2, 0xb6, 0xf5];
const EAR_INNER = [0xff, 0x8f, 0xd4];
const WHITE = [0xff, 0xff, 0xff];
const BLACK = [0x10, 0x04, 0x18];
const SHINE = [0xff, 0xff, 0xff];

const FRAMES = [
  { pupil: 0, bob: 0, blink: false, brow: 0 },
  { pupil: -3.5, bob: -2, blink: false, brow: -1.5 },
  { pupil: 0, bob: 0, blink: true, brow: 1 },
  { pupil: 3.5, bob: -2, blink: false, brow: -1.5 }
];

function ellipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function draw(frame) {
  return (x, y) => {
    const yy = y - frame.bob;

    // Body, mostly running off the bottom edge so it reads as a torso.
    if (ellipse(x, yy, 80, 150, 50, 38)) {
      if (ellipse(x, yy, 80, 156, 30, 26)) return MUZZLE;
      return FUR;
    }

    // Ears.
    for (const ex of [34, 126]) {
      if (ellipse(x, yy, ex, 60, 16, 18)) {
        return ellipse(x, yy, ex, 60, 8, 10) ? EAR_INNER : FUR_DARK;
      }
    }

    // Head.
    if (ellipse(x, yy, 80, 66, 48, 46)) {
      // Muzzle.
      if (ellipse(x, yy, 80, 90, 32, 22)) {
        // Mouth: a wide arc, open in a way that suggests unwanted advice.
        if (ellipse(x, yy, 80, 88, 20, 14) && yy > 88) return BLACK;
        // Nostrils.
        if (ellipse(x, yy, 71, 84, 3.5, 2.5)) return FUR_DARK;
        if (ellipse(x, yy, 89, 84, 3.5, 2.5)) return FUR_DARK;
        return MUZZLE;
      }

      // Brows, angled inward so it always looks slightly disappointed.
      for (const [bx, dir] of [[58, 1], [102, -1]]) {
        const browY = 42 + frame.brow + dir * (x - bx) * 0.18;
        if (Math.abs(yy - browY) < 4 && Math.abs(x - bx) < 17) return FUR_DARK;
      }

      // Eyes.
      for (const ex of [58, 102]) {
        if (frame.blink) {
          if (Math.abs(yy - 58) < 2.5 && Math.abs(x - ex) < 13) return BLACK;
          continue;
        }
        if (ellipse(x, yy, ex, 58, 14, 15)) {
          const px = ex + frame.pupil;
          if (ellipse(x, yy, px, 59, 6, 6.5)) {
            if (ellipse(x, yy, px - 2, 56, 2, 2)) return SHINE;
            return BLACK;
          }
          return WHITE;
        }
      }

      return FUR;
    }

    return null; // transparent
  };
}

const outDir = path.join(__dirname, '..', 'media');
fs.mkdirSync(outDir, { recursive: true });

FRAMES.forEach((frame, i) => {
  const png = encode(SIZE, SIZE, draw(frame), { alpha: true, samples: 3 });
  const file = path.join(outDir, `buddy-${i}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${SIZE}x${SIZE}, ${png.length} bytes)`);
});
