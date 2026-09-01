/**
 * Generates the Phase 1 spike atlases as real PNG files, pixel by pixel.
 * Deterministic and dependency-free: draws into RGBA buffers and encodes
 * PNG chunks manually (IHDR/IDAT/IEND, zlib via node:zlib).
 *
 * Run: node scripts/generate-spike-atlases.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'atlases',
);
const T = 16; // tile/frame size in pixels

// ---------------------------------------------------------------------------
// Minimal PNG encoder (RGBA8, no filtering)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
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

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Tiny pixel canvas
// ---------------------------------------------------------------------------

function makeCanvas(w, h) {
  return { w, h, px: Buffer.alloc(w * h * 4) };
}

function setPx(c, x, y, hex, alpha = 255) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.px[i] = (hex >> 16) & 0xff;
  c.px[i + 1] = (hex >> 8) & 0xff;
  c.px[i + 2] = hex & 0xff;
  c.px[i + 3] = alpha;
}

function fillRect(c, x, y, w, h, hex) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) setPx(c, i, j, hex);
}

function outlineRect(c, x, y, w, h, hex) {
  for (let i = x; i < x + w; i++) {
    setPx(c, i, y, hex);
    setPx(c, i, y + h - 1, hex);
  }
  for (let j = y; j < y + h; j++) {
    setPx(c, x, j, hex);
    setPx(c, x + w - 1, j, hex);
  }
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const P = {
  floorA: 0x767a83,
  floorB: 0x7d8189,
  floorDark: 0x676b74,
  floorLight: 0x878b93,
  altA: 0x6d7079,
  altB: 0x74777f,
  brick: 0x5c6069,
  brickDark: 0x4b4f58,
  brickLight: 0x676b75,
  cap: 0x3c3f47,
  capDot: 0x45484f,
  wood: 0x8a6b42,
  woodDark: 0x6e5433,
  woodFrame: 0x54412a,
  step1: 0x9a9da5,
  step2: 0x84878f,
  step3: 0x6d7079,
  step4: 0x565962,
  crack: 0x52555e,
  rubble1: 0x82868e,
  rubble2: 0x6f727b,
  heroOutline: 0x23262e,
  heroArmor: 0xb8c1cc,
  heroArmorDark: 0x8d97a3,
  heroHelmet: 0xd4dbe3,
  heroVisor: 0x2e3340,
  heroPlume: 0xb5524b,
  heroBelt: 0x7a5c33,
  heroLegs: 0x4d525c,
  slimeBody: 0x5fae53,
  slimeDark: 0x47903e,
  slimeOutline: 0x2f6b2c,
  slimeHighlight: 0x8ed184,
  slimeEye: 0xf4f6ef,
  slimePupil: 0x22252b,
  transparent: 0x000000,
};

// ---------------------------------------------------------------------------
// Tiles (16x16 each)
// ---------------------------------------------------------------------------

function stoneBase(c, ox, baseA) {
  // 2x2 slabs of 8x8 with grout lines and subtle inner texture
  fillRect(c, ox, 0, T, T, baseA);
  for (const [sx, sy] of [
    [0, 0],
    [8, 0],
    [0, 8],
    [8, 8],
  ]) {
    outlineRect(c, ox + sx, sy, 8, 8, P.floorDark);
    setPx(c, ox + sx + 2, sy + 2, P.floorLight);
    setPx(c, ox + sx + 5, sy + 4, P.floorLight);
    setPx(c, ox + sx + 3, sy + 6, P.floorDark);
  }
}

function tileFloor(ox, out, variant = 0) {
  stoneBase(out, ox, variant === 1 ? P.altA : P.floorA);
}

function tileCrack(ox, out) {
  stoneBase(out, ox, P.floorA, P.floorDark);
  const path = [
    [3, 2],
    [4, 3],
    [4, 4],
    [5, 5],
    [6, 6],
    [7, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [6, 4],
    [8, 6],
    [10, 9],
    [5, 6],
    [9, 12],
  ];
  for (const [x, y] of path) setPx(out, ox + x, y, P.crack);
}

function tileRubble(ox, out) {
  stoneBase(out, ox, P.floorA, P.floorDark);
  const stones = [
    [2, 10, 3, 2, P.rubble1],
    [6, 11, 4, 3, P.rubble2],
    [11, 9, 3, 3, P.rubble1],
    [4, 3, 3, 2, P.rubble2],
  ];
  for (const [x, y, w, h, col] of stones) {
    fillRect(out, ox + x, y, w, h, col);
    outlineRect(out, ox + x, y, w, h, P.floorDark);
  }
}

function tileWall(ox, out) {
  // brick pattern: rows of bricks offset alternately
  fillRect(out, ox, 0, T, T, P.brickDark);
  const rows = [0, 4, 8, 12];
  for (const y of rows) {
    const offset = (y / 4) % 2 === 0 ? 0 : 4;
    for (let bx = -8; bx < T; bx += 8) {
      fillRect(out, ox + bx + offset + 1, y + 1, 6, 2, P.brick);
      fillRect(out, ox + bx + offset + 1, y + 1, 6, 1, P.brickLight);
    }
  }
}

function tileWallTop(ox, out) {
  fillRect(out, ox, 0, T, T, P.cap);
  for (let y = 3; y < T; y += 5) {
    for (let x = 2 + (y % 3) * 3; x < T; x += 6)
      setPx(out, ox + x, y, P.capDot);
  }
  fillRect(out, ox, 0, T, 1, 0x34363d);
}

function tileDoor(ox, out) {
  fillRect(out, ox, 0, T, T, P.woodFrame);
  fillRect(out, ox + 2, 1, 12, 15, P.wood);
  for (let x = 5; x < 14; x += 4) fillRect(out, ox + x, 1, 1, 15, P.woodDark);
  fillRect(out, ox + 2, 7, 12, 1, P.woodDark);
  fillRect(out, ox + 11, 8, 2, 2, 0xc9ced6);
  outlineRect(out, ox + 1, 0, 14, 16, P.woodFrame);
}

function tileStairs(ox, out) {
  fillRect(out, ox, 0, T, T, P.step4);
  const bands = [
    [1, 4, P.step1],
    [5, 4, P.step2],
    [9, 4, P.step3],
    [13, 3, P.step4],
  ];
  for (const [y, h, col] of bands) fillRect(out, ox + 1, y, 14, h, col);
  for (const [y] of bands) fillRect(out, ox + 1, y + 3, 14, 1, P.cap);
  outlineRect(out, ox, 0, T, T, P.cap);
}

// ---------------------------------------------------------------------------
// Actors (16x16 frames)
// ---------------------------------------------------------------------------

function heroFrame(ox, oy, out, frameIdx) {
  // frame layout: 0 step-left, 1 stand, 2 step-right, 3 stand (mirrors bob)
  const bob = frameIdx === 1 || frameIdx === 3 ? 1 : 0;
  const x0 = ox;
  const y0 = oy + bob;

  // plume
  fillRect(out, x0 + 7, y0 + 0, 2, 2, P.heroPlume);
  setPx(out, x0 + 6, y0 + 1, P.heroPlume);
  // helmet
  fillRect(out, x0 + 4, y0 + 2, 8, 4, P.heroHelmet);
  outlineRect(out, x0 + 4, y0 + 2, 8, 4, P.heroOutline);
  fillRect(out, x0 + 5, y0 + 5, 6, 2, P.heroVisor);
  setPx(out, x0 + 5, y0 + 6, P.heroOutline);
  setPx(out, x0 + 10, y0 + 6, P.heroOutline);
  // body
  fillRect(out, x0 + 4, y0 + 7, 8, 4, P.heroArmor);
  outlineRect(out, x0 + 4, y0 + 7, 8, 4, P.heroOutline);
  fillRect(out, x0 + 6, y0 + 8, 4, 2, P.heroArmorDark);
  // belt
  fillRect(out, x0 + 5, y0 + 11, 6, 1, P.heroBelt);
  // legs
  const legs = [
    [
      [5, 12, 2, 3],
      [9, 12, 2, 3],
    ], // frame 0: both down
    [
      [4, 12, 2, 2],
      [9, 13, 2, 2],
    ], // frame 1
    [
      [5, 12, 2, 3],
      [9, 12, 2, 3],
    ], // frame 2
    [
      [5, 13, 2, 2],
      [10, 12, 2, 2],
    ], // frame 3
  ][frameIdx];
  for (const [lx, ly, lw, lh] of legs) {
    fillRect(out, x0 + lx, y0 + ly - bob, lw, lh, P.heroLegs);
    outlineRect(out, x0 + lx, y0 + ly - bob, lw, lh, P.heroOutline);
  }
  // shoulders
  setPx(out, x0 + 3, y0 + 8, P.heroArmorDark);
  setPx(out, x0 + 12, y0 + 8, P.heroArmorDark);
}

function slimeFrame(ox, oy, out, frameIdx) {
  // squish cycle: body heights per frame
  const specs = [
    { w: 12, h: 8, yOff: 0 },
    { w: 13, h: 6, yOff: 2 },
    { w: 12, h: 8, yOff: 0 },
    { w: 11, h: 7, yOff: 1 },
  ][frameIdx];
  const cx = ox + 8;
  const bottom = oy + 15;
  const top = bottom - specs.h - specs.yOff;
  const left = cx - Math.floor(specs.w / 2);

  fillRect(out, left, top, specs.w, specs.h + specs.yOff, P.slimeBody);
  // rounded silhouette: shave corners
  setPx(out, left, top, 0x000000, 0);
  setPx(out, left + specs.w - 1, top, 0x000000, 0);
  setPx(out, left, bottom, 0x000000, 0);
  setPx(out, left + specs.w - 1, bottom, 0x000000, 0);
  // bottom shading
  fillRect(out, left + 1, bottom - 2, specs.w - 2, 2, P.slimeDark);
  // highlight
  setPx(out, left + 3, top + 1, P.slimeHighlight);
  setPx(out, left + 4, top + 1, P.slimeHighlight);
  setPx(out, left + 3, top + 2, P.slimeHighlight);
  // eyes
  const eyeY = top + 3;
  fillRect(out, cx - 4, eyeY, 3, 3, P.slimeEye);
  fillRect(out, cx + 1, eyeY, 3, 3, P.slimeEye);
  fillRect(out, cx - 3, eyeY + 1, 1, 1, P.slimePupil);
  fillRect(out, cx + 2, eyeY + 1, 1, 1, P.slimePupil);
  // outline
  outlineRect(out, left, top, specs.w, bottom - top + 1, P.slimeOutline);
}

// ---------------------------------------------------------------------------
// Assemble atlases
// ---------------------------------------------------------------------------

const tilePainters = [
  tileFloor, // 0 floor
  (ox, out) => tileFloor(ox, out, 1), // 1 floor-alt
  tileWall, // 2 wall
  tileWallTop, // 3 wall-top
  tileDoor, // 4 door
  tileStairs, // 5 stairs
  tileCrack, // 6 crack
  tileRubble, // 7 rubble
];

function generateTiles() {
  const out = makeCanvas(tilePainters.length * T, T);
  tilePainters.forEach((paint, i) => paint(i * T, out));
  return out;
}

function generateActors() {
  const out = makeCanvas(4 * T, 2 * T);
  for (let f = 0; f < 4; f++) heroFrame(f * T, 0, out, f);
  for (let f = 0; f < 4; f++) slimeFrame(f * T, T, out, f);
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
const tiles = generateTiles();
const actors = generateActors();
writeFileSync(
  join(OUT_DIR, 'dungeon-tiles.png'),
  encodePng(tiles.w, tiles.h, tiles.px),
);
writeFileSync(
  join(OUT_DIR, 'actors.png'),
  encodePng(actors.w, actors.h, actors.px),
);
console.log(
  `wrote ${join(OUT_DIR, 'dungeon-tiles.png')} (${tiles.w}x${tiles.h})`,
);
console.log(`wrote ${join(OUT_DIR, 'actors.png')} (${actors.w}x${actors.h})`);
