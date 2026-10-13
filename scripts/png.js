// Minimal PNG encoder. No dependencies, RGB or RGBA, with 2x supersampling
// so the procedurally drawn art does not come out jagged.

const zlib = require('zlib');

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

/**
 * `pixel(x, y)` returns [r, g, b] or [r, g, b, a], or null for transparent.
 * Coordinates are floats when supersampling, so draw with real math rather
 * than integer comparisons.
 */
function encode(width, height, pixel, options = {}) {
  const { alpha = false, samples = 2 } = options;
  const channels = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * channels + 1) * height);
  const step = 1 / samples;
  const total = samples * samples;

  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const p = pixel(x + (sx + 0.5) * step, y + (sy + 0.5) * step);
          if (!p) continue;
          const pa = p.length > 3 ? p[3] : 255;
          // Premultiply so transparent edges do not fringe toward black.
          r += p[0] * pa;
          g += p[1] * pa;
          b += p[2] * pa;
          a += pa;
        }
      }
      if (a === 0) {
        raw[o++] = 0;
        raw[o++] = 0;
        raw[o++] = 0;
        if (alpha) raw[o++] = 0;
        continue;
      }
      raw[o++] = Math.round(r / a);
      raw[o++] = Math.round(g / a);
      raw[o++] = Math.round(b / a);
      if (alpha) raw[o++] = Math.round(a / total);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

module.exports = { encode };
