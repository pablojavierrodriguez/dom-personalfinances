#!/usr/bin/env node

/**
 * DOM Official Brand Asset Generator — v3.0 "SIGIL"
 *
 * Diseño: Pilar monolítico redondo independiente (izquierda) separado por un
 * canal negativo puro de un arco-D de alto impacto (derecha). Gradiente
 * esmeralda tech (#34f5a2 → #10b981 → #059669 → #0284c7) sobre carbón OLED.
 *
 * Genera de forma nativa (sin dependencias externas):
 *   - public/icons/icon.svg          (Vector maestro, stop-color kebab-case)
 *   - public/icons/pwa-512x512.png
 *   - public/icons/pwa-maskable.png
 *   - public/icons/pwa-192x192.png
 *   - public/icons/apple-touch-icon.png (180×180)
 *   - public/favicon.ico              (multi-res 16/32/48px)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR  = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ICONS_DIR  = path.join(PUBLIC_DIR, 'icons');

// ─── 1. Utilidades PNG nativas (CRC32 + encoder) ────────────────────────────

function makeCrcTable() {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcBuf = Buffer.alloc(4 + len);
  chunk.copy(crcBuf, 0, 4, 8 + len);
  chunk.writeUInt32BE(crc32(crcBuf), 8 + len);
  return chunk;
}

function encodePng(width, height, pixelBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    pixelBuffer.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── 2. Geometría SDF "SIGIL" ───────────────────────────────────────────────
//
// Concepto: D con contraforme circular interior — una única decisión de diseño.
// La contraforma (el espacio negativo) es un círculo perfecto centrado en el canvas,
// evocando simultáneamente: moneda, sello de poder, esfera de dominio.
//
// Geometría (coordenadas normalizadas 0…1, viewBox 512×512 → ×512):
//
//   FORMA EXTERIOR: cuadrado 0.660×0.660 centrado (máxima presencia en el icono)
//     left=0.170, right=0.830, top=0.170, bottom=0.830
//     halfH = 0.330 → pivot del semicírculo derecho: right - halfH = 0.500
//     El semicírculo derecho está centrado exactamente en el canvas ✓
//     Redondeo de esquinas izquierdas: rc=0.022
//
//   CONTRAFORME CIRCULAR:
//     center=(0.500, 0.500), radius=0.137
//     Muro resultante (L, R, T, B): 0.330 - 0.137 = 0.193 norm = 99px. UNIFORME ✓
//
// SDF total = max(d_outer, -d_circle) [boolean subtract CSG]

function distRoundedRect(px, py, x0, y0, x1, y1, r) {
  const hw = (x1 - x0) * 0.5 - r;
  const hh = (y1 - y0) * 0.5 - r;
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const dx = Math.max(0, Math.abs(px - cx) - hw);
  const dy = Math.max(0, Math.abs(py - cy) - hh);
  return Math.hypot(dx, dy) - r;
}

// SIGIL D-glyph con contraforma circular concéntrica equilibrada
function sdfDOMSigil(px, py, isMaskable) {
  const s  = isMaskable ? 0.84 : 1.0;
  const cx = 0.500, cy = 0.500;
  // Escalar desde el centro del canvas
  const nx = cx + (px - cx) / s;
  const ny = cy + (py - cy) / s;

  // ── Forma exterior D ──────────────────────────────────────────
  // Rectángulo izquierdo + semicírculo derecho, esquinas izq redondeadas
  const L = 0.170, T = 0.170, B = 0.830;
  const halfH = 0.330;
  const pivX  = 0.500; // = L + (1-2L)/2 - halfH + halfH... = 0.830 - 0.330 = 0.500
  const rc    = 0.022; // radio de esquina en top-left y bottom-left

  let dOuter;
  if (nx >= pivX) {
    // Región derecha: semicírculo
    dOuter = Math.hypot(nx - pivX, ny - cy) - halfH;
  } else {
    // Región izquierda: rectángulo [L..pivX] × [T..B] con esquinas redondeadas
    const hw  = (pivX - L) * 0.5 - rc; // 0.165 - 0.022 = 0.143
    const hh  = (B - T) * 0.5 - rc;    // 0.330 - 0.022 = 0.308
    const lcx = (L + pivX) * 0.5;      // 0.335
    const dx  = Math.max(0, Math.abs(nx - lcx) - hw);
    const dy  = Math.max(0, Math.abs(ny - cy) - hh);
    dOuter = Math.hypot(dx, dy) - rc;
  }

  // ── Contraforme circular (el "sello") ─────────────────────────
  // Centrado en el canvas. r=0.137 → 70px @ 512px.
  // Muro uniforme en los 4 lados: 0.330 - 0.137 = 0.193 norm ≈ 99px ✓
  const dCircle = Math.hypot(nx - cx, ny - cy) - 0.137;

  // Boolean subtract: D exterior MENOS círculo interior
  return Math.max(dOuter, -dCircle);
}

// Squircle background
function sdfSquircle(px, py, isMaskable) {
  if (isMaskable) return -1;
  return distRoundedRect(px, py, 0.02, 0.02, 0.98, 0.98, 0.22);
}

// Gradiente esmeralda tech (diagonal top-left → bottom-right)
function emeraldGradient(prog) {
  const stops = [
    [0.00, 59, 249, 168],
    [0.35, 16, 185, 129],
    [0.75,  5, 150, 105],
    [1.00,  2, 132, 199],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i];
    const [t1, r1, g1, b1] = stops[i + 1];
    if (prog <= t1) {
      const t = (prog - t0) / (t1 - t0);
      return [Math.round(r0 + (r1 - r0) * t), Math.round(g0 + (g1 - g0) * t), Math.round(b0 + (b1 - b0) * t)];
    }
  }
  return [2, 132, 199];
}

function samplePixel(nx, ny, isMaskable) {
  // 1. Fondo squircle
  const dBg = sdfSquircle(nx, ny, isMaskable);
  if (dBg > 0.01) return [0, 0, 0, 0];
  const bgAlpha = dBg > 0 ? Math.max(0, 1 - dBg / 0.01) : 1.0;

  // Color de fondo: carbón OLED con micro-gradiente
  const bgT = (nx + ny) * 0.3;
  const bgR = Math.round(14 - bgT * 6);
  const bgG = Math.round(18 - bgT * 8);
  const bgB = Math.round(26 - bgT * 10);

  // 2. Glifo D
  const dGlyph = sdfDOMSigil(nx, ny, isMaskable);
  const AA = 0.007;

  if (dGlyph > AA) {
    // Borde sutil del squircle
    const dBorder = Math.abs(sdfSquircle(nx, ny, isMaskable));
    if (!isMaskable && dBorder < 0.005) {
      const bA = bgAlpha * (1 - dBorder / 0.005) * 0.28;
      return [
        Math.round(bgR * (1 - bA) + 16 * bA),
        Math.round(bgG * (1 - bA) + 185 * bA),
        Math.round(bgB * (1 - bA) + 129 * bA),
        Math.round(bgAlpha * 255),
      ];
    }
    return [bgR, bgG, bgB, Math.round(bgAlpha * 255)];
  }

  const glyphAlpha = dGlyph <= 0 ? 1.0 : Math.max(0, 1 - dGlyph / AA);
  // Gradiente puro — sin biseles ni trucos artificiales
  const prog = (nx + ny) * 0.5;
  let [fR, fG, fB] = emeraldGradient(prog);

  const finalR = Math.round(bgR * (1 - glyphAlpha) + fR * glyphAlpha);
  const finalG = Math.round(bgG * (1 - glyphAlpha) + fG * glyphAlpha);
  const finalB = Math.round(bgB * (1 - glyphAlpha) + fB * glyphAlpha);
  const finalA = Math.max(bgAlpha, glyphAlpha);

  return [finalR, finalG, finalB, Math.round(finalA * 255)];
}

// ─── 3. Renderizador PNG con supersampling 4x (2×2 jittered) ────────────────

function renderPng(size, isMaskable) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 4 subpixels: (+0.25, +0.25), (+0.75, +0.25), (+0.25, +0.75), (+0.75, +0.75)
      const samples = [
        samplePixel((x + 0.25) / size, (y + 0.25) / size, isMaskable),
        samplePixel((x + 0.75) / size, (y + 0.25) / size, isMaskable),
        samplePixel((x + 0.25) / size, (y + 0.75) / size, isMaskable),
        samplePixel((x + 0.75) / size, (y + 0.75) / size, isMaskable),
      ];
      const idx = (y * size + x) * 4;
      for (let c = 0; c < 4; c++) {
        buf[idx + c] = Math.round((samples[0][c] + samples[1][c] + samples[2][c] + samples[3][c]) * 0.25);
      }
    }
  }
  return encodePng(size, size, buf);
}

// ─── 4. Constructor ICO multirresolución ────────────────────────────────────

function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // ICO
  header.writeUInt16LE(count, 4);
  const dirs = [];
  let offset = 6 + count * 16;
  for (const { size, buffer } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0; dir[3] = 0;
    dir.writeUInt16LE(1, 4);  // planes
    dir.writeUInt16LE(32, 6); // bits
    dir.writeUInt32LE(buffer.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirs.push(dir);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...dirs, ...entries.map(e => e.buffer)]);
}

// ─── 5. SVG Vectorial Maestro "D Monumental" ────────────────────────────────
//
// Parámetros en coordenadas absolutas (viewBox 512×512):
//   FORMA EXTERIOR:
//     left=106, right=406, top=94, bottom=416  → centro = 256.0 ✓
//     halfH = (416-94)/2 = 161, pivotX = 406-161 = 245
//     esquinas izquierdas: rx=26 (≈ 0.051 * 512)
//
//   HUECO INTERIOR (contraforma):
//     stemW = 86px (0.168*512), wallV = 76px (0.148*512)
//     iL = 106+86 = 192, iT = 94+76 = 170, iB = 416-76 = 340
//     iHalf = (340-170)/2 = 85, iPivot = 406-76-85 = 245
//
// NOTA: stop-color en kebab-case (estándar SVG/XML nativo, NO camelCase de JSX)

// ─── 5. SVG Vectorial Maestro "SIGIL" ───────────────────────────────────────
//
// Parámetros absolutos (viewBox 512×512):
//   Outer D: left=87, right=425, top=87, bottom=425, halfH=169, pivotX=256
//     (esquinas izq: Q curve r=20px)
//   Circular counter: center=(256,256), r=70
//   Muro uniforme: 169 - 70 = 99px en L,R,T,B
//
// NOTA: fill-rule="evenodd" — el círculo interior crea el agujero automáticamente.

function buildMasterSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Fondo carbón OLED -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#0d1017" />
      <stop offset="100%" stop-color="#06070a" />
    </linearGradient>
    <!-- Gradiente esmeralda tech diagonal -->
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#34f5a2" />
      <stop offset="35%"  stop-color="#10b981" />
      <stop offset="75%"  stop-color="#059669" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <!-- Sombra de profundidad muy sutil -->
    <filter id="shadow" x="-15%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#000" flood-opacity="0.50" />
    </filter>
  </defs>

  <!-- Fondo squircle carbon OLED -->
  <rect width="512" height="512" rx="114" fill="url(#bgGrad)" stroke="rgba(16,185,129,0.18)" stroke-width="2" />

  <!-- SIGIL: D con contraforme circular
       Outer D: M107,87 L256,87 → semicírculo CW → L107,425 → esquinas izq → Z
       Circle: CCW — evenodd lo convierte en agujero automáticamente -->
  <g filter="url(#shadow)">
    <path fill-rule="evenodd" fill="url(#emeraldGrad)"
      d="M107,87
         L256,87
         A169,169 0 0,1 256,425
         L107,425
         Q87,425 87,405
         L87,107
         Q87,87 107,87
         Z
         M326,256
         A70,70 0 1,0 186,256
         A70,70 0 1,0 326,256
         Z" />
  </g>
</svg>`;
}

// ─── 6. Ejecución ────────────────────────────────────────────────────────────

console.log('🏛️  DOM — Generando brand assets v3.0 "SIGIL"\n');

// SVG maestro
fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), buildMasterSvg());
console.log('  ✓ public/icons/icon.svg');

// PNGs PWA
const buf512 = renderPng(512, false);
fs.writeFileSync(path.join(ICONS_DIR, 'pwa-512x512.png'), buf512);
console.log('  ✓ public/icons/pwa-512x512.png');

const bufMask = renderPng(512, true);
fs.writeFileSync(path.join(ICONS_DIR, 'pwa-maskable.png'), bufMask);
console.log('  ✓ public/icons/pwa-maskable.png');

const buf192 = renderPng(192, false);
fs.writeFileSync(path.join(ICONS_DIR, 'pwa-192x192.png'), buf192);
console.log('  ✓ public/icons/pwa-192x192.png');

const buf180 = renderPng(180, false);
fs.writeFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), buf180);
console.log('  ✓ public/icons/apple-touch-icon.png');

// Favicon ICO
const ico16 = renderPng(16, false);
const ico32 = renderPng(32, false);
const ico48 = renderPng(48, false);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), buildIco([
  { size: 16, buffer: ico16 },
  { size: 32, buffer: ico32 },
  { size: 48, buffer: ico48 },
]));
console.log('  ✓ public/favicon.ico (16/32/48px multi-res)');

console.log('\n🎉 ¡Assets DOM generados con éxito!');
