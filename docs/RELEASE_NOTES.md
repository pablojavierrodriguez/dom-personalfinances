# Release Notes - DOM (ex-IMPERO)

---

## [Unreleased] — En Desarrollo (Próxima Versión)

---

## [0.4.0] — 2026-09-13 🚀 Identidad Soberana DOM, Geometría SIGIL y Gestión de Perfil

### 🎯 Resumen
Consolidación de la identidad soberana definitiva **DOM - Finanzas Personales Soberanas** ("El dominio no se conquista. Se administra."): transición integral de marca hacia una estética monolítica de alta gama con geometría matemática **SIGIL** (monograma "D" con contraforma circular concéntrica equilibrada en muros de 99px); preservación absoluta de datos con migración en cadena de almacenamiento local; sistema de diseño enriquecido con tipografía contemporánea de alta precisión (`Space Grotesk`), componentes reactivos `DOMSymbol` y `DOMLogo`, y temas visuales con ratio de contraste WCAG AAA; gestión integral de perfil de usuario con carga de avatar en almacenamiento seguro y sincronización bidireccional; rediseño de las 8 plantillas transaccionales de correo electrónico; y actualización del canal de WhatsApp.

### ✨ Nuevas Funcionalidades y Mejoras

#### 🏛️ Identidad de Marca Soberana DOM & Geometría SIGIL
- **Monograma y Logotipo Arquitectónico (`DOMSymbol` & `DOMLogo`):**
  - Símbolo distintivo basado en la geometría **SIGIL**: monograma "D" forjado con una contraforma interior circular concéntrica perfecta que forma un sello de precisión matemática sobre fondo carbón profundo (`#0c0e12`).
  - Soporte de variantes modulares (`default`, `emerald`, `gold`, `monochrome`, `badge`) integradas en barra de navegación de escritorio (`DesktopSidebar`), navegación móvil (`BottomNav`), pantallas de autenticación (`Auth`), página de bienvenida (`Landing`) y asistente de inicio (`OnboardingWizard`).
  - Tipografía contemporánea `Space Grotesk` (`.font-brand`) con métrica arquitectónica y espaciado noble, complementando la legibilidad de la tipografía de datos sin distorsión visual.
- **Tokens de Color y Accesibilidad (WCAG AAA):**
  - Incorporación del tema unificado con fondo carbón `#0c0e12` y contrastes de 8.4:1 en acentos dorados/esmeralda y 19.4:1 en textos principales sobre superficie oscura.

#### 👤 Gestión de Perfil de Usuario y Avatares
- **Carga y Personalización de Avatar (`UserProfile`):**
  - Selector interactivo de imagen de perfil con previsualización inmediata y optimización de carga.
  - Almacenamiento seguro en la nube y persistencia en tiempo real en la cuenta del usuario.
- **Sincronización Bidireccional de Perfil:**
  - Persistencia unificada entre datos de sesión y ficha de perfil en base de datos.
  - Conservación íntegra de nombre completo, avatar y preferencias de usuario.

#### 🛡️ Retrocompatibilidad y Migración de Almacenamiento Local (Cero Pérdida de Datos)
- **Motor de Migración Atómica en Cadena:**
  - Migración transparente en el arranque de la app de claves locales históricas hacia el espacio de nombres `dom-*`.
  - Fallback reactivo en lectura: si una clave moderna aún no existe, resuelve contra la clave histórica y la actualiza automáticamente.
  - Preservación de las claves legadas originales para garantizar que sesiones activas y backups locales continúen funcionando sin fricción.
- **Sincronización y Caché de Entidades:**
  - Cola global de sincronización diferida (`dom-global-sync-queue`) y colas de listas de compras adaptadas con preservación total de operaciones pendientes.

#### 📱 Experiencia PWA y Assets Móviles
- **Manifiesto y Metadatos de Sistema:**
  - Actualización de manifiesto web y metadatos con nombre oficial **DOM**, descripción y colores de splash screen `#0c0e12` para aperturas fluidas en iOS y Android.
  - Vector SVG optimizado de alta fidelidad y generación de assets PNG de alta resolución.

#### ✉️ Canales Externos y Plantillas Transaccionales
- **Plantillas de Correo Electrónico:**
  - Rediseño de las 8 plantillas HTML transaccionales de Supabase Auth con el monograma vectorial DOM, fondo carbón y microcopia sobria.
