# Quality Log & Tracker de Emergentes — DOM

Registro formal, estructurado y vivo de defectos, fricciones de UX/UI, problemas de rendimiento y deuda técnica para la mejora continua del producto.

---## 📊 Tablero Kanban de Emergentes

### 🔄 En Progreso
- *Ninguno. Todos los ítems del lote de 23 emergentes han sido resueltos y verificados.*

### ✅ Resueltos en este Sprint
- `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004`, `BUG-005`, `BUG-006`, `BUG-007`, `BUG-008`
- `BUG-009`, `BUG-010`, `BUG-011`, `BUG-012`, `BUG-013`
- `BUG-014`, `BUG-015`, `BUG-016`, `BUG-017`, `BUG-018`
- `BUG-019`, `BUG-020`, `BUG-021`, `BUG-022`, `BUG-023`, `BUG-024`

---

## 📋 Registro Detallado de Incidentes

| ID | Área | Descripción | Archivo Impactado | Severidad | Estado |
|---|---|---|---|:---:|:---:|
| **BUG-001** | UI / Layout | Salto de márgenes y desplazamiento vertical al alternar "Desglosado" vs "Agrupado por tarjeta". | `src/components/TransactionList.tsx` | Media | `[x] Resuelto` |
| **BUG-002** | UI / Mobile | Hacinamiento y texto hiper-truncado en filas de transacciones (`Servicios • S...`, chip de cuenta cortado). | `src/components/TransactionList.tsx` | Alta | `[x] Resuelto` |
| **BUG-003** | UI / Visual | Botón huérfano de calculadora `[ 🧮 ]` flotando en verde al lado del pill sin etiqueta ni contexto. | `src/components/TransactionList.tsx` | Media | `[x] Resuelto` |
| **BUG-004** | UI / Layout | Desajuste de márgenes exteriores: `NetWorthChart` (`mx-4`) vs resto de tarjetas (`px-4`). | `src/components/NetWorthChart.tsx` | Baja | `[x] Resuelto` |
| **BUG-005** | UI / Safe Areas | Solapamiento de contenido inferior por `BottomNav` (`pb-20` insuficiente para 98px de barra móvil). | `src/pages/Index.tsx` | Alta | `[x] Resuelto` |
| **BUG-006** | UI / Stacking | Botón flotante verde `(+)` traspasa visualmente por encima del panel lateral desplegado de "Más". | `src/components/BottomNav.tsx` | Media | `[x] Resuelto` |
| **BUG-007** | UI / Brand | Isotipo `DOMSymbol` en la cabecera del drawer "Más" sin contraste (recuadro gris oscuro/vacío). | `src/components/BottomNav.tsx` | Baja | `[x] Resuelto` |
| **BUG-008** | i18n / Localización | Fechas en inglés en listas e historial (`SEP 12, 2026`, `SEP 1, 2026`). | `src/components/TransactionList.tsx` | Media | `[x] Resuelto` |
| **BUG-009** | UX / Touch | Drag & drop roto en "Personalizar Home": captura scroll vertical del modal y dispara tarjetas a cualquier lado. | `src/components/DashboardCardPicker.tsx` | **Crítica** | `[x] Resuelto` |
| **BUG-010** | Performance | Re-render masivo a 60 FPS durante el scroll por `setPullDistance` síncrono en cada frame de `onTouchMove`. | `src/components/PullToRefresh.tsx` | **Crítica** | `[x] Resuelto` |
| **BUG-011** | Performance | Falta de memoización (`useMemo`) en cálculos de métricas del Dashboard en `Index.tsx`. | `src/pages/Index.tsx` | Alta | `[x] Resuelto` |
| **BUG-012** | Performance | Sobrecarga de Framer Motion en listas largas: múltiples `useMotionValue` y listeners simultáneos. | `src/components/TransactionList.tsx` | Media | `[x] Resuelto` |
| **BUG-013** | Performance | Falta de debounce en búsquedas y filtros en tiempo real, bloqueando el hilo de JS en cada tecla. | `src/components/TransactionFilters.tsx` | Media | `[x] Resuelto` |
| **BUG-014** | UX / Mobile | Atajos de teclado físico visibles en celular (`⌘K`, botón de teclado, letras `N`, `H`, `?` en `CommandMenu`). | `src/pages/Index.tsx` / `command.tsx` | Media | `[x] Resuelto` |
| **BUG-015** | UI / Diseño | Condiciones `contains_any` en Reglas colapsadas en columna vertical kilométrica de strings sin wrap. | `src/components/RulesManager.tsx` | Alta | `[x] Resuelto` |
| **BUG-016** | UI / Layout | Botones de Automatizaciones (`Ejecutar` y `Reglas Base`) apretados y con textos partidos en 3 líneas. | `src/components/RulesManager.tsx` | Media | `[x] Resuelto` |
| **BUG-017** | Auth / Sesión | Pérdida de sesión de `pabjrodriguez` tras releases/tiempo por `throwOnError: true` y timeout agresivo de 8s. | `src/integrations/supabase/client.ts` / `src/lib/auth-context.tsx` | **Crítica** | `[x] Resuelto` |
| **BUG-018** | Onboarding | Reaparición del wizard de Onboarding para usuarios existentes con cuentas y transacciones cargadas. | `src/pages/Index.tsx` / `src/lib/storage-migration.ts` | **Crítica** | `[x] Resuelto` |
| **BUG-019** | Dominio / Forms | Faltante de campos `note` (nota) y `tags` (etiquetas) en la pantalla de edición de transacciones. | `src/components/TransactionEditSheet.tsx` | Alta | `[x] Resuelto` |
| **BUG-020** | UX / Forms | Validaciones silenciosas en `QuickAddSheet` (sin feedback ni toast si falta categoría o cuenta). | `src/components/QuickAddSheet.tsx` | Media | `[x] Resuelto` |
| **BUG-021** | UX / Inputs | Uso de `<Input type="number">` nativo en filtros que rechaza comas decimales en mobile. | `src/components/TransactionFilters.tsx` | Media | `[x] Resuelto` |
| **BUG-022** | Sincronización | Presupuestos desconectados del mes de la cabecera (hardcodeado a `new Date().getMonth()`). | `src/components/BudgetManager.tsx` | Media | `[x] Resuelto` |
| **BUG-023** | Empty States | `AccountCards` dibuja un espacio vacío debajo de `(0)` sin invitar a crear la primera cuenta. | `src/components/AccountCards.tsx` | Media | `[x] Resuelto` |
| **BUG-024** | Auth / Mobile | Error de credenciales incorrectas al ingresar email y password válidos debido a espacios/mayúsculas del teclado móvil sin sanitizar. | `src/pages/Auth.tsx` | **Crítica** | `[x] Resuelto` |

