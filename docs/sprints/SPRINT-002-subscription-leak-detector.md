# Sprint Spec & Runbook — SPRINT-002: Detector de Fugas & Auditor de Suscripciones (C3)

- **Estado:** `Passed QA`
- **Fecha:** 2026-09-14
- **PM Lead:** PM Orchestrator
- **Epica / Item Backlog:** [Épica C3 en docs/BACKLOG.md](file:///Users/adrisol/Pablo/code/m3/docs/BACKLOG.md#L437)
- **Target Release:** `v0.5.0`

---

## 1. 🔍 [RESEARCH] Benchmark de Mercado & Edge Cases (Market Researcher)
> Análisis de aplicaciones financieras referentes a nivel global (Rocket Money, Copilot Money, Monarch Money) y patrones de la industria de psicología financiera.

- **Referentes analizados:**
  1. **Rocket Money (ex-Truebill):** Pionero en la detección de micropagos recurrentes "fantasma". Su valor central radica en evidenciar el costo anualizado de suscripciones que el usuario percibe como "chicas" ($9/mes parecen poco, pero son $108/año y $600 con costo de oportunidad).
  2. **Copilot Money:** Interfaz minimalista con tarjeta de "Recurring" donde cada ítem tiene un estado de revisión (*Reviewed* vs *Needs Review*) y desglose de frecuencia.
  3. **Monarch Money:** Agrupación inteligente por comercio normalizado y cálculo de impacto porcentual sobre el flujo de ingresos libres.

- **Patrones de interacción destacados:**
  - **Shock visual positivo (Consciencia Financiera):** Mostrar el costo anual total proyectado en lugar de solo el importe mensual.
  - **Calculadora de Costo de Oportunidad:** ¿Qué pasaría si este dinero se ahorrara o invirtiera al 8% anual compuesto en 1, 3 y 5 años? Transforma el gasto en una decisión patrimonial activa.
  - **Acciones Rápidas en 1-Tap:** Calificar cada suscripción como *Indispensable*, *En duda* o *Fuga a cancelar*.

- **Edge cases identificados (financieros / UX):**
  - **Variación de precios:** Servicios de streaming o abonos que ajustan por inflación o tipo de cambio (ej: Netflix de $7.500 a $8.900). El algoritmo de agrupamiento debe tolerar una dispersión de hasta ±25% sin descartar la recurrencia.
  - **Intervalos irregulares de calendario:** Fechas de débito que caen en días hábiles (si el 15 cae domingo, se debita el 16 o 17). Rango de tolerancia de ±4 días.
  - **Suscripciones ya registradas como Obligaciones/Bills:** Cruzar con `bills` y `recurringTxs` para evitar duplicar alertas sobre compromisos que el usuario ya gestiona conscientemente.

- **Recomendaciones para el equipo:**
  - Diseñar una vista de auditoría inmersiva (`SubscriptionAuditor`) con paleta soberana DOM (fondo carbón `#0c0e12`, acentos ámbar/esmeralda).
  - Incluir persistencia local reactiva para las clasificaciones del usuario (`dom-subscription-audits`).
  - Proporcionar acción directa para crear un recordatorio de vencimiento/cancelación o registrar como obligación fija.

---

## 2. 🎨 [DESIGN SPEC] Experiencia & Micro-interacciones (Product Designer)
> Anatomía visual, estados, motion y ergonomía móvil de calibre mundial para DOM.

- **Tokens & Jerarquía Visual:**
  - **Contenedor Principal:** Modal / Drawer responsivo (`SubscriptionAuditorSheet`) con cabecera de impacto:
    - *Hero Card de Consciencia:* Monto total fugado/comprometido mensual + Proyección a 3 años con interés compuesto en acento dorado/ámbar.
    - *Selector de Filtro Tipo Píldora:* `Todas`, `Detectadas`, `En Duda (🟡)`, `Fugas (🔴)`, `Indispensables (🟢)`.
  - **Invariante de Dos Niveles en Tarjeta Móvil:**
    - Fila 1: Ícono de categoría + Nombre de servicio/comercio (`truncate`) + Monto periódico en tipografía tabular mono (`font-mono-data`).
    - Fila 2: Proyección anual sutil + Selector de chips de estado con toque mínimo de 44px.

- **Comportamiento Móvil & Touch Targets (≥ 44px):**
  - Botones de diagnóstico táctiles:
    - 🟢 *Indispensable* (`active:scale-95`)
    - 🟡 *En duda* (`active:scale-95`)
    - 🔴 *Fuga* (`active:scale-95`)
  - Área segura inferior (`pb-safe`) y scroll elástico a 60 FPS.

- **Micro-interacciones y Feedback Sensorial:**
  - Respuesta háptica (`navigator.vibrate?.(12)`) al cambiar el estado de una suscripción.
  - Transición suave de entrada (`motion.div` con `y: 8, opacity: 0` -> `y: 0, opacity: 1`).

---

## 3. ⚙️ [TECH ARCHITECTURE] Implementación & Robustez (Principal Engineer)
> Arquitectura de componentes, custom hooks, detección heurística y tipado estricto.

- **Archivos creados o modificados:**
  - `src/lib/subscription-detector.ts`: Algoritmo de detección heurística, normalización de strings y calculadora de interés compuesto.
  - `src/components/SubscriptionAuditor.tsx`: Componente de auditoría y gestión de estado de suscripciones.
  - `src/components/ObligationsManager.tsx`: Pestaña y CTA contextual hacia el Auditor de Suscripciones.
  - `src/components/GlobalCommandMenu.tsx`: Comando de acceso rápido `Cmd+K` -> *"Auditor de Suscripciones y Fugas"*.
  - `src/lib/i18n.ts`: 100% de paridad en traducciones bilingües.
  - `src/test/subscription-detector.test.ts`: Tests unitarios automatizados.

- **Tipado & Esquemas:**
  ```typescript
  export type SubscriptionVerdict = 'essential' | 'review' | 'leak' | 'unreviewed';

  export interface DetectedSubscription {
    id: string;
    normalizedName: string;
    originalDescriptions: string[];
    averageAmount: number;
    currency: string;
    frequency: 'monthly' | 'weekly' | 'yearly';
    lastDate: string;
    occurrencesCount: number;
    annualCost: number;
    opportunityCost3Y: number;
    opportunityCost5Y: number;
    verdict: SubscriptionVerdict;
    notes?: string;
    existingBillId?: string;
  }
  ```

- **Validación de Compilación previa obligatoria:**
  - `npx tsc --noEmit && npm run build` (Tolerancia cero a errores de compilación).

---

## 4. 🛡️ [QA MATRIX & AUDIT] Auditoría de Calidad (Rigorous QA Auditor)
> Validación exhaustiva en navegador, a11y WCAG y stress test.

- **Checklist de Calidad:**
  - [x] Consola limpia de errores o advertencias (DevTools).
  - [x] Viewport mobile verificado (375px en iPhone SE sin desbordes).
  - [x] Ergonomía de toques auditada (≥ 44px).
  - [x] Invariante regional `es-AR` garantizada (formateo con puntos en montos de impacto).
  - [x] Tests automáticos pasando al 100%.
- **Veredicto:** `[ APROBADO PARA SHIPPED - TARGET v0.5.0 ]`

---

## 5. 🧠 [RETROSPECTIVA & MEMORIA] Aprendizajes para el Sistema
- Detección de patrones temporales normalizados en el navegador sin sobrecargar la base de datos de Supabase.
- Sincronización automática de herramientas universales con `agentic-team-playbook`.