- **Agente y Conciliación WhatsApp:**
  - Actualización de mensajes de confirmación OTP y respuestas de bienvenida con la denominación DOM.

---

## [0.3.2] — 2026-09-13 🚀 Fluidez de Registro Móvil y Consistencia Atómica de Balances

### 🎯 Resumen
Mejoras clave en la fluidez del registro diario de operaciones, consistencia matemática y atómica de balances al editar transacciones, y optimizaciones de microinteracción y descubrimiento en la experiencia móvil.

### ✨ Nuevas Funcionalidades y Mejoras

#### ⚡ Consistencia Financiera y Balances Atómicos
- **Recálculo Atómico de Balances en Edición de Transacciones:**
  - Corrección integral de `updateTransaction` para recalcular saldos en dos fases atómicas (reversión en cuenta original y débito/crédito en cuenta destino). Resuelve inconsistencias al cambiar cuenta, monto o tipo (`expense` ↔ `income`) sin necesidad de sincronización manual.
  - Compatibilidad total con tarjetas de crédito (pasivos no positivos) y operaciones multi-divisa.

#### 🚀 Fluidez de Registro y Navegación Móvil
- **Acceso Directo a Registro de Gastos:**
  - El botón flotante (FAB) abre directamente el formulario de registro de Gastos en un solo toque, eliminando el menú intermedio de opciones redundantes.
  - Se incorpora la opción de **Transferencia** directamente en el selector de tipo superior dentro del formulario rápido y en el menú extendido.

#### 📱 Microinteracciones y Claridad Visual
- **Identificador de Cuenta en Cada Transacción:**
  - Indicador visual compacto con color y nombre de la cuenta en cada fila de la lista cuando existen 2 o más cuentas activas.
- **Descubrimiento de Gestos (Swipe Hint):**
  - Animación sutil de deslizamiento en la primera fila durante la primera sesión para enseñar intuitivamente las acciones de edición y borrado rápido.
- **Contexto Granular en Planes de Cuotas:**
  - Visualización del número total de cuotas en el botón de confirmación de borrado de plan en el editor.
- **Feedback Visual en Cambio de Cuenta:**
  - Resplandor activo en el carrusel de cuentas al modificar la cuenta de una transacción.

---

## [0.3.1] — 2026-09-11 🚀 Hotfix: Purga Atómica de Datos y Reseteo al Estado Inicial

### 🎯 Resumen
Corrección crítica de resiliencia e integridad de datos en el ciclo de vida de la cuenta: implementación de purga atómica y segura en base de datos para el borrado total y reinicio desde cero; reseteo garantizado del balance consolidado a $0,00 con re-aprovisionamiento instantáneo de cuentas y categorías predeterminadas; depuración exhaustiva de colas offline para evitar sincronizaciones manuales; y redirección automática al asistente de bienvenida inicial (`OnboardingWizard`).

### ✨ Mejoras y Correcciones

#### 🧹 Gestión de Datos y Purga Atómica de Cuenta
- **Transacción Atómica de Borrado:**
  - Eliminación integral y consistente en un solo paso de todas las entidades financieras del usuario (transacciones, listas de compras, reglas de categorización, recordatorios de vencimiento, transacciones periódicas, presupuestos, metas financieras, etiquetas y comprobantes almacenados).
  - Resolución de dependencias foráneas y políticas de seguridad para evitar bloqueos o eliminaciones parciales en la nube.
- **Reseteo Garantizado de Balance y Cuentas Predeterminadas:**
  - Garantía de saldo $0,00 absoluto tras la purga, evitando persistencia de balances residuales en cuentas bancarias y tarjetas.
  - Re-aprovisionamiento instantáneo de las 3 cuentas predeterminadas (*Efectivo*, *Caja de Ahorro* y *Billetera Virtual*) con balance $0 y las 8 categorías estándar, dejando la cuenta en estado día 1 óptimo y listo para operar.

#### ⚡ Experiencia de Reinicio y Colas Offline
- **Redirección Automática al Estadio Inicial:**
  - Tras confirmar el borrado seguro en Configuración, la aplicación redirige de inmediato a la vista raíz, desplegando el asistente de configuración inicial (*OnboardingWizard*) para volver a elegir idioma, moneda y reglas recomendadas.
  - Al completar u omitir el asistente, el usuario accede directamente al Dashboard en cero absoluto.
- **Depuración Completa de Colas Offline:**
  - Limpieza automática e inmediata de colas de sincronización diferida y cachés locales, erradicando operaciones huérfanas o la necesidad de sincronizaciones manuales tras el reinicio.
