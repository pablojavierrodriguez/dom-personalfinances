const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Verify i18n key parity
const i18nContent = fs.readFileSync(path.join(ROOT_DIR, 'src/lib/i18n.ts'), 'utf8');
const lines = i18nContent.split('\n');
let currentLang = null;
const esKeys = new Set();
const enKeys = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^\s*es:\s*\{/.test(line)) { currentLang = 'es'; continue; }
  if (/^\s*en:\s*\{/.test(line)) { currentLang = 'en'; continue; }
  if (/^\s*\},/.test(line)) { currentLang = null; continue; }
  const m = line.match(/^\s*"([^"]+)":/);
  if (m && currentLang === 'es') esKeys.add(m[1]);
  if (m && currentLang === 'en') enKeys.add(m[1]);
}

const missingEn = [...esKeys].filter(k => !enKeys.has(k));
const missingEs = [...enKeys].filter(k => !esKeys.has(k));

console.log(`[i18n-audit] Claves en ES: ${esKeys.size} | Claves en EN: ${enKeys.size}`);
let hasErrors = false;

if (missingEn.length > 0 || missingEs.length > 0) {
  console.error('❌ [i18n-audit] Error de paridad entre diccionarios:');
  if (missingEn.length) console.error('   Faltan en EN:', missingEn);
  if (missingEs.length) console.error('   Faltan en ES:', missingEs);
  hasErrors = true;
} else {
  console.log('✅ [i18n-audit] 100% de paridad entre ES y EN.');
}

// 1b. Verify that English values do not contain untranslated Spanish action keywords
const enSection = i18nContent.split(/^\s*en:\s*\{/m)[1] || '';
const untranslatedSpanishRegex = /\b(BORRAR|GUARDAR|CANCELAR|ELIMINAR|ACEPTAR|CONFIGURACIÓN|CONFIGURACION)\b/;
const enLines = enSection.split('\n');
const enSpanishLeaks = [];

for (let i = 0; i < enLines.length; i++) {
  const line = enLines[i];
  if (/^\s*\}/.test(line) && !line.includes(':')) break;
  const match = line.match(/^\s*"([^"]+)":\s*"([^"]+)"/);
  if (match) {
    const [, key, value] = match;
    if (untranslatedSpanishRegex.test(value)) {
      enSpanishLeaks.push({ key, value });
    }
  }
}

if (enSpanishLeaks.length > 0) {
  console.error('❌ [i18n-audit] Términos en español detectados dentro del diccionario EN:');
  enSpanishLeaks.forEach(item => console.error(`   ${item.key}: "${item.value}"`));
  hasErrors = true;
} else {
  console.log('✅ [i18n-audit] Sin residuos de términos en español en diccionario EN.');
}

// 2. Scan TSX files for hardcoded strings
function getTsxFiles(dir) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (!p.includes('node_modules') && !p.includes('/ui')) {
        res = res.concat(getTsxFiles(p));
      }
    } else if (p.endsWith('.tsx') && !p.endsWith('.test.tsx')) {
      res.push(p);
    }
  }
  return res;
}

const files = [
  ...getTsxFiles(path.join(ROOT_DIR, 'src/components')),
  ...getTsxFiles(path.join(ROOT_DIR, 'src/pages')),
];

// Combine common Spanish and English UI words that should never appear unlocalized
const FORBIDDEN_WORDS = [
  // Spanish
  'Guardar', 'Cancelar', 'Eliminar', 'Editar', 'Agregar', 'Buscar', 'Confirmar',
  'Categoría', 'Categorías', 'Categorias', 'Descripción', 'Monto', 'Fecha', 'Detalles',
  'Cargando', 'Presupuesto', 'Presupuestos', 'Transacciones', 'Tarjetas',
  'Cuentas', 'Ingresos', 'Gastos', 'Ahorros', 'Saldo', 'Configuración',
  'Reportes', 'Vencimientos', 'Compromisos', 'Siguiente', 'Anterior', 'Finalizar',
  'Cerrar', 'Limpiar', 'Exportar', 'Importar', 'Sin categoría', 'No hay', 'Completar Compra',
  'Reabrir', 'Archivar', 'Activas', 'Completadas', 'Nombre de la lista', 'Nombre del ítem',
  'Perfil', 'Nombre', 'Contraseña', 'Atajos', 'Acciones', 'Movimientos', 'Historial',
  'Pendiente', 'Pagado', 'Vencido', 'Nuevo', 'Nueva', 'Crear', 'Modificar', 'Restablecer',
  'Moneda', 'Idioma', 'Seguridad', 'General', 'Avanzado', 'Estado', 'Opciones', 'Novedades',
  'Bienvenido', 'Iniciar sesión', 'Cerrar sesión', 'Registrate', '¿Olvidaste',
  // English hardcoded
  'Save', 'Cancel', 'Delete', 'Edit', 'Add', 'Search', 'Confirm',
  'Category', 'Categories', 'Description', 'Amount', 'Date', 'Details',
  'Loading', 'Budget', 'Budgets', 'Transactions', 'Cards',
  'Accounts', 'Income', 'Expenses', 'Savings', 'Balance', 'Settings',
  'Reports', 'Obligations', 'Next', 'Previous', 'Finish', 'Close', 'Clear'
];

