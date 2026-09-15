/**
 * Genera los PNGs de splash screen para PWA en iOS.
 * Usa `sharp` (libvips) — sin browser, sin dependencias del sistema.
 *
 * Diseño: logo DOM centrado (~22% del alto de pantalla) sobre fondo #0c0e12.
 * Fuente del logo: public/icons/pwa-512x512.png (ya generado con Playwright).
 *
 * Ejecutar: node scripts/generate-splash-screens.js
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const LOGO_SVG  = path.resolve(__dirname, '../public/icons/icon.svg');
const LOGO_PNG  = path.resolve(__dirname, '../public/icons/pwa-512x512.png');
const OUT_DIR   = path.resolve(__dirname, '../public/icons/splash');
const BG_COLOR  = { r: 12, g: 14, b: 18, alpha: 1 }; // #0c0e12

// Dispositivos iOS relevantes (2023–2026), portrait únicamente.
const targets = [
  { file: 'splash-1320x2868.png', width: 1320, height: 2868, label: 'iPhone 16 Pro Max' },
  { file: 'splash-1206x2622.png', width: 1206, height: 2622, label: 'iPhone 16 Pro' },
  { file: 'splash-1284x2778.png', width: 1284, height: 2778, label: 'iPhone 16 Plus / 15 Plus / 14 Plus' },
  { file: 'splash-1290x2796.png', width: 1290, height: 2796, label: 'iPhone 15 Pro Max / 14 Pro Max' },
  { file: 'splash-1179x2556.png', width: 1179, height: 2556, label: 'iPhone 16 / 15 / 14' },
  { file: 'splash-1080x2340.png', width: 1080, height: 2340, label: 'iPhone 13 mini' },
  { file: 'splash-750x1334.png',  width: 750,  height: 1334, label: 'iPhone SE' },
  { file: 'splash-2048x2732.png', width: 2048, height: 2732, label: 'iPad Pro 12.9"' },
  { file: 'splash-1668x2388.png', width: 1668, height: 2388, label: 'iPad Pro 11" / Air' },
  { file: 'splash-1488x2266.png', width: 1488, height: 2266, label: 'iPad mini 6' },
];

async function generateSplash({ file, width, height, label }, logoSvgBuffer, logoPngBuffer) {
  // Logo: 22% del alto de pantalla, centrado
  const logoSize = Math.round(height * 0.22);
  const left = Math.round((width - logoSize) / 2);
  const top  = Math.round((height - logoSize) / 2);

  // Redimensionar el logo al tamaño correcto.
  // Se usa el SVG directamente (transparencia nativa en esquinas del squircle).
  // Si sharp no tiene soporte SVG/librsvg, cae al PNG con flatten sobre el fondo.
  let resizedLogo;
  try {
    resizedLogo = await sharp(logoSvgBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } catch {
    // Fallback: PNG con esquinas blancas aplanadas al color de fondo
    resizedLogo = await sharp(logoPngBuffer)
      .resize(logoSize, logoSize, { fit: 'contain' })
      .flatten({ background: BG_COLOR })
      .png()
      .toBuffer();
  }

  // Crear fondo sólido y compositar el logo centrado
  const outPath = path.join(OUT_DIR, file);
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`✓  ${file}  (${width}×${height})  —  ${label}`);
}

async function main() {
  if (!fs.existsSync(LOGO_SVG)) {
    console.error(`❌ SVG no encontrado: ${LOGO_SVG}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const logoSvgRaw    = fs.readFileSync(LOGO_SVG, 'utf8');
  const logoPngBuffer = fs.existsSync(LOGO_PNG) ? fs.readFileSync(LOGO_PNG) : null;

  // Eliminar el <rect> de fondo del SVG para que el sigil flote
  // directamente sobre el fondo del splash sin discrepancia de color.
  const logoSvgClean  = logoSvgRaw.replace(
    /<rect[^>]*fill="url\(#bgGrad\)"[^>]*\/>/,
    ''
  );
  const logoSvgBuffer = Buffer.from(logoSvgClean);

  console.log(`\n🚀 Generando ${targets.length} splash screens con sharp...\n`);

  // Generar en paralelo para mayor velocidad
  await Promise.all(targets.map(t => generateSplash(t, logoSvgBuffer, logoPngBuffer)));

  console.log(`\n✅ Listo. ${targets.length} archivos en: public/icons/splash/`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