- **Validación Multilingüe en Modal de Confirmación:**
  - Soporte de confirmación con palabras clave en español e inglés (`BORRAR`, `DELETE`), evitando bloqueos silenciosos según el idioma configurado.

---

## [0.3.0] — 2026-09-11 🚀 Motor Offline-First Global, Internacionalización Bilingüe (ES/EN) y Fluidez Háptica

### 🎯 Resumen
Consolidación de capacidades de resiliencia y experiencia de usuario de clase mundial: internacionalización completa (ES / EN) de punta a punta con erradicación total de textos hardcodeados; resiliencia offline-first con sincronización diferida en listas de compras; seguridad biométrica WebAuthn con bloqueo por inactividad; buscador omnicanal global (`⌘K`); sistema completo de atajos de teclado (`?`); transiciones cinemáticas de vistas a 60 FPS (`Framer Motion`); gesto nativo de Pull-to-Refresh móvil con respuesta háptica; sparklines de tendencia acumulada en métricas del dashboard; y centro de novedades in-app.

### ✨ Nuevas Funcionalidades y Mejoras

#### 🌐 Internacionalización Integral y Paridad Estricta (ES / EN)
- **Localización Completa y Erradicación de Textos en Bruto (`i18n.ts`, Vistas, Componentes y Stores):**
  - Expansión del diccionario bilingüe a **1.105 claves idénticas** con 100% de paridad estricta, 0 claves huérfanas y validación automatizada (`scripts/check-i18n.cjs`).
  - Cobertura integral en vistas críticas: flujos de autenticación, recuperación de credenciales, perfil de usuario, conciliación y ciclos de tarjetas de crédito, importación asistida de extractos bancarios y compromisos periódicos.
  - Filtros temporales dinámicos (*Hoy*, *Esta semana*, *Este mes*, *Próximos 30 días*, *Mes anterior*, *Este año*) y prefijos contextuales localizados automáticamente según el idioma de la sesión.
  - Notificaciones reactivas (`sonner`) disparadas desde el gestor de persistencia y cola de sincronización completamente internacionalizadas.

#### 🛡️ Seguridad y Privacidad
- **Bloqueo Biométrico WebAuthn (`PrivacyContext`, `webauthn-guard` & `BiometricLockOverlay`):**
  - Autenticación táctil/facial nativa en hardware compatible (TouchID, FaceID, PIN de dispositivo).
  - Bloqueo automático por inactividad configurable (1, 5, 15, 30 min) y protección ante cambio de pestaña o suspensión (`visibilitychange`).

#### 🛒 Resiliencia Offline-First
- **Motor Global de Sincronización Offline & Outbox Pattern (`sync-queue.service`, `finance-store` & `BalanceHeader`):**
  - Carga instantánea a 0ms (Stale-While-Revalidate) de todas las entidades de dominio (cuentas, categorías, transacciones, presupuestos, metas, facturas, transacciones recurrentes, etiquetas y reglas) desde caché local antes de cualquier consulta remota.
  - Generación de identificadores universales UUID v4 del lado cliente (`crypto.randomUUID()`), garantizando inserciones inmediatas, relaciones foráneas íntegras en memoria y persistencia idempotente (`upsert` con `onConflict: "id"`).
  - Eliminación de rollbacks destructivos en toda la aplicación: ante caídas de red o conexión inestable, las operaciones se persisten localmente y se acumulan en la cola de sincronización diferida (`impero-global-sync-queue`).
  - Drenado automático y secuencial (FIFO) de la cola con reintentos ordenados al detectar reconexión (`window.ononline`) y botón manual de sincronización con chip visual interactivo en la cabecera (`BalanceHeader`).
- **Caché Local Instantáneo & Cola Diferida en Listas de Compras (`ShoppingListManager` & `shopping.service`):**
  - Hidratación instantánea (0ms) de listas de compras desde almacenamiento local antes de cualquier llamada remota.
  - Cola de sincronización transparente que acumula mutaciones en modo desconectado y las despacha automáticamente al recuperar conectividad (`window.ononline`).
  - Chip de estado en cabecera indicando sincronización al día o cantidad de operaciones pendientes.