const spanishCharRegex = /(>[^<>{}]*[áéíóúÁÉÍÓÚñÑ¿¡][^<>{}]*<|placeholder="[^"]*[áéíóúÁÉÍÓÚñÑ¿¡][^"]*"|title="[^"]*[áéíóúÁÉÍÓÚñÑ¿¡][^"]*"|aria-label="[^"]*[áéíóúÁÉÍÓÚñÑ¿¡][^"]*"|label="[^"]*[áéíóúÁÉÍÓÚñÑ¿¡][^"]*"|toast\.[a-z]+\(\s*["\x27][^"\x27]*[áéíóúÁÉÍÓÚñÑ¿¡][^"\x27]*["\x27])/;

const forbiddenRegexes = FORBIDDEN_WORDS.map(word => ({
  word,
  regex: new RegExp(`(>[^<]*\\b${word}\\b[^<]*<|placeholder="[^"]*\\b${word}\\b|title="[^"]*\\b${word}\\b|aria-label="[^"]*\\b${word}\\b|label="[^"]*\\b${word}\\b|toast\\.[a-z]+\\(\\s*["\x27][^"\x27]*\\b${word}\\b)`, 'i')
}));

let totalHardcoded = 0;
const report = [];

for (const file of files) {
  // Exclude LandingPage as it is an external static presentation page
  if (file.endsWith('Landing.tsx')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const fileLines = content.split('\n');
  const relPath = path.relative(ROOT_DIR, file);

  fileLines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) return;
    if (trimmed.includes('t("') || trimmed.includes("t('") || trimmed.includes('{t(')) return;

    // Strip curly braces { ... } from JSX line to test only literal text
    const textOnlyLine = trimmed.replace(/\{[^}]*\}/g, '');

    // 1. Check for Spanish-specific characters (á, é, í, ó, ú, ñ, ¿, ¡) in UI text
    if (spanishCharRegex.test(textOnlyLine)) {
      report.push({ file: relPath, line: idx + 1, word: 'spanish-chars', content: trimmed });
      totalHardcoded++;
      return;
    }

    for (const { word, regex } of forbiddenRegexes) {
      if (regex.test(textOnlyLine)) {
        report.push({ file: relPath, line: idx + 1, word, content: trimmed });
        totalHardcoded++;
        break;
      }
    }
  });
}

console.log(`[i18n-audit] Se encontraron ${totalHardcoded} ocurrencias de textos en bruto en ${new Set(report.map(r => r.file)).size} archivos.`);
if (report.length > 0) {
  const byFile = {};
  for (const r of report) {
    byFile[r.file] = (byFile[r.file] || 0) + 1;
  }
  console.log('[i18n-audit] Detalle por archivo:');
  for (const [f, count] of Object.entries(byFile)) {
    console.log(`  - ${f}: ${count} textos hardcodeados`);
  }
  console.log('\n[i18n-audit] Ocurrencias detalladas:');
  report.forEach(r => {
    console.log(`  ${r.file}:${r.line} [palabra: ${r.word}] -> ${r.content}`);
  });
}

// 3. Scan code for referenced translation keys and verify they exist in dictionary
const orphanKeys = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const tKeyRegex = /\bt\(\s*["']([a-zA-Z0-9_.-]+)["']/g;
  let match;
  while ((match = tKeyRegex.exec(content)) !== null) {
    const key = match[1];
    if (!esKeys.has(key)) {
      orphanKeys.push({ file: path.relative(ROOT_DIR, file), key });
    }
  }
}

if (orphanKeys.length > 0) {
  console.error(`\n❌ [i18n-audit] Se encontraron ${orphanKeys.length} claves huérfanas invocadas con t("...") que NO existen en el diccionario:`);
  orphanKeys.forEach(o => console.error(`  - ${o.file}: clave "${o.key}" no existe en i18n.ts`));
  hasErrors = true;
} else {
  console.log('✅ [i18n-audit] 100% de las claves invocadas con t("...") existen en el diccionario.');
}

if (hasErrors || totalHardcoded > 0) {
  console.log('\n❌ [i18n-audit] La aplicación aún contiene cadenas hardcodeadas, claves huérfanas o falta de paridad.');
  process.exit(1);
} else {
  console.log('\n🎉 [i18n-audit] ¡COMPLETO! 0 textos hardcodeados, 0 claves huérfanas y 100% paridad ES/EN.');
}
