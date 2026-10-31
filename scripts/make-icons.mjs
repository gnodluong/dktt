// Sinh icon PNG (192/512/180) không cần thư viện ảnh.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };
  const rect = (x0, y0, w, h, color) => {
    for (let y = y0; y < y0 + h; y += 1)
      for (let x = x0; x < x0 + w; x += 1) set(x, y, color);
  };
  const disc = (cx, cy, r, color) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y += 1)
      for (let x = Math.floor(cx - r); x <= cx + r; x += 1)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, color);
  };
  draw({ rect, disc, size });

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CREAM = [239, 239, 230];
const OLIVE = [62, 76, 52];
const RED = [174, 59, 44];

const GLYPH = [
  "11111",
  "10000",
  "10000",
  "11110",
  "00001",
  "00001",
  "11110",
];

function draw({ rect, disc, size }) {
  rect(0, 0, size, size, CREAM);
  const cell = Math.round(size * 0.1);
  const gw = cell * 5;
  const gh = cell * 7;
  const gx = Math.round((size - gw) / 2);
  const gy = Math.round((size - gh) / 2) - Math.round(size * 0.02);
  GLYPH.forEach((row, ry) =>
    [...row].forEach((bit, rx) => {
      if (bit === "1") rect(gx + rx * cell, gy + ry * cell, cell, cell, OLIVE);
    }),
  );
  // con dấu đỏ
  const r = Math.round(size * 0.115);
  disc(size - Math.round(size * 0.205), size - Math.round(size * 0.205), r, RED);
  disc(
    size - Math.round(size * 0.205),
    size - Math.round(size * 0.205),
    Math.round(r * 0.55),
    CREAM,
  );
}

mkdirSync("public/icons", { recursive: true });
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(`public/icons/${name}`, png(size, draw));
  console.log("wrote public/icons/" + name);
}

// favicon.ico: một ảnh PNG 32x32 bọc trong ICO
const icoPng = png(32, draw);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 32;
entry[1] = 32;
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(icoPng.length, 8);
entry.writeUInt32LE(22, 12);
writeFileSync("src/app/favicon.ico", Buffer.concat([header, entry, icoPng]));
console.log("wrote src/app/favicon.ico");