---

## 🎯 Registro de Verificación por Fase

### Fase 1: Estabilidad Crítica, Sesión & Onboarding
- [x] `BUG-017` Verificado (Storage dual + timeout 25s + fallback seguro a local session sin bucle de refresco)
- [x] `BUG-018` Verificado (Detección de cuentas/transacciones existentes para silenciar onboarding retroactivamente)
- [x] `BUG-023` Verificado (Empty state punteado con CTA accionable `+ Crear cuenta` en carrusel de cuentas)
- [x] `BUG-024` Verificado (Sanitización trim/toLowerCase y flags autoCapitalize/autoCorrect en login de Auth.tsx)

### Fase 2: Rendimiento, Lag & Drag & Drop
- [x] `BUG-009` Verificado (Reemplazado Reorder de Framer Motion por motor nativo Pointer Events con `setPointerCapture`, aceleración GPU CSS a 120 FPS, auto-scroll en bordes del modal y botones de subir/bajar accesibles)
- [x] `BUG-010` Verificado (PullToRefresh optimizado con `requestAnimationFrame` y sincronismo de ref)
- [x] `BUG-011` Verificado (Cálculos de métricas, variaciones e ingresos/gastos memoizados con `useMemo` en Index)
- [x] `BUG-012` Verificado (React.memo en items de transacción y supresión de retrasos escalonados)
- [x] `BUG-013` Verificado (Debounce de 250ms en input de búsqueda con feedback instantáneo y botón de borrado)

### Fase 3: Layout Mobile, Márgenes & Navegación
- [x] `BUG-001` Verificado (Cabeceras de fecha y resúmenes unificados en altura y espaciado sin brincos visuales)
- [x] `BUG-004` Verificado (NetWorthChart alineado exactamente con padding uniforme `px-4 w-full mb-4`)
- [x] `BUG-005` Verificado (Padding inferior expandido a `pb-32` en mobile para despeje total del BottomNav)
- [x] `BUG-006` Verificado (FAB verde ocultado con transición al abrir el sheet "Más" de navegación)
- [x] `BUG-007` Verificado (Isotipo DOMSymbol renderizado en variante esmeralda con fondo y borde temáticos)

### Fase 4: Ergonomía de Tarjetas, Reglas & Micro-UI
- [x] `BUG-002` Verificado (Invariante de dos niveles: sin redundancia de categoría, chip de cuenta protegido)
- [x] `BUG-003` Verificado (Botón de calculadora integrado con icono y label contextual armónico)
- [x] `BUG-008` Verificado (Fechas localizadas al español con `date-fns/locale/es`)
- [x] `BUG-014` Verificado (Badges y botones de atajos de hardware ocultos en pantallas táctiles móviles)
- [x] `BUG-015` Verificado (Badges horizontales con wrap flexible para reglas con múltiples criterios)
- [x] `BUG-016` Verificado (Botones de automatizaciones con textos compactos y sin saltos antiestéticos)

### Fase 5: Formularios, Presupuestos & Verificación Final
- [x] `BUG-019` Verificado (Edición completa de notas y etiquetas en TransactionEditSheet con persistencia)
- [x] `BUG-020` Verificado (Feedback con toasts descriptivos y banner de advertencia si faltan cuentas/categorías)
- [x] `BUG-021` Verificado (Inputs de montos con `inputMode="decimal"` y parseo adaptado a formato regional `es-AR`)
- [x] `BUG-022` Verificado (Sincronización bidireccional del mes seleccionado entre Header y BudgetManager)