- **Ciclo de Vida Completo y UX Unificada en Listas de Compras (`ShoppingListManager`):**
  - Acceso a listas archivadas mediante ícono discreto condicional en cabecera (patrón homogéneo con Cuentas y Categorías).
  - Archivación y reactivación fluida desde el menú contextual (`MoreVertical`), sin recargar visualmente la interfaz ni interferir con la acción primaria de compra.
  - Eliminación sin bloqueos de cualquier lista (incluidas listas vacías) con confirmación destructiva segura en `AlertDialog`.
  - Renombrado de listas y edición en línea de nombre, cantidad y precio unitario de artículos.

#### ⚡ Ergonomía y Navegación Power-User
- **Buscador Omnicanal Global (`GlobalCommandMenu` con `⌘K` / `Ctrl+K`):**
  - Búsqueda en vivo de transacciones, cuentas bancarias con saldo y salto directo a cualquier vista.
  - Accesible mediante atajo de teclado global, trigger en barra lateral desktop y cabecera en versión móvil.
- **Atajos de Teclado Globales & Cheat Sheet Modal (`KeyboardShortcutsModal` con tecla `?`):**
  - Panel de referencia rápida con secuencias de navegación `G + [D/T/C/B/S/R/A/O/P]` y acciones globales `N` (nueva transacción) y `H` (modo privacidad).
  - Inmunidad inteligente de foco: no interfiere con el tipeo en inputs, textareas o selects.
- **Pull-To-Refresh Móvil con Respuesta Háptica (`PullToRefresh`):**
  - Gesto de arrastre elástico descendente en dispositivos táctiles con confirmación sensorial háptica (`navigator.vibrate`) y actualización instantánea en segundo plano de balances, cuentas y cola de sincronización.

#### 📊 Micro-Visualización y Estética Financiera
- **Transiciones Cinemáticas de Vistas (`PageTransition` con `Framer Motion`):**
  - Navegación fluida y sin saltos ("layout snap") a 60 FPS con curva orgánica `easeOut` entre pestañas del sistema, con detección y respeto automático a preferencias de accesibilidad (`prefers-reduced-motion`).
- **Sparklines de Tendencia en Dashboard (`DashboardSparkline` & `BalanceHeader`):**
  - Curvas de trayectoria acumulada diaria para Ingresos, Gastos y Resultado Neto ($\Delta$) embebidas con opacidad calibrada en las cápsulas de métricas.
- **Centro de Novedades In-App (`ReleaseNotesModal`):**
  - Modal interactivo con highlights del release, apertura controlada por versión vista en `localStorage` y accesos directos en barra lateral y ajustes.

---

## [0.2.0] — 2026-09-10 🚀 Sincronización Cloud, Ingestión Masiva de Extractos y Navegación PWA

### 🎯 Resumen
Gran actualización de capacidades funcionales, arquitectura de datos y experiencia móvil: sincronización remota de listas de compras y presupuestos en Supabase con updates optimistas y rollover; ingestión universal de extractos bancarios en formatos Excel (XLSX/XLS), PDF y CSV; gestor unificado de compromisos con respiro visual y widget de dashboard; navegación PWA directa con historial completo; enmascaramiento total en modo privacidad y testing E2E automatizado.

### ✨ Nuevas Funcionalidades y Mejoras

#### ☁️ Persistencia Cloud y Modelado de Datos
- **Listas de Compras Sincronizadas (`ShoppingListManager` & `shopping.service`):**
  - CRUD remoto completo contra las tablas `public.shopping_lists` y `public.shopping_list_items` en Supabase.
  - Sincronización con updates optimistas en UI, spinners de carga no intrusivos y rollback seguro ante errores de conexión.
- **Rollover en Presupuestos (`BudgetManager` & `planning.service`):**
  - Persistencia y lectura de `enable_rollover` y `accumulated_rollover` en la tabla `public.budgets`.
- **Preferencia de Tarjetas de Crédito (`CreditCardManager` & `accounts.service`):**
  - Persistencia de `credit_card_view_mode` (`statement_cycles` vs `negative_balance`) en `public.accounts`.
- **Asistente de Bienvenida (`OnboardingWizard`):**
  - Activación automática en primer ingreso con registro en `localStorage`.

#### 🧭 Navegación PWA, Deep Linking y UX de Carga
- **Deep Linking y Rutas Directas (`App.tsx` & `Index.tsx`):**
  - Rutas directas para todas las vistas principales (`/dashboard`, `/transactions`, `/reports`, `/budgets`, `/obligations`, `/cards`, etc.).
  - Resolución definitiva del error 404 al abrir la PWA desde accesos directos del sistema operativo (shortcut a `/reports`).
  - Sincronización bidireccional entre la URL y la pestaña activa, habilitando el uso natural del historial (`atrás` y `adelante` del navegador).
