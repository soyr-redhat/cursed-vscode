// Generates icon.png, the 128x128 extension icon, with no dependencies.
// Four clashing quadrants, a black "C" ring, and neon confetti.
// Run: node scripts/make-icon.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 128;

const MAGENTA = [0xff, 0x00, 0xff];
const LIME = [0x00, 0xff, 0x00];
const CYAN = [0x00, 0xff, 0xff];
const YELLOW = [0xff, 0xff, 0x00];
const BLACK = [0x00, 0x00, 0x00];
const WHITE = [0xff, 0xff, 0xff];
const RED = [0xff, 0x00, 0x00];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Deterministic noise so the confetti is identical on every rebuild. */
function noise(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pixel(x, y) {
  const edge = 5;
  if (x < edge || y < edge || x >= SIZE - edge || y >= SIZE - edge) return BLACK;

  const cx = (SIZE - 1) / 2;
  const cy = (SIZE - 1) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  // The "C": an annulus with a wedge removed from the right side.
  const inRing = r >= 30 && r <= 50;
  const inWedge = angle > -0.62 && angle < 0.62;
  if (inRing && !inWedge) return BLACK;

  // Confetti, kept off the ring so the letter stays readable.
  const n = noise(x, y);
  if (n > 0.965) return WHITE;
  if (n < 0.018) return RED;

  const right = x >= SIZE / 2;
  const bottom = y >= SIZE / 2;
  if (!right && !bottom) return MAGENTA;
  if (right && !bottom) return LIME;
  if (!right && bottom) return CYAN;
  return YELLOW;
}

const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
let o = 0;
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0; // filter type: none
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b] = pixel(x, y);
    raw[o++] = r;
    raw[o++] = g;
    raw[o++] = b;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: truecolor
ihdr[10] = 0; // deflate
ihdr[11] = 0; // adaptive filtering
ihdr[12] = 0; // no interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(__dirname, '..', 'icon.png');
fs.writeFileSync(out, png);
console.log(`wrote ${out} (${SIZE}x${SIZE}, ${png.length} bytes)`);
