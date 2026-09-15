/**
 * Genera los PNGs de la PWA a partir del SVG fuente.
 * Usa Playwright para renderizar el SVG en un browser headless con precisión pixel-perfect.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.resolve(__dirname, '../public/icons/icon.svg');
const OUT_DIR  = path.resolve(__dirname, '../public/icons');

// Definición de cada PNG de salida
const targets = [
  { file: 'pwa-192x192.png',      size: 192,  maskable: false },
  { file: 'pwa-512x512.png',      size: 512,  maskable: false },
  { file: 'pwa-maskable.png',     size: 512,  maskable: true  },
  { file: 'apple-touch-icon.png', size: 180,  maskable: false },
];

async function main() {
  const svgContent = fs.readFileSync(SVG_PATH, 'utf8');
  const browser = await chromium.launch();

  for (const { file, size, maskable } of targets) {
    const page = await browser.newPage();

    // Fondo transparente para que el rx del squircle funcione correctamente
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
            svg { width: ${size}px; height: ${size}px; display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);

    const outPath = path.join(OUT_DIR, file);
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: false, // el SVG ya tiene fondo propio
    });

    console.log(`✓ ${file} (${size}x${size})`);
    await page.close();
  }

  await browser.close();
  console.log('\n✅ Todos los PNGs generados con éxito.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
