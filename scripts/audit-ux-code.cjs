#!/usr/bin/env node

/**
 * scripts/audit-ux-code.cjs
 * DOM — Static Code-Level UX & Mobile Anti-Patterns Auditor
 *
 * Escanea archivos en src/ para detectar firmas estáticas de errores de UX móvil,
 * conflictos de gestos, sanitización de inputs y bloqueos regionales antes de ir a runtime.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const findings = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'test' && file !== 'node_modules' && file !== '__mocks__') {
        walk(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      auditFile(fullPath);
    }
  }
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Detección de input[type="number"] para montos
    if (
      (line.includes('type="number"') || line.includes("type='number'")) &&
      !filePath.includes('otp') &&
      !line.includes('// ux-audit-ignore')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-001',
        message: 'Uso de type="number" en input. En mobile rompe comas decimales regionales (es-AR). Usar inputMode="decimal" y parseThousandsInput.',
      });
    }

    // 2. Detección de shortcuts de teclado sin ocultar en mobile (kbd o ⌘)
    if (
      (line.includes('<kbd') || line.includes('⌘') || line.includes('Ctrl+')) &&
      !line.includes('hidden') &&
      !line.includes('// ux-audit-ignore')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-002',
        message: 'Atajo de teclado físico (⌘ / <kbd>) posiblemente visible en mobile sin clase "hidden sm:inline-flex".',
      });
    }

    // 3. Framer Motion Reorder.Group susceptible a descalibración por scroll
    if (line.includes('<Reorder.Group') && !line.includes('// ux-audit-ignore')) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-003',
        message: 'Uso de <Reorder.Group>. Verificar que no esté dentro de un scroll container (overflow-y-auto) o reemplazar por Pointer Events a 120 FPS.',
      });
    }

    // 4. Formato de fecha con date-fns sin locale explícito
    if (
      line.includes('format(') &&
      content.includes("from 'date-fns'") &&
      !line.includes('locale') &&
      !line.includes('activeLocale') &&
      !line.includes('// ux-audit-ignore') &&
      (line.includes('"MMMM"') || line.includes('"MMM"') || line.includes("'MMMM'") || line.includes("'MMM'") || line.includes('"EEEE"') || line.includes("'EEEE'"))
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-004',
        message: 'Llamada a format() de date-fns con nombres de mes/día sin locale en español ({ locale: es }).',
      });
    }

    // 5. Input de email sin flags mobile
    if (
      (line.includes('type="email"') || line.includes("type='email'")) &&
      !line.includes('autoCapitalize="none"') &&
      !content.includes('autoCapitalize="none"') &&
      !line.includes('// ux-audit-ignore')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-005',
        message: 'Input de email sin autoCapitalize="none" / autoCorrect="off". Provoca errores de login por mayúscula inicial en teclados móviles.',
      });
    }
  });
}

console.log('\n=====================================================');
console.log('🔍 DOM: STATIC CODE-LEVEL UX & ERGONOMICS AUDITOR');
console.log('=====================================================\n');

walk(SRC);

const errors = findings.filter(f => f.severity === 'ERROR');
const warnings = findings.filter(f => f.severity === 'WARNING');
const infos = findings.filter(f => f.severity === 'INFO');

if (findings.length === 0) {
  console.log('✅ CERO anti-patrones estáticos de UX detectados en src/.');
  console.log('🎉 El código cumple con las directivas de ergonomía táctil y robustez móvil.\n');
  process.exit(0);
} else {
  console.log(`Se encontraron ${findings.length} observaciones de UX en el código:\n`);
  findings.forEach(f => {
    const icon = f.severity === 'ERROR' ? '❌' : f.severity === 'WARNING' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${f.code}] ${f.file}:${f.line}`);
    console.log(`   ${f.message}\n`);
  });

  console.log('=====================================================');
  console.log(`Resumen: ${errors.length} errores, ${warnings.length} advertencias, ${infos.length} sugerencias.`);
  console.log('=====================================================\n');

  if (errors.length > 0) {
    process.exit(1);
  }
}
