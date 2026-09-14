# Playbook de Operación Multi-Agente — DOM (El dominio no se conquista. Se administra)

Este manual rige la dinámica de trabajo colaborativo en bucle (loop) entre los 5 roles de agentes para llevar DOM al estándar más alto del mercado de software financiero personal.

---

## 🚦 Matriz de Decisión Dinámica (Autonomía del Sistema)

El usuario no debe solicitar explícitamente qué rol o modo activar. El sistema clasifica de forma automática el input recibido en uno de los siguientes 3 modos operativos:

| Modo Operativo | Disparadores Típicos | Roles Involucrados | Overhead / Documentación |
| :--- | :--- | :--- | :--- |
| **Modo 1: Foco Quirúrgico** *(Fast-Track)* | Bugfix puntual, corrección de saldos o invariantes, ajuste tipográfico/copy, linter, tests fallidos. | **Principal Engineer** (control directo y exclusivo). | **Cero burocracia.** Sin spec documental. Cambio atómico + validación (`tsc` + tests). |
| **Modo 2: Dúo Táctico** *(Experiencia + Código)* | Rediseño de card/vista, nuevo modal/sheet, optimización ergonómica táctil, nuevo chart. | **Product Designer** + **Principal Engineer** (+ QA check). | **Ligero.** Especificación en el plan de chat. Sin archivo en `docs/sprints/` salvo que toque DB. |
| **Modo 3: Sprint Playbook Completo** | Feature nueva del backlog, cambios de modelo de datos en Supabase, flujos de negocio complejos. | **PM Orchestrator** liderando las 5 fases completas. | **Formal.** Documento de sprint en `docs/sprints/SPRINT-XXX-<slug>.md`. |

---

## 🤖 Autonomía de Subagentes: ¿Cuándo sumar manos vs. Cuándo tener foco?

El PM Orchestrator y el Principal Engineer deciden cuándo paralelizar tareas o delegar en subagentes (`browser_subagent`, background tasks) bajo una **regla de oro inquebrantable**:

> **"Foco absoluto en la lógica de dominio; manos paralelas en la exploración y verificación."**

### 🟢 Cuándo SÍ sumar manos (Subagentes / Paralelización):
1. **Auditoría de QA y Navegación Autónoma (`browser_subagent`):**
   - Al concluir un cambio de interfaz o flujo de usuario, despachar un subagente de navegador para navegar, probar formularios, auditar viewport de 375px y detectar errores de consola o desbordes sin bloquear al usuario ni el hilo principal.
2. **Research y Benchmarking Exploratorio:**
   - Para contrastar patrones de UX de la competencia (Linear, Copilot Money, Stripe) o revisar documentación externa mientras se planifica la arquitectura.
3. **Auditorías de Accesibilidad (a11y) y Performance:**
   - Ejecución de audits de contraste, árbol de accesibilidad o monitoreo de re-renders.

### 🔴 Cuándo mantener FOCO ABSOLUTO (Un solo hilo atómico, sin subagentes):
1. **Consistencia Contable e Invariantes de Balances:**
   - La matemática de saldos, deudas de tarjetas de crédito ($\le 0$) y recálculo atómico de transacciones requiere trazabilidad estricta. Prohibido fragmentar la lógica financiera en múltiples agentes simultáneos.
2. **Esquema de Base de Datos y Supabase RLS:**
   - `00000000000000_schema_foundation.sql` y deltas para producción deben ser gestionados por una única mente técnica (Principal Engineer) para garantizar idempotencia y seguridad.
3. **Refactors de Arquitectura / State Management:**
   - Modificaciones complejas de store, hooks centrales o sincronización offline-first.

---

## 🔄 El Bucle de Retroalimentación del Sprint (5 Fases)

```
       [ 1. Discovery & PM ]
                 │
                 ▼
       [ 2. Market Research ] ◄──────────┐
                 │                       │ (Ajustes de UX /
                 ▼                       │  Edge cases)
       [ 3. Design & Motion ]            │
                 │                       │
                 ▼                       │
       [ 4. Engineering & Build ]        │
                 │                       │
                 ▼                       │
       [ 5. QA Sentinel & Audit ] ───────┘
                 │
                 ▼ (Aprobación Unánime)
          [ Sprint Demo ] ──► [ Feedback a Reglas/Skills ]
```

### Fase 1: Briefing & Alineación (PM Orchestrator)
- **Entrada:** Un item del backlog o requerimiento del usuario.
- **Acción:** Abre un nuevo archivo en `docs/sprints/SPRINT-XXX-<slug>.md` usando la plantilla oficial.
- **Salida:** Problema claro, usuarios impactados y objetivos medibles.

### Fase 2: Investigación & Benchmarking (Market Researcher)
- **Acción:** Analiza cómo referentes mundiales (Linear, Notion, Stripe, Copilot Money, Obsidian) abordan esta experiencia.
- **Salida:** Escribe en la sección `[1. RESEARCH & BENCHMARKS]` del sprint doc los patrones ganadores, alertas de errores comunes y edge cases financieros.

### Fase 3: Diseño de Experiencia World-Class (Product Designer)
- **Acción:** Define la anatomía visual, tokens semánticos, animaciones y micro-interacciones.
- **Salida:** Completa la sección `[2. DESIGN & INTERACTION SPEC]` detallando estados táctiles, comportamientos móviles y retroalimentación sensorial.

### Fase 4: Arquitectura e Implementación (Principal Engineer)
- **Acción:** Escribe el código en TypeScript limpio, modular, sin mutaciones directas y con RLS blindado.
- **Validación previa obligatoria:** Ejecución de `npx tsc --noEmit && npm run build`.
- **Salida:** Completa `[3. TECHNICAL IMPLEMENTATION]` y entrega el build al QA Sentinel.

### Fase 5: Auditoría Implacable (QA Auditor)
- **Acción:** Inspecciona en navegador (Browser Subagent / DevTools), evalúa a11y, valida responsive en viewport de 375px y busca desbordes o parpadeos.
- **Loop de Corrección:** Si detecta cualquier fricción, devuelve la tarea al Ingeniero o Diseñador con el reporte exacto.
- **Salida:** Solo cuando el veredicto es 100% verde, firma `[4. QA SIGNOFF]` y el PM presenta el trabajo al usuario.

---

## 🧠 Protocolo de Aprendizaje y Memoria Viva (Knowledge Feeder)

Al cerrar cada sprint:
1. **¿Qué descubrimos sobre el comportamiento móvil o los inputs?** Se actualiza `.agents/skills/mobile-ux-design` o `.agents/skills/forms-rhf-zod`.
2. **¿Qué patrón de arquitectura o base de datos se probó superior?** Se documenta como ADR en `docs/decisions/`.
3. Ningún error de interfaz, accesibilidad o tipado se resuelve dos veces: **se convierte en una regla permanente del proyecto.**
4. **Retroalimentación Upstream Automatizada:** Al descubrir o perfeccionar una skill o herramienta de valor universal (ej: `code-level-ux-auditor`, scripts de auditoría estática), el agente ejecuta automáticamente `npm run playbook:sync` para sincronizarla sanitizada con el repositorio central `agentic-team-playbook` en GitHub sin intervención manual del usuario.

