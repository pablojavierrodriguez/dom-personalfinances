#!/usr/bin/env node

/**
 * Script de validación de integridad de releases para DOM.
 * Verifica la coherencia entre package.json y docs/RELEASE_NOTES.md,
 * asegurando que la última versión cerrada coincida con la desplegada en Cloud
 * y que las notas activas sean 100% User-Facing sin identificadores internos.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Leer package.json
const packageJsonPath = path.join(ROOT_DIR, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

console.log(`\n🔍 Verificando integridad de release para versión: ${currentVersion}...`);

let hasError = false;

// 2. Leer docs/RELEASE_NOTES.md
const releaseNotesPath = path.join(ROOT_DIR, 'docs/RELEASE_NOTES.md');
if (!fs.existsSync(releaseNotesPath)) {
  console.error('❌ Error: No se encontró docs/RELEASE_NOTES.md');
  process.exit(1);
}

const releaseNotesContent = fs.readFileSync(releaseNotesPath, 'utf8');

// Extraer cabeceras de versión (ej: ## [Unreleased] o ## [0.1.0] o ## v0.1.0)
const versionMatches = [...releaseNotesContent.matchAll(/##\s+(?:v?(\d+\.\d+\.\d+)|\[([^\]]+)\])/gi)];

if (versionMatches.length === 0) {
  console.error('❌ Error: No se pudo encontrar ninguna cabecera de versión en docs/RELEASE_NOTES.md');
  hasError = true;
} else {
  // Buscar la última versión formal cerrada (excluyendo 'Unreleased')
  let closedVersion = null;
  for (const match of versionMatches) {
    const rawVal = match[1] || match[2];
    if (rawVal && !rawVal.toLowerCase().includes('unreleased')) {
      closedVersion = rawVal.replace(/^v/, '').trim();
      break;
    }
  }

  if (!closedVersion) {
    console.error('❌ Error: docs/RELEASE_NOTES.md no contiene ninguna versión formal cerrada.');
    hasError = true;
  } else if (closedVersion !== currentVersion) {
    console.error(`❌ Inconsistencia de versión: package.json tiene "${currentVersion}" pero docs/RELEASE_NOTES.md tiene "${closedVersion}" en la última versión cerrada.`);
    hasError = true;
  } else {
    console.log(`✅ docs/RELEASE_NOTES.md coincide con package.json (versión: ${currentVersion}).`);
  }
}

// 3. Validar que no existan identificadores internos (SPEC-XXX) en la versión activa (User-Facing)
const specRegex = /SPEC-\d+/gi;
if (specRegex.test(releaseNotesContent.slice(0, 3000))) {
  console.error('❌ Error de Calidad: docs/RELEASE_NOTES.md contiene identificadores internos "SPEC-XXX" en la sección activa. Debe ser 100% User-Facing.');
  hasError = true;
}

if (hasError) {
  console.error('\n🚨 Falló la validación de integridad de release. Corrija las inconsistencias antes de continuar.\n');
  process.exit(1);
} else {
  console.log('✨ Integridad de release validada con éxito.\n');
  process.exit(0);
}
