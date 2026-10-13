// Prunes a folder of downloaded GIFs down to ones usable as a buddy.
// GeoCities is mostly 20x20 bullets, divider bars, and static icons.
//
//   node scripts/filter-buddies.js <dir> [--delete]

const fs = require('fs');
const path = require('path');

const MIN = 60;
const MAX = 400;
const MIN_FRAMES = 2;

const dir = process.argv[2];
const doDelete = process.argv.includes('--delete');

if (!dir) {
  console.error('usage: node scripts/filter-buddies.js <dir> [--delete]');
  process.exit(1);
}

const keep = [];
const drop = [];

for (const file of fs.readdirSync(dir).filter((f) => /\.gif$/i.test(f))) {
  const full = path.join(dir, file);
  const buf = fs.readFileSync(full);

  const sig = buf.slice(0, 6).toString('ascii');
  if (sig !== 'GIF87a' && sig !== 'GIF89a') {
    drop.push([file, 'not a gif']);
    continue;
  }

  const w = buf.readUInt16LE(6);
  const h = buf.readUInt16LE(8);

  // Graphic Control Extension blocks stand in for a frame count. Close
  // enough to tell an animation from a static icon.
  let frames = 0;
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xf9) frames++;
  }

  if (w < MIN || h < MIN) drop.push([file, `too small ${w}x${h}`]);
  else if (w > MAX || h > MAX) drop.push([file, `too big ${w}x${h}`]);
  else if (frames < MIN_FRAMES) drop.push([file, 'not animated']);
  else keep.push([file, `${w}x${h}`, `${frames}f`]);
}

keep.forEach((k) => console.log(`  keep  ${k.join('  ')}`));
console.log(`\n${keep.length} kept, ${drop.length} rejected`);

if (doDelete) {
  drop.forEach(([f]) => fs.unlinkSync(path.join(dir, f)));
  console.log(`deleted ${drop.length}`);
}
