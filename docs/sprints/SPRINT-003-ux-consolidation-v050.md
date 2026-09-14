# Sprint Spec & Runbook — SPRINT-003: Consolidación Integral de UX, Ergonomía Móvil & Release v0.5.0

- **Estado:** `Passed QA`
- **Fecha:** 2026-09-14
- **PM Lead:** PM Orchestrator
- **Epica / Item Backlog:** [P30 en docs/BACKLOG.md](file:///Users/adrisol/Pablo/code/m3/docs/BACKLOG.md#L477)
- **Target Release:** `v0.5.0` (Corte Mayor Consolidado: C3 Detector de Fugas + Ingesta Invertida/Mobills + Pulido de UX y Paridad i18n)

---

## 1. 🔍 [RESEARCH] Benchmark de Mercado & Diagnóstico de Fricciones (Market Researcher)
> Análisis de apps financieras referentes (Linear, Copilot Money, Mercury, Mobills) y auditoría estática de fricciones en el runtime móvil de DOM.

- **Referentes analizados:**
  1. **Copilot Money & Mercury:** Navegación en listas de transacciones sin micro-saltos de layout (*Layout Shift / CLS 0*). Todos los importes numéricos emplean tipografía tabular monoespaciada (`tabular-nums / font-mono-data`) para que los números no bailen ni colisionen al cambiar o filtrar.
  2. **Mobills (Ingesta & Conciliación):** Flexibilidad ante exportaciones heterogéneas. Muchas entidades bancarias (y el propio Mobills en tarjetas) exportan los débitos con signo invertido opositivo. La inversión de signos en 1-clic y el mapeo inteligente de categorías son indispensables para que una importación de 500 filas no requiera edición manual.
  3. **Linear:** Manejo de densidad visual con escala tipográfica limpia (nada de `text-[13.5px]` o `text-[11px]` arbitrarios; rigurosidad en `text-xs`, `text-sm`, `text-base`), y feedback táctil de 60/120 FPS (`active:scale-[0.98]`).

- **Diagnóstico del Auditor de UX en DOM (`scripts/audit-ux-code.cjs`):**
  - Se incorporaron 12 reglas estáticas de calidad de experiencia y ergonomía móvil:
    - `UX-001`: Invariante `es-AR` en separadores de miles y decimales.
    - `UX-002`: Atajos físicos (`⌘`, `<kbd>`) ocultos en pantallas móviles táctiles (`hidden sm:inline-flex`).
    - `UX-003`: Prevención de colisión entre gestos de reordenamiento (*drag*) y scroll vertical.
    - `UX-004`: Fuga de localización en fechas de `date-fns` (requiere `locale: activeLocale`).
    - `UX-005`: Flags móviles en inputs de email (`autoCapitalize="none"`, `autoCorrect="off"`).
    - `UX-006`: Touch targets mínimos de 44×44px (o compensación con hit-slop / padding).
    - `UX-007`: Eliminación de clases de texto arbitrarias (`text-[10px]`, `text-[11px]`, `text-[13px]`) normalizando hacia la escala canónica de Tailwind.
    - `UX-008`: Accesibilidad y lectores de pantalla en botones con solo icono (`aria-label`, `title`).
    - `UX-009`: Eliminación de paddings inferiores redundantes (`pb-28` anidados dentro de layouts que ya tienen `pb-32`).
    - `UX-010`: Feedback táctil inmediato en clickeables (`active:scale-[0.98]`).
    - `UX-011`: Montos numéricos siempre con `font-mono-data` / `tabular-nums`.
    - `UX-012`: Prevención de desbordes en flex containers con `min-w-0` y `truncate`.

---

## 2. 🎨 [DESIGN SPEC] Experiencia & Micro-interacciones (Product Designer)
> Anatomía visual, estados, motion y ergonomía móvil de calibre mundial para el paquete v0.5.0.

- **Jerarquía Visual en Transacciones (`TransactionList`):**
  - **Invariante de Dos Niveles en Mobile (< 640px):**
    - *Nivel 1 (Identidad y Monto):* Ícono de categoría + Columna de texto (`min-w-0 flex-1`) con descripción (`truncate`) y cuenta/fecha en `text-xs text-muted-foreground`. A la derecha, monto con espacio y tipografía tabular `font-mono-data tabular-nums`.
    - *Nivel 2 (Contexto y Tags):* Chips sutiles de tags, subcategoría o método de pago.
    - *Acciones Limpias:* 1 sola acción primaria visible o menú accesible `DropdownMenu` / `MoreVertical` (erradicación de *Action Creep*).
  - **Eliminación de Vacíos Excesivos de Scroll:** Remover `pb-28` redundante en `TransactionList` y `AccountManager` para que el scroll termine exactamente sobre la barra de navegación móvil respetando `pb-safe`.

- **Experiencia de Ingesta Masiva (`CsvImportSheet`):**
  - Selector de "Signos Invertidos" claramente visible en el paso de mapeo de columnas y botón de inversión rápida en 1-tap en la tabla de previsualización.
  - Mapeo automático de categorías por similitud fonética/semántica (`matchCategoryByName`).
  - Textos 100% traducidos al español e inglés sin microcopia huérfana.

---

## 3. ⚙️ [TECH ARCHITECTURE] Implementación & Robustez (Principal Engineer)
> Arquitectura de componentes, orden de hooks incondicionales, tipado estricto e i18n hermético.

- **Módulos y Archivos Involucrados:**
  1. `src/components/CsvImportSheet.tsx`:
     - Consolidación del flujo de importación con soporte de inversión de signo (`__sign_inverted__`) y auto-mapeo.
     - Extracción de cadenas hacia `src/lib/i18n.ts`.
  2. `src/components/TransactionList.tsx`:
     - Respeto incondicional de las Reglas de Hooks de React: todos los `useMemo` y `useCallback` residen antes de cualquier `return` de early-state o loading.
     - Reemplazo de tipografías arbitrarias por tokens canónicos (`text-xs`, `text-sm`).
     - Aplicación de `font-mono-data` en montos monetarios.
     - Remoción de `pb-28` redundante.
  3. `src/components/AccountManager.tsx`:
     - Corrección de `pb-28` redundante.
  4. `src/lib/i18n.ts`:
     - Paridad total (ES / EN) en las nuevas claves de importación, detector de fugas y acciones.
     - Erradicación de cadenas detectadas por `check-i18n.cjs` en `AccountCards.tsx`, `QuickAddSheet.tsx`, `RulesManager.tsx` y `SubscriptionAuditor.tsx`.
  5. `scripts/audit-ux-code.cjs`:
     - Auditor estático de UX cerrado con 12 verificaciones deterministas.

- **Invariante de Compilación & Calidad:**
  - Tolerancia cero a errores de compilación: `npx tsc --noEmit && npm run build`.
  - Tolerancia cero a advertencias críticas en `npm run audit:ux`.

---

## 4. 🛡️ [QA MATRIX & AUDIT] Auditoría de Calidad (Rigorous QA Auditor)
> Validación exhaustiva en mobile 375px, DevTools y suites automatizadas.

- **Checklist de Calidad:**
  - [x] Consola limpia de errores o advertencias (DevTools).
  - [x] Viewport mobile verificado (375px en iPhone SE sin desbordes horizontales ni empuje de flex).
  - [x] Cero violaciones de hooks en `TransactionList` durante cambios de filtro o estados vacíos.
  - [x] `node scripts/audit-ux-code.cjs` con 0 errores y 0 advertencias.
  - [x] `node scripts/check-i18n.cjs` con 100% paridad y 0 textos hardcodeados.
  - [x] `npm run test` pasando (134 tests unitarios verdes).
  - [x] `npm run check:all` completado exitosamente (6/6 checks en verde).
- **Veredicto:** `[ APROBADO PARA SHIPPED - TARGET v0.5.0 ]`

---

## 5. 🧠 [RETROSPECTIVA & MEMORIA] Aprendizajes para el Sistema
- **Trabajo Concurrente Multimodal:** Separación nítida de responsabilidades entre agentes (Agent A en tuning estático de auditoría e ingesta CSV, Agent B en arquitectura de orquestación, runbooks de sprint y consolidación de release).
- **Invariante de Hooks:** Los hooks condicionales o colocados después de returns tempranos en listas de transacciones provocan caídas silenciosas en producción; deben auditarse rigurosamente.
