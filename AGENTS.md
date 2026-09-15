# Global Agent Instructions — DOM (El dominio no se conquista. Se administra)

---

## Idioma

- Responder **siempre en español**, sin excepción.
- Código, variables, funciones y comentarios técnicos: **en inglés**.
- Documentación de producto y decisiones de arquitectura: **en español**.

---

## Comportamiento general

1. **Plan antes de ejecutar.** Ante cualquier tarea no trivial, presentar un plan claro antes de escribir código o hacer cambios. Esperar confirmación.
2. **Preguntar cuando haya ambigüedad real.** No asumir. Si hay más de una interpretación razonable, preguntar antes de avanzar.
3. **Soluciones simples que escalen.** Evitar over-engineering. La solución más simple que resuelva el problema correctamente y pueda crecer es la correcta.
4. **Documentar decisiones importantes.** Cualquier decisión de arquitectura, patrón o desvío del estándar del proyecto debe quedar documentado.
5. **No romper lo que funciona.** Antes de refactorizar, entender el impacto completo y pedir confirmación al usuario antes de actuar.
6. **Ante inconsistencia entre reglas y código, consultar al usuario antes de actuar.**
7. **Autonomía y Decisión Dinámica de Modos de Trabajo:** El usuario no debe solicitar explícitamente cuándo usar el playbook o qué rol activar. El agente clasifica automáticamente cada input entre: (a) *Foco Quirúrgico / Fast-Track* (Principal Engineer directo para bugfixes/invariantes, cero burocracia), (b) *Dúo Táctico* (Designer + Engineer para rediseños de UI/modales), o (c) *Sprint Playbook Completo* (PM Orchestrator liderando las 5 fases para features del backlog o cambios estructurales). Consultar [.agents/TEAM_PLAYBOOK.md](file:///Users/adrisol/Pablo/code/m3/.agents/TEAM_PLAYBOOK.md).
8. **Autonomía de Subagentes (Paralelización vs. Foco):** Regla de oro: *"Foco absoluto en la lógica de dominio; manos paralelas en la exploración y verificación"*. El PM o Principal Engineer deciden cuándo convocar subagentes (`browser_subagent` para QA visual/a11y en mobile 375px, benchmarking) y cuándo mantener foco exclusivo en un solo hilo secuencial (invariantes de balances, contabilidad, esquemas de Supabase y RLS).
9. **Retroalimentación Autónoma Upstream:** Al cerrar sprints o crear herramientas, scripts o skills de valor universal, el agente ejecuta automáticamente la sincronización con el repositorio central `agentic-team-playbook` (`npm run playbook:sync`) para mantener actualizada la memoria del sistema global sin requerir intervención manual del usuario.
10. **Protocolo Inviolable de Bucle Cerrado UX (Closed-Loop Engine):** Prohibido delegar el control de calidad visual en el usuario ("listo, probalo vos"). Toda tarea con impacto en UI debe superar el linter estático (`npm run audit:ux`) integrado en `check:all`, erradicar clases arbitrarias (`text-[...px]`, `rounded-[...px]`), garantizar touch targets de ≥ 44px y auditar previamente con `browser_subagent` en viewport de 375px (cero overflow horizontal, cero errores de consola y jerarquía limpia tipo *Linear*).

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **UI:** shadcn/ui + Radix UI + Framer Motion
- **Formularios:** React Hook Form + Zod
- **Charts:** Recharts
- **Testing:** Vitest + Testing Library

---

## Buenas prácticas innegociables

- **Tolerancia cero a errores de compilación y problemas en el editor (Validación obligatoria)**: Ante cualquier cambio de código en cualquier archivo del proyecto (frontend, backend o scripts), es obligatorio validar que el proyecto compila sin errores mediante `npx tsc --noEmit && npm run build`. Prohibido entregar cambios o dar por concluida una tarea con errores de tipado, imports rotos o problemas que generen pantallas en blanco.
- **Invariante Numérica y Formato de Moneda (`es-AR`)**:
  - Toda visualización de montos monetarios o números mayores a 999 DEBE formatearse con punto para miles y coma para decimales (ej. `5.000.000,00` o `1.250`). Centralizar siempre mediante `formatAmount` / `toLocaleString("es-AR")`.
  - Prohibido dejar valores numéricos crudos formateados con comas para miles (`5,000,000`).
  - En inputs editables con teclado, procesar con utilidades bidireccionales (`formatThousandsInput` y `parseThousandsInput`), evitando `<input type="number">` nativo que rechaza comas decimales en mobile.
- **Invariantes de Dominio Financiero (Pasivos y Patrimonio Neto)**:
  - Todo pasivo financiero (deudas de tarjetas de crédito, préstamos) debe mantenerse garantizado como saldo no positivo (`balance <= 0`) en base de datos, servicios y stores (`Math.min(0, balance)` o `-Math.abs(balance)`). Prohibido permitir que un pasivo sume como activo al patrimonio neto (*Net Worth*).
- **Homogeneidad de UI y reutilización**: Respetar el Design System y los componentes base en `src/components/ui`. Toda vista similar debe compartir los mismos tokens, espaciados y microtipografía.
- **Seguridad**: validar y sanitizar inputs siempre (Zod schemas). Políticas RLS activas en todas las tablas de Supabase. Nunca exponer secrets o service role keys en código cliente o repositorios.
- **Inputs controlados**: Todo `<input>` o `<textarea>` debe tener valor inicial definido (usar `""` en lugar de `undefined`) para evitar warnings de componentes no controlados a controlados.
- **Eficiencia y optimización de tokens**:
  - **Lecturas quirúrgicas**: Usar `view_file` con rangos de líneas o `grep_search` en lugar de leer archivos completos.
  - **Modificaciones compactas**: Priorizar `replace_file_content` o `multi_replace_file_content` sobre reescrituras completas.
  - **Progressive disclosure**: Consultar las guías detalladas en Skills (`.agents/skills/`) según la tarea en curso.

---

## Reglas de Git — Commits y Pushes

> [!CAUTION]
> **NUNCA realizar commits ni pushes sin autorización expresa y explícita del usuario para CADA acción.**

- **PROHIBIDO INFERIR PERMISOS:** La aprobación previa de un commit o push NUNCA otorga permiso tácito para ejecutar commits o pushes posteriores.
- **PALABRAS DE TAREA NO SON PERMISO DE COMMIT:** Frases como *"ok"*, *"adelante"*, *"armalo"*, *"hacelo"*, *"listo"* o *"procedé"* significan **exclusivamente implementar o editar el código**, **JAMÁS** ejecutar `git commit` ni `git push`.
- **REGLA DE ACCIÓN ÚNICA Y VERBAL:** Cada commit y cada push requiere un mensaje de autorización individual que contenga la palabra *"commit"* o *"push"* explícita.
- **MENSAJES DE COMMIT AUTODESCRIPTIVOS Y DETALLADOS:**
  - Prohibido usar mensajes vagos, genéricos o basados en jerga de sesión/sprints (ej: *"fix bugs"*, *"sprint 1-4"*, *"update files"*).
  - El título debe resumir claramente el impacto principal del cambio.
  - Cuando el commit englobe múltiples cambios, es obligatorio incluir un cuerpo descriptivo estructurado (macro-resumen y viñetas por módulo: Core, UI, DB, etc.) que explique con precisión **qué** se modificó para que cualquier persona externa entienda el contenido del commit sin haber estado presente.
- **PROHIBIDO COMMITS A ESCONDIDAS O ENCADENADOS EN SILENCIO:** Todo commit debe ser visible y acordado. Prohibido ejecutar commits o pushes encubiertos o improvisar commits adicionales como parte de una "cadena de tareas".
- **REVOCACIÓN AUTOMÁTICA ANTE ERRORES O PAUSAS:** Si el usuario solicita un commit pero inmediatamente después (o en paralelo) reporta un error de consola, runtime, advertencia o expresa duda/freno (ej. *"me apresuré..."*, logs de Vite/React, comportamientos anómalos), **toda autorización previa de commit queda inmediatamente anulada y sin efecto**. El agente debe diagnosticar, solucionar el bug, verificar con tests y compilación, y **terminar el turno mostrando la corrección y esperando nueva confirmación explícita sin tocar Git**.
- **EQUILIBRIO ENTRE AMEND Y COMMITS INDEPENDIENTES:**
  - **Ajustes menores detectados en caliente** (correcciones puntuales de 10-15 líneas en el mismo flujo de prueba, typos o detalles de estilo): justificado el uso de `git commit --amend` sobre el cambio reciente para no ensuciar el historial con micro-commits irrelevantes, previa confirmación del usuario.
  - **Refactors mayores o bugs con impacto estructural**: deben registrarse en un **commit independiente** para mantener la trazabilidad limpia y aislada.
- Ante la duda, terminar el turno mostrando lo que se modificó y esperar la orden de commit del usuario.

---

### 🚀 Política de releases y versionado (Release Management)

- **PROHIBIDO INCREMENTAR VERSIONES EN TAREAS COTIDIANAS:** Durante el desarrollo diario de features o bugfixes, **NUNCA** se debe modificar `version` en `package.json`, ni crear cabeceras de nuevas versiones cerradas en `docs/RELEASE_NOTES.md`. Todo trabajo nuevo o parcial reside obligatoriamente bajo `## [Unreleased] — En Desarrollo (Próxima Versión)`.
- **Corte de Release Exclusivo:** El proceso de release se ejecuta **única y exclusivamente cuando el usuario lo solicite de forma explícita** (ej: *"preparemos el release v0.2.0 para producción"* o *"hagamos el corte de versión"*).
- **Flujo al ejecutar un Corte de Release (solicitado por el usuario):**
  1. **Compilación previa obligatoria:** Validar con `npm run check:all` (`check-release-integrity`, `tsc --noEmit`, `vitest`, `npm run build`).
  2. **Incrementar `version` en `package.json`:**
     - Paquete con nuevas features $\rightarrow$ **MINOR** (`0.1.0` $\rightarrow$ `0.2.0`).
     - Paquete exclusivo de hotfixes $\rightarrow$ **PATCH** (`0.1.0` $\rightarrow$ `0.1.1`).
  3. **Consolidar en `docs/RELEASE_NOTES.md` (Enfoque 100% User-Facing):**
     - Mover los puntos de `## [Unreleased]` a la nueva versión cerrada formal: `## [X.Y.Z] — YYYY-MM-DD 🚀 <Título>`.
     - **Prohibido incluir identificadores internos:** ni números de SPEC (`SPEC-020`), ni nombres de branches, ni nombres de scripts SQL/deltas temporales. Describir capacidades arquitectónicas y valor funcional para el usuario.
     - Restablecer una nueva cabecera vacía `## [Unreleased] — En Desarrollo (Próxima Versión)` arriba de todo.
  4. **Base de Datos para Producción (Delta Único):**
     - Consolidar todos los cambios DDL/RPC en un único delta idempotente en `supabase/migrations/delta/YYYYMMDD_<nombre>.sql` listo para aplicar en Supabase Cloud.
  5. **Purgado de Backlog:**
     - Mover y actualizar ítems completados en `docs/BACKLOG.md`. El historial detallado de lo entregado vive en `docs/RELEASE_NOTES.md`.
  6. **Solicitud de Git interactiva (OBLIGATORIO):**
     - Presentar la propuesta de commit (`release(vX.Y.Z): ...`) y de tagging (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`).
     - **Esperar confirmación verbal explícita antes de ejecutar `git commit`, `git tag` o `git push`.**
  7. **Publicación Oficial de GitHub Release (OBLIGATORIO):**
     - Inmediatamente tras el push del tag y las ramas, publicar la release formal en GitHub mediante `gh release create vX.Y.Z --title "DOM vX.Y.Z — <Título>" --notes "<extracto_user_facing>"`.
     - Prohibido dejar el tag huérfano sin GitHub Release formal; garantizar que la barra lateral del repositorio muestre la nueva versión como `Latest`.
  - Consultar siempre la skill [.agents/skills/release-management/SKILL.md](file:///Users/adrisol/Pablo/code/m3/.agents/skills/release-management/SKILL.md).

---

## Design System & UX

- **Colores:** Usar preferentemente tokens semánticos de Tailwind (`primary`, `secondary`, `accent`, `destructive`, `muted`, `background`, `card`, `border`).
- **Gradientes:** Usar las clases de utilidad del proyecto (`gradient-primary`, `gradient-card`) o tokens semánticos en lugar de combinaciones ad-hoc con colores arbitrarios.
- **Mobile First & Ergonomía táctil:**
  - Tamaño de toque mínimo de **44×44px** en elementos interactivos principales (mínimo 36px con padding en secundarios).
  - Feedback visual táctil activo (`active:scale-[0.98]` o transiciones suaves).
  - Modales con scroll vertical seguro (`max-h-[90vh] overflow-y-auto`).
- **Estructura Anti-Hacinamiento en Tarjetas Móviles (Invariante de Dos Niveles):**
  - **Prohibido empaquetar más de 2 datos primarios en una sola fila horizontal** en tarjetas móviles (`< 640px`).
  - **Fila 1 (Identidad y Monto):** Ícono de categoría + Columna con Nombre (`truncate`) y Cuenta bancaria (`min-w-0 flex-1`). A la derecha: Monto grande con respiro (`font-mono-data tabular-nums`).
  - **Fila 2 (Contexto y Workflow):** Chips sutiles separados para estado de vencimiento y modalidad (`Débito auto` vs `Pago manual`).
  - **Fila 3 (Acciones):** Estado a la izquierda y botones de acción a la derecha.
- **Límite de Acciones por Fila (`Action Creep`):**
  - Prohibido colocar 3 o 4 botones de acción visibles en una sola fila de lista/tabla en mobile.
  - Mantener **1 sola acción primaria visible** (ej: botón `+` de subcategoría o botón `Pagar`).
  - Todas las acciones secundarias (Editar, Archivar, Eliminar, Ajustar) deben agruparse dentro de un menú accesible (`DropdownMenu` / `MoreVertical`).
- **Recharts responsivo:** Todo gráfico debe estar contenido en `ResponsiveContainer` con altura fija en el contenedor padre.
- **Formularios con RHF y Zod:** Siempre inferir el tipo con `z.infer<typeof schema>` e inicializar campos con strings vacíos `""` en `defaultValues`.

---

## Supabase & Database Standards

- **RLS obligatorio:** Toda tabla en `public` debe tener Row Level Security activado.
- **Funciones SECURITY DEFINER:** Siempre especificar `SET search_path = public, pg_temp`.
- **Subqueries en Auth:** Envolver llamadas a funciones de auth en subqueries: `(select auth.uid())`.
- **Taxonomía y Organización de `supabase/`:**
  - `migrations/00000000000000_schema_foundation.sql`: **Única fuente de verdad** del esquema completo para desarrollo local e inicialización determinista (`supabase db reset`). Prohibido crear migraciones parche para el entorno local.
  - `migrations/delta/YYYYMMDD_<nombre>.sql`: Deltas SQL idempotentes exclusivos para aplicar en Supabase Cloud / Producción.
  - `migrations/archive/`: Migraciones históricas previas a la consolidación y snapshots legados (`archive/releases/`) (solo referencia histórica, no se ejecutan).
  - `seed.sql`: Datos semilla oficiales para desarrollo local.
  - `functions/`: Edge Functions en Deno (`Deno.serve`).
  - `templates/`: Plantillas HTML oficiales de correos transaccionales y Auth.
  - `snippets/`: Scripts utilitarios puntuales, nombrados y documentados (ej: `clear_seed_data.sql`).
- **Higiene estricta de `supabase/`:**
  - **Prohibido commitear `Untitled query *.sql`:** Si se usa Supabase Studio para consultas de prueba, cerrar o eliminar las pestañas temporales antes de cerrar la tarea. Si una consulta tiene valor recurrente, debe nombrarse y documentarse descriptivamente en `snippets/`.
  - **Prohibido crear subcarpetas `deltas` en `snippets/`:** Todo delta para Cloud reside obligatoriamente en `supabase/migrations/delta/`.