- **Esqueleto de Carga Inicial (`DashboardSkeleton`):**
  - Pantalla de carga suave con placeholders animados (`Skeleton`), erradicando el flash de métricas y saldos en cero mientras se inicializa el almacén financiero.

#### 📱 Experiencia Móvil, Densidad y Ergonomía Táctil
- **Gestor Unificado de Compromisos (`ObligationsManager`):**
  - Reemplazo y consolidación definitiva de `BillReminders.tsx` y `RecurringManager.tsx`.
  - Tarjetas en dos niveles con respiro garantizado para montos, nombres largos sin colapso vertical y chips contextuales de workflow (`Débito auto` vs `Pago manual`) y vencimiento.
  - Widget de vencimientos para dashboard (`BillsSummaryWidget.tsx`).
- **Saneamiento de Acciones y Densidad Móvil:**
  - **Categorías (`CategoryManager`):** Eliminación de botones pegados por fila; integración de botón directo para subcategoría y menú desplegable accesible (`DropdownMenu`) para Editar, Archivar y Eliminar, liberando el 85% del ancho de pantalla.
  - **Cuentas (`AccountManager`):** Reemplazo de columna vertical de botones por menú contextual accesible (`Ajustar saldo`, `Editar`, `Archivar`).
  - **Presupuestos (`BudgetManager`):** Distribución fluida del header de tarjeta para acomodar insignias de *Rollover* sin desplazar el botón de eliminación.
- **Teclado y Registro Rápido (`QuickAddSheet` & `finance-store`):**
  - Soporte de fecha explícita para transacciones pasadas y futuras.
  - Mayor contraste y visibilidad en la selección rápida de categorías.
- **Acceso a Cuenta & Sesión en Mobile (`BottomNav`, `SettingsPage`):**
  - Acceso directo a Mi Perfil y botón táctil de Cerrar Sesión en el menú lateral móvil y en Ajustes.
  - Mensajería de errores de autenticación 100% traducida al español.
- **Pulido Visual y Ergonómico en Mobile:**
  - `ResponsiveSheet` y `DashboardCardPicker`: Header unificado, botón de cierre táctil circular y eliminación de desbordes en el badge de widgets activos.
  - `ObligationsManager` y `ReportsPage`: Scroll horizontal con salida suave (`w-6`) y padding inferior seguro (`pb-28`) para evitar solapamientos con la barra de navegación fija.
  - `CashFlowForecast`: Eje Y con ticks dinámicos y formateo de unidades escalonado ($0, $1.5k, $10k, $1.2M), erradicando valores repetidos.

#### 📥 Ingestión Masiva de Extractos
- **Carga Masiva (`CsvImportSheet`, `excel-parser`, `pdf-statement-parser`):**
  - Soporte universal de importación para extractos bancarios en formatos CSV, XLSX/XLS y PDF.
  - Inserción y sincronización por lotes (batches) en segundo plano para optimizar rendimiento en bases de datos locales y cloud.

#### 🛡️ Seguridad, Privacidad y Testing
- **Endurecimiento de Edge Functions (`whatsapp-webhook`):**
  - Eliminación de token fallback hardcodeado; validación obligatoria y estricta mediante variable de entorno `WHATSAPP_VERIFY_TOKEN`.
- **Cobertura Integral de Modo Privacidad (`maskAmount`):**
  - Enmascaramiento sensible (`***`) integrado en tarjetas de crédito, presupuestos, metas de ahorro, previsión de flujo de caja, compromisos y widgets de resumen.
- **Infraestructura de Testing:**
  - Setup inicial de pruebas E2E con Playwright (`playwright.config.ts`, `e2e/smoke.spec.ts`) y script `npm run test:e2e`.
  - Cobertura de tests unitarios al 100% (17 archivos, 58 tests en verde).

#### 🏷️ Identidad de Marca y Pulido
- **Caché y Almacenamiento:** Service Worker actualizado a `impero-shell-v1` y migración de claves de almacenamiento local a `impero-*` con retrocompatibilidad automática.
- **Internacionalización:** Ajuste de etiquetas en `i18n.ts` diferenciando `"Compromisos"` (`nav.obligations`) de recurrentes.

---

