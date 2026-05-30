// Generates PNG icons for both enabled and disabled states.
// No dependencies — pure Node.js with raw PNG encoding.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── PNG encoder ──────────────────────────────────────────────

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([lenBuf, t, data, crcBuf]);
}

function encodePNG(rgb, size) {
  // RGB pixels → PNG (no alpha, RGB color type)
  const raw = Buffer.allocUnsafe(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const si = (y * size + x) * 3;
      const di = y * (size * 3 + 1) + 1 + x * 3;
      raw[di] = rgb[si]; raw[di + 1] = rgb[si + 1]; raw[di + 2] = rgb[si + 2];
    }
  }
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = ihdr[11] = ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon renderer ────────────────────────────────────────────
// bg / fg are [r, g, b].
// Concentric circles at equal spacing, anti-aliased via 4×4 supersampling.

function generateIcon(size, bg, fg) {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 128;

  // Radii and spacing scaled from 128px reference
  const outerR   = 44 * scale;
  const middleR  = 30 * scale;
  const innerR   = 16 * scale;
  const radii    = [outerR, middleR, innerR];
  const strokeW  = Math.max(1.2, 5 * scale);
  const half     = strokeW / 2;
  const SS       = 4; // supersampling per axis

  const rgb = new Uint8ClampedArray(size * size * 3);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const d  = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
          if (radii.some(r => Math.abs(d - r) <= half)) hits++;
        }
      }
      const a   = hits / (SS * SS);
      const i   = (y * size + x) * 3;
      rgb[i]   = Math.round(bg[0] * (1 - a) + fg[0] * a);
      rgb[i+1] = Math.round(bg[1] * (1 - a) + fg[1] * a);
      rgb[i+2] = Math.round(bg[2] * (1 - a) + fg[2] * a);
    }
  }

  return encodePNG(rgb, size);
}

// ── Generate ─────────────────────────────────────────────────

const sizes = [16, 48, 128];
const dir   = path.join(__dirname, 'icons');

const BLACK = [0,   0,   0  ];
const WHITE = [255, 255, 255];

for (const size of sizes) {
  // Disabled state: black background, white circles
  fs.writeFileSync(path.join(dir, `icon${size}.png`),     generateIcon(size, BLACK, WHITE));
  // Enabled state: white background, black circles
  fs.writeFileSync(path.join(dir, `icon${size}-on.png`),  generateIcon(size, WHITE, BLACK));
  console.log(`icon${size}.png  +  icon${size}-on.png`);
}

console.log('\nDone.');
