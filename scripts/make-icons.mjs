// Sinh icon từ logo trường (public/logo.png) trên nền màu bộ nhận diện.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "public/logo.png";
const BG = { r: 0xe0, g: 0xe2, b: 0xdb, alpha: 1 };

async function icon(size, ratio) {
  const logoSize = Math.round(size * ratio);
  const logo = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: "contain", background: { ...BG, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

mkdirSync("public/icons", { recursive: true });

for (const [name, size, ratio] of [
  ["icon-192.png", 192, 0.78],
  ["icon-512.png", 512, 0.76],
  ["apple-touch-icon.png", 180, 0.8],
]) {
  writeFileSync(`public/icons/${name}`, await icon(size, ratio));
  console.log("wrote public/icons/" + name);
}

// favicon.ico: PNG 32x32 bọc trong ICO
const png32 = await icon(32, 0.86);
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
entry.writeUInt32LE(png32.length, 8);
entry.writeUInt32LE(22, 12);
writeFileSync("src/app/favicon.ico", Buffer.concat([header, entry, png32]));
console.log("wrote src/app/favicon.ico");
