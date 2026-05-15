#!/usr/bin/env node
/**
 * SVG ikonunu Electron için PNG'ye dönüştürür.
 * Çıktı: electron/icons/icon.png (1024x1024)
 * Ek olarak Windows .ico ve macOS .icns için yardımcı PNG'ler.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const svgPath = join(root, "public", "icons", "icon.svg");
const outDir = join(root, "electron", "icons");

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

const sizes = [1024, 512, 256, 128, 64, 32, 16];

console.log("İkonlar üretiliyor...");
for (const size of sizes) {
  const out = join(outDir, size === 1024 ? "icon.png" : `icon-${size}.png`);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`  ✓ ${size}x${size} → ${out.replace(root + "/", "")}`);
}

// .ico için 256x256 PNG yeterli (electron-builder otomatik dönüştürür)
console.log("✓ Tamam");
