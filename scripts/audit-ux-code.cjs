#!/usr/bin/env node

/**
 * scripts/audit-ux-code.cjs
 * DOM — Static Code-Level UX & Mobile Anti-Patterns Auditor (Closed-Loop UX Engine)
 *
 * Escanea archivos en src/ para detectar firmas estáticas de errores de UX móvil,
 * conflictos de gestos, touch targets deficientes (< 44px), clases arbitrarias y accesibilidad.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const isStrict = process.argv.includes('--strict');
const findings = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'test' && file !== 'node_modules' && file !== '__mocks__' && file !== 'ui') {
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
    if (line.includes('// ux-audit-ignore')) return;

    // 1. [UX-001] Bloqueo de Coma Decimal Regional (type="number")
    if (
      (line.includes('type="number"') || line.includes("type='number'")) &&
      !filePath.includes('otp')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-001',
        message: 'Uso de type="number" en input. En mobile rompe comas decimales regionales (es-AR). Usar inputMode="decimal" y parseThousandsInput.',
      });
    }

    // 2. [UX-002] Shortcuts de teclado físico sin ocultar en mobile (kbd o ⌘)
    if (
      (line.includes('<kbd') || line.includes('⌘') || line.includes('Ctrl+')) &&
      !line.includes('hidden') &&
      !line.includes('useIsMobile') &&
      !filePath.includes('KeyboardShortcutsModal') &&
      !filePath.includes('DesktopSidebar') &&
      !filePath.includes('i18n')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-002',
        message: 'Atajo de teclado físico (⌘ / <kbd>) visible en mobile sin clase "hidden sm:inline-flex".',
      });
    }

    // 3. [UX-003] Colisión Drag/Scroll sin compensación
    if (line.includes('<Reorder.Group')) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-003',
        message: 'Uso de <Reorder.Group>. Verificar que no esté dentro de un scroll container (overflow-y-auto) o reemplazar por Pointer Events a 120 FPS.',
      });
    }

    // 4. [UX-004] Fuga de Localización Temporal (date-fns format sin locale)
    if (
      line.includes('format(') &&
      content.includes("from 'date-fns'") &&
      !line.includes('locale') &&
      !line.includes('activeLocale') &&
      (line.includes('"MMMM"') || line.includes('"MMM"') || line.includes("'MMMM'") || line.includes("'MMM'") || line.includes('"EEEE"') || line.includes("'EEEE'"))
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-004',
        message: 'Llamada a format() de date-fns con nombres de mes/día sin locale en español ({ locale: activeLocale }).',
      });
    }

    // 5. [UX-005] Trampa de Autocorrección y Mayúsculas en Login
    if (
      (line.includes('type="email"') || line.includes("type='email'")) &&
      !line.includes('autoCapitalize="none"') &&
      !content.includes('autoCapitalize="none"')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-005',
        message: 'Input de email sin autoCapitalize="none" / autoCorrect="off". Provoca errores de login en teclados móviles.',
      });
    }

    // 6. [UX-006] Touch Target Diminuto (< 36px) en Botones de Acción
    if (
      (line.includes('<button') || line.includes('<motion.button')) &&
      (line.includes('h-6 ') || line.includes('h-7 ') || line.includes('h-8 ') || line.includes('w-6 ') || line.includes('w-7 ') || line.includes('w-8 ')) &&
      !line.includes('p-') &&
      !line.includes('min-h-[44px]') &&
      !line.includes('min-w-[44px]') &&
      !line.includes('hit-slop')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-006',
        message: 'Botón con altura o anchura ≤ 32px (h-6/h-7/h-8) sin padding/hit-slop compensatorio. Toque difícil en pantallas táctiles (mínimo 44×44px efectivo).',
      });
    }

    // 7. [UX-007] Clases Arbitrarias de Texto fuera de la Escala Tipográfica Canónica
    const arbitraryTextMatch = line.match(/\btext-\[(?:8|9|10|11|13|13\.5|15)px\]/);
    if (arbitraryTextMatch && !filePath.includes('Landing.tsx') && !filePath.includes('ReportsPage.tsx')) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-007',
        message: `Uso de tamaño de texto arbitrario "${arbitraryTextMatch[0]}". Ceñirse a la escala canónica de Tailwind (text-xs, text-sm, text-base).`,
      });
    }

    // 8. [UX-008] Botón con Icono sin Accesibilidad (aria-label o title)
    if (
      (line.includes('<button') || line.includes('<motion.button')) &&
      !line.includes('aria-label=') &&
      !line.includes('title=') &&
      (line.includes('rounded-full') || line.includes('rounded-xl') || line.includes('rounded-lg')) &&
      (line.includes('w-8') || line.includes('w-9') || line.includes('w-10') || line.includes('w-11') || line.includes('w-12'))
    ) {
      const nextLines = lines.slice(index, index + 4).join(' ');
      if (nextLines.includes('/>') && !nextLines.includes('{') && (nextLines.includes('Icon') || nextLines.includes('Plus') || nextLines.includes('Trash') || nextLines.includes('Pencil') || nextLines.includes('Search') || nextLines.includes('Settings'))) {
        findings.push({
          file: relPath,
          line: lineNum,
          severity: 'WARNING',
          code: 'UX-008',
          message: 'Botón de icono interactivo sin atributo aria-label ni title accesible para lectores de pantalla y screen readers.',
        });
      }
    }

    // 9. [UX-009] Doble Padding Inferior Redundante (pb-28 o pb-32 anidado)
    if (
      line.includes('pb-28') &&
      (filePath.includes('TransactionList.tsx') || filePath.includes('AccountManager.tsx'))
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'WARNING',
        code: 'UX-009',
        message: 'Padding inferior redundante (pb-28). El layout contenedor (Index.tsx) ya aplica pb-32, provocando un vacío excesivo al scrollear.',
      });
    }

    // 10. [UX-010] Elemento Clickeable sin Feedback Visual Táctil (active:scale)
    if (
      line.includes('cursor-pointer') &&
      line.includes('onClick=') &&
      !line.includes('active:scale-') &&
      !line.includes('active:bg-') &&
      !line.includes('hover:bg-') &&
      !line.includes('motion.')
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-010',
        message: 'Elemento con onClick interactivo sin feedback táctil ni transición de estado (agregar active:scale-[0.98] o active:bg-secondary).',
      });
    }

    // 11. [UX-011] Monedas o Saldos sin Monospace Tabular (font-mono-data)
    if (
      line.includes('formatAmount(') &&
      !line.includes('font-mono-data') &&
      !lines.slice(Math.max(0, index - 2), index + 3).some(l => l.includes('font-mono-data') || l.includes('tabular-nums'))
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-011',
        message: 'Monto formateado con formatAmount sin clase "font-mono-data" o "tabular-nums". Puede provocar micro-saltos horizontales de texto.',
      });
    }

    // 12. [UX-012] Flex Horizontal de Tarjetas sin min-w-0 / truncate
    if (
      line.includes('flex items-center justify-between') &&
      !line.includes('min-w-0') &&
      (filePath.includes('Transaction') || filePath.includes('Account') || filePath.includes('Card'))
    ) {
      findings.push({
        file: relPath,
        line: lineNum,
        severity: 'INFO',
        code: 'UX-012',
        message: 'Contenedor flex de tarjeta móvil sin "min-w-0" en sus columnas hijas. Riesgo de desborde y empuje horizontal en 375px.',
      });
    }
  });
}

console.log('\n=====================================================');
console.log('🔍 DOM: CLOSED-LOOP STATIC UX & ERGONOMICS AUDITOR');
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

  if (isStrict && (errors.length > 0 || warnings.length > 0)) {
    console.error('⛔ Modo estricto activado: Fallo por advertencias/errores de UX.');
    process.exit(1);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}