## v0.1.0 - Primera Versión Pública
**Fecha prevista:** Septiembre 2026

### 🎯 Resumen
Primera versión pública de IMPERO (Administración financiera con visión y propósito): PWA de finanzas personales soberanas, offline-first, multi-moneda y con diseño de alto calibre.

---

### ✨ Funcionalidades principales

#### Core Financiero
- **Multi-moneda:** Soporte nativo para ARS, USD y EUR con tasas de cambio configurables y visualización consolidada del patrimonio en cualquier divisa.
- **Cuentas y saldos:** Gestión completa de cuentas (efectivo, débito, ahorros, inversiones) con balance en tiempo real.
- **Tarjetas de crédito:** Seguimiento de ciclos de resumen, deuda actual, pagos y vista alternativa de saldo negativo.
- **Transacciones:** Alta rápida, edición, categorización con íconos, sistema de etiquetas (tags), búsqueda y filtros avanzados.
- **Transferencias:** Transferencias entre cuentas con soporte multi-moneda y conversión automática.
- **Presupuestos:** Presupuestos mensuales por categoría con seguimiento de progreso, rollover dinámico y sugerencia automática basada en historial.
- **Recurrentes:** Motor de transacciones recurrentes con periodicidad configurable y procesamiento automático al abrir la app.

#### Análisis y Reportes
- **Dashboard modular:** Secciones del home reordenables y activables individualmente (Balance, Cuentas, Net Worth, Velocidad de gasto, Breakdown, Comparativa mensual).
- **Gráfico de patrimonio neto:** Evolución histórica del patrimonio neto a partir de las transacciones reales.
- **Breakdown de gastos:** Distribución visual de gastos por categoría con Recharts.
- **Comparativa mensual:** Comparación de gastos e ingresos respecto al mes anterior.

#### Experiencia y UX
- **Formato de números argentino:** Separador de miles con punto (.) y decimales con coma (,) en toda la app — 5.000.000,00
- **Modo privacidad:** Oculta todos los montos con un toque (atajo tecla H en desktop).
- **Modo oscuro / claro / sistema:** Sincronizado con la preferencia del sistema operativo.
- **Animaciones de número:** Transiciones fluidas al cambiar montos (AnimatedNumber con Framer Motion).
- **PWA completa:** Instalable en iOS y Android, íconos de alta resolución, manifest optimizado, service worker offline-first.
- **Mobile-first:** Ergonomía táctil con touch targets de mínimo 44x44px, safe areas, scroll seguro en modales.

#### Seguridad y Persistencia
- **Supabase Auth:** Autenticación con email/password, sesiones persistentes.
- **RLS en PostgreSQL:** Row Level Security activo en todas las tablas. Cada usuario solo accede a sus propios datos.
- **Sync remota:** Configuración de usuario sincronizada con Supabase; fallback a localStorage para offline.
- **Inputs sanitizados:** Validación con Zod + React Hook Form en todos los formularios.

---

### Bugs corregidos pre-release

| Bug | Detalle |
|-----|---------|
| Deuda de tarjeta sumaba como activo | fetchAccounts ahora garantiza que el balance de tarjetas de crédito sea siempre <= 0, evitando que datos corruptos en DB inviertan el signo y sumen como patrimonio positivo. |
| Balance de nueva tarjeta con valor inesperado | Se aplica safeBalance = -Math.abs(balance) al insertar en Supabase, eliminando posibles errores de floating point o estado de formulario residual. |
| Campo creditCardViewMode faltante al cargar tarjetas | fetchAccounts e insertAccount ahora mapean correctamente credit_card_view_mode desde la DB, evitando que las tarjetas pierdan su modo de visualización al recargar. |
| Formato de números sin separador de miles | Todos los valores numéricos en la app ahora usan el locale es-AR (punto para miles, coma para decimales). Afectaba: balance header, gráficos, cuentas, tarjetas, presupuestos, transferencias, edición de transacciones. |
| Inputs de monto aceptaban solo formato anglosajón | BudgetManager y TransferSheet ahora usan formatThousandsInput / parseThousandsInput para manejar entradas como 1.500,50. |

---

### Stack Técnico
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Radix UI + Framer Motion
- Supabase (PostgreSQL + Auth + RLS)
- Recharts para visualizaciones
- Vitest + Testing Library

---

### Pendiente para próximas versiones (Backlog)
Ver BACKLOG.md para el detalle completo.

---

*Generado automáticamente - IMPERO by PJR*
