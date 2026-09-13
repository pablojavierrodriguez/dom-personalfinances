#!/usr/bin/env node

/**
 * Suite de auto-validación y compliance para DOM.
 *
 * Pilares de validación:
 * 1. Tipado TypeScript (tsc --noEmit)
 * 2. Compilación de producción (npm run build)
 * 3. Tests unitarios (npm run test)
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=====================================================');
console.log('🚀 DOM: SUITE DE AUTO-VALIDACIÓN');
console.log('=====================================================\n');

const checks = [
  {
    name: '1. Integridad de Releases y Versiones',
    command: 'node',
    args: ['scripts/check-release-integrity.cjs'],
    critical: true,
  },
  {
    name: '2. Tipado TypeScript (tsc --noEmit)',
    command: 'npx',
    args: ['tsc', '--noEmit'],
    critical: true,
  },
  {
    name: '3. Tests Unitarios (vitest)',
    command: 'npm',
    args: ['run', 'test'],
    critical: true,
  },
  {
    name: '4. Build de Producción (vite build)',
    command: 'npm',
    args: ['run', 'build'],
    critical: true,
  },
];

let summary = [];
let hasCriticalFailure = false;

for (const check of checks) {
  process.stdout.write(`⏳ Ejecutando: ${check.name}... `);
  const start = Date.now();
  const res = spawnSync(check.command, check.args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (res.status === 0) {
    console.log(`✅ [OK] (${duration}s)`);
    summary.push({ name: check.name, status: 'PASSED', duration });
  } else {
    console.log(`❌ [ERROR CRÍTICO] (${duration}s)`);
    hasCriticalFailure = true;
    summary.push({
      name: check.name,
      status: 'FAILED',
      duration,
      critical: true,
      output: res.stdout || res.stderr,
    });
  }
}

console.log('\n=====================================================');
console.log('📊 RESUMEN FINAL DE COMPLIANCE');
console.log('=====================================================');

summary.forEach((s) => {
  const icon = s.status === 'PASSED' ? '✅' : '❌';
  console.log(`${icon} ${s.name} -> ${s.status} (${s.duration}s)`);
});

const failedChecks = summary.filter((s) => s.status === 'FAILED');
if (failedChecks.length > 0) {
  console.log('\n❌ DETALLE DE FALLOS:');
  failedChecks.forEach((f) => {
    console.log(`\n--- Fallo en: ${f.name} ---`);
    console.log(f.output);
  });
}

console.log('=====================================================\n');

if (hasCriticalFailure) {
  console.error('⛔ Auto-validación fallida.');
  process.exit(1);
} else {
  console.log('🎉 ¡Todas las validaciones pasaron con éxito!');
  process.exit(0);
}
