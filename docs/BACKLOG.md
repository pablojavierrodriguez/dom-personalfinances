# Product Backlog - DOM

Documento vivo de priorización de producto basado en valor para el usuario final, robustez financiera y arquitectura sobre Supabase.

---

## 🎯 Resumen de Prioridades (Matriz de Valor Real vs. Esfuerzo)

| Prioridad | Épica / Feature | Valor para el Usuario | Esfuerzo | Impacto | Spec | Estado |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **P0** 🔴 | **Importación de Extractos Bancarios (CSV/PDF)** | **Elimina la mayor fricción:** permite cargar cientos de movimientos de bancos y billeteras en segundos sin tipeo manual. | Medio | **Altísimo** | [SPEC-003](specs/SPEC-003-csv-banking-import.md) | Completado |
| **P1** 🟡 | **Agente IA de Ingesta Autónoma (Bot WhatsApp / Visión / Archivos)** | **Fricción cero:** registrar gastos por mensaje de voz, foto de ticket/comprobante o reenvío de extractos directamente a un bot de WhatsApp conectado a la base de DOM. | Alto | **Altísimo (Game Changer)** | [SPEC-008](specs/SPEC-008-autonomous-agent-whatsapp-bot.md) | Completado |
| **P2** 🟢 | **Tarjetas de Crédito & Gestión de Cuotas** | **Resuelve la distorsión financiera real:** proyecta compras en cuotas diferidas y calcula saldos adeudados futuros. | Medio | **Alto** | [SPEC-004](specs/SPEC-004-credit-cards-and-installments.md) | Completado |
| **P3** 🟡 | **Presupuestos Inteligentes & Alertas de Desvío** | **Control preventivo en tiempo real:** alerta sobregastos por categoría antes del cierre de mes. | Medio | **Alto** | [SPEC-005](specs/SPEC-005-intelligent-budgets.md) | Completado |
| **P4** 🟢 | **Comprobantes y Adjuntos en Alta Rápida** | **Optimización de conveniencia:** adjuntar ticket/foto directamente al crear la transacción en `QuickAddSheet`. | Bajo | **Medio** | [SPEC-002](specs/SPEC-002-receipt-attachments.md) | Completado |
| **P5** 🟢 | **Metas de Ahorro y Fondos de Emergencia** | **Progreso patrimonial:** asignación directa desde cuentas y seguimiento de ritmo de ahorro. | Bajo | **Medio** | [SPEC-006](specs/SPEC-006-savings-goals.md) | Completado |
| **P6** ⚪ | **Reportes Financieros & Exportación (PDF/Excel)** | **Auditoría y análisis retrospectivo:** métricas evolutivas y descarga de datos históricos. | Medio | **Medio** | [SPEC-007](specs/SPEC-007-financial-reports-and-export.md) | Completado |
| **P7** 📱 | **App PWA Mobile para Android e iOS** | **Experiencia nativa sin fricción:** modo standalone fullscreen, offline caching, icono en home screen e instalabilidad directa sin tiendas. | Medio | **Alto** | [SPEC-009](specs/SPEC-009-pwa-mobile.md) | Completado |
| **P8** 🌐 | **Soporte Multi-Moneda y Balance Consolidado** | **Resuelve la fragmentación patrimonial:** cuentas en ARS, USD, EUR, cripto con cotizaciones de referencia y totalizador unificado. | Medio | **Altísimo** | [SPEC-010](specs/SPEC-010-multicurrency-consolidated-balance.md) | Completado |
| **P9** 📈 | **Proyección de Flujo de Caja (Forecast 30/60/90 días)** | **Visión anticipatoria real:** saber con certeza si se llega a fin de mes antes de asumir nuevos compromisos o cuotas. | Medio | **Altísimo** | [SPEC-011](specs/SPEC-011-cashflow-forecast.md) | Completado |
| **P10** ⚡ | **Motor de Reglas y Automatizaciones** | **Ahorro masivo de tiempo:** tagueo, categorización y acciones automáticas condicionales según el comercio o monto. | Medio | **Alto** | [SPEC-012](specs/SPEC-012-transaction-rules-engine.md) | Completado |
| **P11** 🔄 | **Presupuestos con Rollover Dinámico** | **Flexibilidad real:** trasladar saldo sobrante al mes siguiente o volcarlo automáticamente a metas de ahorro. | Bajo | **Medio** | [SPEC-013](specs/SPEC-013-dynamic-budget-rollover.md) | Completado |
| **P12** 🛡️ | **Modo Privacidad & Bloqueo Biométrico Web** | **Tranquilidad en público:** ofuscación de saldos de un toque (`$ ••••••`) y reanudación segura con FaceID / TouchID. | Bajo | **Medio** | [SPEC-014](specs/SPEC-014-privacy-mode-and-biometrics.md) | Completado |
| **P13** 💎 | **Unificación de Identidad de Marca, Nomenclatura y Microcopia de Alta Gama** | **Coherencia y artesanía:** eliminar discrepancias (`FinTrack` vs `m3`), traducir 100% la microcopia al español financiero y armonizar términos. | Bajo | **Alto** | [SPEC-015](specs/SPEC-015-brand-and-microcopy.md) | Completado |
| **P14** ⚡ | **QuickAdd 2.0: Fricción Mínima, Smart Chips y Feedback Sensorial (Háptica)** | **Velocidad de registro de clase mundial:** chips rápidos de categorías frecuentes, vibración física nativa en teclado y cálculo en 1-tap. | Bajo | **Altísimo** | [SPEC-016](specs/SPEC-016-quickadd-frictionless.md) | Completado |
| **P19** 🏛️ | **Consolidación de Identidad IMPERO & Dominio Propio** | **Alineación filosófica y técnica:** formalización de SPEC-021, ajuste de microcopia (asignación de recursos, serenidad) y metadatos globales. | Bajo | **Altísimo** | [SPEC-021](specs/SPEC-021-brand-identity-impero.md) | Completado |
| **P15** 💳 | **Flujo Unificado de Conciliación y Pago de Tarjeta de Crédito** | **Resolución contable en 1-tap:** pagar resumen adeudado debitando de cuenta y cancelando el ciclo sin transferencias manuales. | Medio | **Alto** | [SPEC-017](specs/SPEC-017-credit-card-settlement.md) | Completado |
| **P16** 🎨 | **Refinamiento del Design System: Contraste WCAG AA, Modo Claro y Safe Areas Móviles** | **Accesibilidad y confort visual:** paleta `.light` con contraste > 4.5:1, targets táctiles de 44px y control de teclado virtual móvil. | Bajo | **Alto** | [SPEC-018](specs/SPEC-018-design-system-and-a11y.md) | Completado |
| **P17** 📊 | **Curva de Evolución Patrimonial (Net Worth Chart) y Empty States Dinámicos** | **Visión histórica clara y onboarding continuo:** gráfico minimalista de saldo neto en el tiempo y guías interactivas en estados vacíos. | Medio | **Medio** | [SPEC-019](specs/SPEC-019-net-worth-and-empty-states.md) | Completado |
| **P18** 🚀 | **Convergencia IMPERO: Excelencia Mobills (Tarjetas/Ciclos) + Potencia Wallet (Shopping List/Filtros) + Factor Wow** | **Superioridad definitiva:** Liquidación con pago parcial y arrastre de deuda de tarjeta, Shopping List con checkout directo a gasto, y buscador/filtros multi-criterio rápidos. | Medio | **Altísimo (Core Value)** | [SPEC-020](specs/SPEC-020-mobills-wallet-m3-convergence.md) | Completado |
| **P20** 🛒 | **Resiliencia Offline-First: Fallback Local en Shopping List** | **Tolerancia a desconexión y latencia:** ante micro-cortes o migraciones de base de datos, permitir operar listas de compras 100% en local con sincronización diferida. | Bajo | **Medio** | [SPEC-022](specs/SPEC-022-offline-shopping-resilience.md) | Completado |
| **P21** 🔍 | **Buscador Omnicanal Global (`Cmd+K`) & Acciones Rápidas** | **Agilidad absoluta:** búsqueda instantánea de comercios, cuentas, categorías y disparador de acciones en 1 toque. | Medio | **Altísimo** | [SPEC-023](specs/SPEC-023-global-command-menu.md) | Completado |
| **P22** ⌨️ | **Atajos de Teclado Globales & Cheat Sheet Modal (`?`)** | **Cultura Power-User:** navegación relámpago con combinaciones de teclas (G+D, G+T, G+C, N, H) y panel de referencia rápida con tecla `?`. | Bajo | **Alto** | [SPEC-024](specs/SPEC-024-keyboard-shortcuts.md) | Completado |
| **P23** 🎬 | **Transiciones Cinemáticas de Vistas (Framer Motion)** | **Fluidez de alta gama:** eliminar saltos bruscos entre pestañas con animaciones de entrada/salida a 60 FPS. | Bajo | **Medio** | [SPEC-025](specs/SPEC-025-page-transitions.md) | Completado ✅ |
| **P24** 📈 | **Sparklines de Tendencia en Métricas del Dashboard** | **Estética financiera Mercury/Stripe:** curvas de velocidad y tendencia de 14/30 días integradas en el fondo de las tarjetas de ingresos, gastos y balance. | Bajo | **Alto** | [SPEC-026](specs/SPEC-026-dashboard-sparklines.md) | Completado |
| **P25** 📱 | **Pull-To-Refresh Móvil con Respuesta Háptica** | **Sensación de app nativa:** gesto elástico al deslizar hacia abajo en la cabecera para recargar balances y cotizaciones con vibración sensorial. | Bajo | **Alto** | [SPEC-027](specs/SPEC-027-pull-to-refresh.md) | Completado ✅ |
| **P26** 🚀 | **Centro de Novedades In-App ("What's New Modal")** | **Celebración de valor:** modal interactivo que comunica automáticamente los avances de versión al usuario con highlights visuales y badges. | Bajo | **Medio** | [SPEC-028](specs/SPEC-028-whats-new-modal.md) | Completado |
| **P27** 🌐 | **Motor Global Offline-First & Outbox Sync (Toda la App)** | **Cero fricción y cero pérdida de datos:** apertura instantánea en 0ms mediante Stale-While-Revalidate, registro y mutaciones en las 9 entidades de dominio garantizadas sin señal celular con cola de sincronización diferida e indicador global de conectividad. | Medio | **Altísimo (Game Changer)** | [SPEC-029](specs/SPEC-029-global-offline-first-sync-engine.md) | Completada ✅ |
| **P28** 🌐 | **Internacionalización Integral (ES / EN) y Erradicación de Textos Hardcodeados** | **Paridad absoluta y experiencia global:** 100% de paridad en 1.101 claves de traducción, cero textos o etiquetas hardcodeadas en vistas, componentes, filtros dinámicos, toasts y tooltips, con auditoría automatizada en CI/CD. | Bajo | **Altísimo** | [i18n-audit](scripts/check-i18n.cjs) | Completado ✅ |
| **P29** 🏛️ | **Transición a Marca DOM: Identidad Soberana, Geometría SIGIL, Retrocompatibilidad & Cero Pérdida de Datos** | **Soberanía y longevidad:** Monograma arquitectónico forjado en carbón/esmeralda con geometría matemática SIGIL (`DominusSymbol`), tipografía noble `Cinzel`, migración en cadena de claves locales hacia `dom-*`, rediseño de plantillas transaccionales e integración en todos los canales. | Medio | **Altísimo (Strategic Brand)** | [rebrand.md](reports/rebrand.md) | Completado ✅ |

---

## 📋 Detalle de Épicas y Tareas

### P0 — Importación de Extractos Bancarios & Conciliación (CSV)
- **Problema:** La carga manual de cada gasto es lenta y la principal causa de abandono de la app. Usuarios con tarjetas y cuentas necesitan cargar meses de movimientos rápidamente.
- **Alcance:**
  - Robustecer el parser para soportar delimitadores `,` y `;`, formatos de moneda latinoamericanos (`$ 1.234,56`, `-1234.56`), y fechas en formato `DD/MM/YYYY` y `YYYY-MM-DD`.
  - Mapeo automático inteligente de columnas (Fecha, Concepto, Importe, o columnas Débito/Crédito separadas).
  - Categorización predictiva enriquecida para comercios y servicios habituales (Mercado Pago, Carrefour, Coto, Rappi, PedidosYa, YPF, servicios públicos, etc.).
  - Detección visual de posibles duplicados en la cuenta de destino para evitar doble cómputo.
  - Previsualización interactiva con selector de categoría por fila y casillas para excluir filas no deseadas.
  - Inserción eficiente en lote (`insertTransactionsBatch`) persistida en Supabase y recálculo inmediato de balances.
- **Criterios de Aceptación:**
  - Soporta CSV exportados de bancos y billeteras locales (Mercado Pago, Galicia, Santander, BBVA, Brubank, etc.).
  - Permite desmarcar movimientos o cambiar categorías antes de confirmar.
  - Identifica y advierte sobre transacciones potencialmente duplicadas.
  - Inserta los registros en `public.transactions` y actualiza la UI al instante con feedback visual.

---

### P1 — Agente IA de Ingesta Autónoma (Bot WhatsApp / Visión / Archivos)
- **Problema:** Incluso con importadores en la app, abrir la web/app cada vez que se hace un gasto en la calle o llega un comprobante genera fricción. WhatsApp es el canal donde el usuario ya vive todo el día.
- **Alcance:**
  - **Canal WhatsApp:** Webhook (Meta Cloud API o Twilio / Baileys) vinculado al `user_id` de **DOM**.
  - **Modos de Ingesta:**
    1. **Mensaje de texto o audio:** *"Gasté 14500 en Coto con Galicia"* -> Whisper (audio a texto) + LLM (extracción de `{ amount: 14500, description: "Coto", category: "groceries", account: "Galicia", type: "expense" }`).
    2. **Foto de comprobante / ticket físico:** Visión multimodal (Gemini / GPT-4o Vision) extrae el total, comercio, fecha y categorías.
    3. **Reenvío de documentos (PDF / CSV):** Procesamiento autónomo que parsea el extracto, detecta cuotas/transferencias y responde con un resumen de confirmación interactivo antes de insertar en Supabase.
  - **Seguridad & Auth:** Vinculación por número verificado de teléfono en la tabla de perfiles de usuario.
- **Criterios de Aceptación:**
  - El usuario envía un mensaje o foto y recibe en segundos la confirmación: *"✅ Registrado: $14.500 en Supermercado (Galicia)"*.
  - Los datos impactan en tiempo real en la base de datos de Supabase y se visualizan al abrir **IMPERO**.

---

### P2 — Tarjetas de Crédito & Proyección de Cuotas (`Installments`)
- **Problema:** Las compras con tarjeta suelen ser en cuotas (3, 6, 12). Cargar el total en un solo mes distorsiona el flujo de fondos real.
- **Alcance:**
  - Al seleccionar una cuenta de tipo `credit`, permitir definir cantidad de cuotas.
  - Generar automáticamente las transacciones proyectadas para los meses futuros según el día de cierre y vencimiento de la tarjeta.
  - Visualizar el consumo del límite de crédito vs. límite disponible.
- **Criterios de Aceptación:**
  - Un gasto de `$120.000` en 6 cuotas distribuye `$20.000` en cada uno de los 6 periodos siguientes.
  - El balance de la tarjeta refleja el saldo actual adeudado y el total comprometido a futuro.

---

### P3 — Presupuestos Inteligentes & Alertas de Desvío
- **Problema:** El usuario se entera de que gastó de más recién cuando termina el mes.
- **Alcance:**
  - Fijar límites mensuales por categoría principal o subcategoría.
  - Barra de velocidad de gasto (gasto actual vs. día del mes transcurrido).
  - Notificaciones en la UI (amarillo > 80%, rojo > 100%).
- **Criterios de Aceptación:**
  - Cálculo instantáneo contra las transacciones del mes en curso.
  - El widget de presupuesto en el Dashboard principal alerta visualmente los desvíos.

---

### P4 — Comprobantes y Adjuntos en Alta Rápida (`QuickAddSheet`)
- **Problema:** Actualmente el usuario solo puede adjuntar tickets al editar una transacción ya guardada (`TransactionEditSheet`).
- **Alcance:**
  - Integrar input de archivo / cámara en el paso de detalles de `QuickAddSheet`.
  - Preview de imagen miniatura y estado de subida al bucket `receipts` de Supabase Storage.
  - Almacenar la URL pública del comprobante en `public.transactions.receipt_url`.
- **Criterios de Aceptación:**
  - El usuario puede seleccionar una foto o tomarla con la cámara del celular.
  - Si no adjunta nada, la transacción se crea normalmente.
  - La URL del comprobante queda vinculada y visible en el detalle de la transacción.

---

### P5 — Metas de Ahorro y Fondos de Emergencia
- **Problema:** Difícil seguimiento de metas específicas (ej. vacaciones, fondo de reserva, compra de vehículo).
- **Alcance:**
  - Creación de metas con monto objetivo y fecha límite opcional.
  - Botón "Aportar": transfiere dinero de una cuenta (ej. Caja de Ahorro) a la meta.
  - Indicador de progreso y ritmo mensual necesario para cumplirla a tiempo.
- **Criterios de Aceptación:**
  - Descuenta el saldo de la cuenta de origen y suma al acumulado de la meta.
  - Estados claros: en progreso, completada o pausada.

---

### P6 — Reportes Financieros & Exportación
- **Problema:** Falta de visión histórica para toma de decisiones financieras a largo plazo.
- **Alcance:**
  - Comparativa mensual de Ingresos vs. Gastos (gráfico de barras Recharts).
  - Desglose porcentual por categorías (gráfico de dona / pie chart).
  - Exportación de transacciones filtradas a formato CSV / Excel.
- **Criterios de Aceptación:**
  - Selector de rangos de fechas rápido (este mes, mes anterior, último trimestre, año).
  - Descarga limpia de archivos lista para auditoría personal.

---

### P7 — App PWA Mobile para Android e iOS
- **Problema:** El acceso vía navegador web en smartphones presenta barras de navegación molestas, falta de persistencia offline y sin ícono propio en la pantalla de inicio del usuario.
- **Alcance:**
  - Configuración de Web App Manifest estándar W3C con modo `standalone` y `theme_color` adaptativo.
  - Service Worker de caché estático para resiliencia offline e inicio instantáneo.
  - Atajos táctiles en pantalla de inicio (ej. Alta Rápida de gastos).
  - Componente de prompt y guía de instalación para navegadores móviles (Chrome en Android y Safari en iOS).
- **Criterios de Aceptación:**
  - Instalable directamente desde el navegador en Android e iOS sin pasar por tiendas.
  - Se ejecuta en pantalla completa (sin barras de navegador) respetando muescas y áreas seguras.

---

### P8 — Soporte Multi-Moneda y Balance Patrimonial Consolidado
- **Problema:** Los usuarios en economías inflacionarias o perfiles con ingresos freelance/ahorros manejan cuentas en pesos (ARS), dólares (USD), euros (EUR) y criptoactivos (USDT). Actualmente m3 opera con una única moneda base.
- **Alcance:**
  - Permitir elegir la moneda (`currency`) a nivel de cuenta bancaria/billetera.
  - Almacenar tasas de cambio de referencia (manuales o actualizadas automáticamente vía API).
  - Switcher en el Dashboard para ver el patrimonio consolidado en la moneda elegida (ej. "Ver todo en USD" o "Ver todo en ARS").
  - Mapeo de transacciones preservando el monto en la divisa original y calculando su valor convertido.
- **Criterios de Aceptación:**
  - Cuentas con distintas divisas muestran su saldo nativo en sus tarjetas respectivas.
  - El balance general de la pantalla principal totaliza coherentemente utilizando la tasa de conversión seleccionada.

---

### P9 — Proyección de Flujo de Caja (Cash Flow Forecast a 30/60/90 días)
- **Problema:** La mayoría de las aplicaciones financieras miran hacia el pasado. Los usuarios necesitan anticiparse: *"¿Tendré saldo suficiente para pagar las cuotas de la tarjeta que vencen el 20?"*.
- **Alcance:**
  - Cálculo temporal proyectado día a día combinando saldo líquido actual, gastos fijos y suscripciones programadas, ingresos recurrentes esperados y cuotas de tarjetas de crédito.
  - Gráfico interactivo con curva proyectada a 30, 60 y 90 días (Recharts).
  - Alerta de riesgo de sobregiro o déficit proyectado antes de que ocurra.
- **Criterios de Aceptación:**
  - Muestra una línea de saldo diario futuro que responde a los movimientos proyectados y cuotas activas.
  - Si el saldo proyectado cae por debajo de cero, se resalta la fecha y el monto crítico en rojo.

---

### P10 — Motor de Automatizaciones y Reglas de Transacciones
- **Problema:** Los usuarios pierden tiempo categorizando repetidamente movimientos idénticos o asignando etiquetas en transferencias o compras comunes.
- **Alcance:**
  - Módulo de "Reglas Inteligentes" en Ajustes: disparador (*"Si la descripción contiene..."*, *"Si el monto es mayor a..."*, *"Si la cuenta es..."*) -> acción (*"Asignar categoría X"*, *"Agregar tag Y"*, *"Marcar como gasto deducible"*).
  - Integración transparente en el flujo de importación CSV y en la ingesta del bot de WhatsApp.
  - Botón para aplicar reglas retroactivamente sobre el historial existente.
- **Criterios de Aceptación:**
  - Toda nueva transacción entrante (manual, CSV o bot) se procesa por las reglas activas del usuario antes de guardarse.
  - Registro claro de qué regla se aplicó a cada transacción.

---

### P11 — Presupuestos con Rollover Dinámico y Subcategorías
- **Problema:** Si el usuario gasta menos de lo presupuestado en un mes, ese remanente se pierde en lugar de acumularse como premio o reserva para el periodo siguiente.
- **Alcance:**
  - Opción de habilitar "Rollover" por presupuesto de categoría.
  - Traslado automático del superávit (o déficit acumulado) al mes posterior.
  - Acceso directo para derivar el ahorro sobrante hacia una meta de ahorro (`GoalsManager`).
- **Criterios de Aceptación:**
  - El presupuesto del nuevo mes refleja el monto base más el remanente transferido del mes anterior.

---

### P12 — Modo Privacidad, Seguridad Biométrica Web y Widgets
- **Problema:** Al consultar la app en espacios públicos o compartir pantalla, los saldos monetarios quedan expuestos.
- **Alcance:**
  - Toggle de "Modo Privacidad" con icono `Eye` / `EyeOff` en el header para ofuscar montos (`$ ••••••`).
  - Bloqueo por timeout con autenticación biométrica web (WebAuthn / TouchID / FaceID) al volver a la app.
  - Ajuste rápido de visibilidad persistido en preferencias locales.
- **Criterios de Aceptación:**
  - Al activar el modo privacidad, ningún componente del dashboard revela números monetarios explícitos.
  - El desbloqueo biométrico funciona de manera no intrusiva y sin fricción de login completo.

---

### P13 — Unificación de Identidad de Marca, Nomenclatura y Microcopia de Alta Gama
- **Problema:** Discrepancias de nombre (`FinTrack` vs. `m3 / Money Master`), textos en inglés en tooltips y modales ("Transfer", "del"), y jerga técnica poco accesible.
- **Alcance:**
  - Estandarizar la identidad visual de marca hacia **DOM** en la barra lateral desktop (`DesktopSidebar.tsx`), encabezados, título del documento y meta tags de PWA.
  - Auditar el 100% de la microcopia asegurando español neutro y financiero consistente.
  - Homogeneizar nomenclaturas de widgets y métricas (ej. "Ritmo de gasto", "Ciclo de tarjeta", "Salud financiera").
- **Criterios de Aceptación:**
  - Cero menciones a nombres no alineados como "FinTrack".
  - Todos los tooltips y botones interactivos muestran etiquetas claras y consistentes en español.
  - La marca transmite artesanía, claridad y profesionalismo.

---

### P14 — QuickAdd 2.0: Fricción Mínima, Smart Chips y Feedback Sensorial (Háptica)
- **Problema:** El doble paso forzado (monto -> continuar -> detalles) enlentece el registro de gastos diarios simples (café, almuerzo, transporte), y el teclado carece de respuesta táctil en móviles.
- **Alcance:**
  - Fila superior de "Smart Chips" con las 4 categorías o conceptos más frecuentes del usuario para asignación y guardado directo.
  - Soporte de respuesta táctil física (Web Vibration API: `navigator.vibrate?.(10)`) al teclear y al confirmar una transacción.
  - Operaciones matemáticas inline básicas (ej. sumar dos importes antes de confirmar).
- **Criterios de Aceptación:**
  - Un gasto frecuente puede registrarse en 1 o 2 toques en menos de 3 segundos.
  - El teclado numérico ofrece feedback háptico sutil en dispositivos móviles compatibles.

---

### P15 — Flujo Unificado de Conciliación y Pago de Tarjeta de Crédito
- **Problema:** Al cerrar el ciclo de la tarjeta de crédito, el usuario debe calcular manualmente el total a pagar y generar una transferencia manual entre su cuenta y la tarjeta.
- **Alcance:**
  - Botón contextual de acción *"Pagar Resumen"* directamente en el ciclo cerrado de la tarjeta (`CreditCardManager` y `StatementGroupRow`).
  - Modal simplificado que pre-selecciona el monto total adeudado del ciclo, permite elegir la cuenta bancaria de débito y ejecuta el pago atómico.
  - Marcado automático del ciclo de tarjeta como pagado y reflejo inmediato en el límite disponible.
- **Criterios de Aceptación:**
  - El pago del resumen de tarjeta se realiza en una única confirmación sin pasos duplicados.
  - Se genera la transferencia correspondiente y se actualizan los balances en tiempo real.

---

### P16 — Refinamiento del Design System: Contraste WCAG AA, Modo Claro y Safe Areas Móviles
- **Problema:** En modo claro (`.light`), ciertos textos muted y bordes sufren bajo contraste frente a la luz natural; adicionalmente, teclados virtuales móviles pueden solapar botones de confirmación en modales.
- **Alcance:**
  - Calibración de variables de color HSL en `src/index.css` asegurando ratio de contraste mínimo 4.5:1 (WCAG AA).
  - Garantizar tamaño táctil mínimo de 44×44px en toda la barra de navegación inferior y botones primarios.
  - Ajuste estricto de safe-areas (`pb-safe`, `viewport-fit=cover`) y gestión de teclado virtual para prevenir desbordes.
- **Criterios de Aceptación:**
  - Supera auditorías a11y de accesibilidad y contraste sin alertas críticas.
  - La experiencia móvil se siente ergonómica, estable y sin saltos visuales indeseados.

---

### P17 — Curva de Evolución Patrimonial (Net Worth Chart) y Empty States Dinámicos
- **Problema:** El dashboard se enfoca principalmente en la foto estática del presente y del mes en curso, sin ofrecer una perspectiva gráfica de la tendencia patrimonial en el tiempo.
- **Alcance:**
  - Widget interactivo de patrimonio neto con curva evolutiva semanal/mensual (Recharts con gradientes suaves de área).
  - Rediseño de estados vacíos (`EmptyState.tsx`) con micro-ilustraciones minimalistas y llamadas a la acción que guían al usuario en su primera interacción.
- **Criterios de Aceptación:**
  - El gráfico de evolución neta se renderiza de forma fluida y responsiva.
  - Los estados vacíos proporcionan claridad contextual e incentivo a la acción.

---

### P18 — Convergencia IMPERO: Excelencia Mobills (Tarjetas/Ciclos) + Potencia Wallet (Shopping List/Filtros) + Factor Wow
- **Problema:** Mobills ofrece la mejor experiencia de tarjetas de crédito y navegación histórica pero es costoso, tiene pésimos filtros y carece de automatizaciones e ingesta inteligente. Wallet tiene excelentes listas de compras calculadas y reglas, pero limita categorías, no soporta gastos futuros ni cuotas reales y no modela ciclos de tarjetas.
- **Alcance:**
  - **Fase 1 (Tarjetas Mobills+):** Liquidación con opción de pago total, pago mínimo o parcial con arrastre de deuda acumulada e intereses para el próximo resumen. Cálculo de resúmenes pasados, presentes y futuros.
  - **Fase 2 (Búsqueda & Filtros Pro):** Buscador multi-criterio con presets temporales (Hoy, Esta semana, Mes, Año), chips descartables rápidos y selector de estado.
  - **Fase 3 (Shopping List Inteligente):** Módulo de lista de compras con ítem, cantidad, precio unitario y total automático, con botón *"Completar y Registrar Gasto"* imputado en 1 clic a la cuenta o tarjeta seleccionada.
- **Criterios de Aceptación:**
  - Pago parcial de tarjeta traslada el saldo remanente al ciclo siguiente.
  - Búsqueda y filtrado instantáneo sin lags ni recargas.
  - Creación de listas de compras y conversión a transacción contable automática.
  - [x] Cero errores de compilación (`tsc --noEmit && npm run build`).

---

### P20 — Resiliencia Offline-First: Fallback Local en Shopping List
- **Problema:** Si el usuario abre la lista de compras en un supermercado con baja cobertura o durante ventanas de sincronización en Supabase, la vista no debe bloquearse ni mostrar mensajes de error intrusivos.
- **Alcance:**
  - Agregar fallback automático a `localStorage` en `shopping.service.ts` y `ShoppingListManager.tsx` (siguiendo el patrón de tolerancia a fallos ya implementado en `finance-store.ts` para reglas y tags).
  - Estado offline transparente: ante caídas de red o demoras de respuesta remota, cargar y permitir editar listas localmente, sincronizando con Supabase en cuanto se restablezca la conexión.
  - Notificación no invasiva (indicador de sincronización sutil) en reemplazo del toast de error repetitivo.
- **Criterios de Aceptación:**
  - Las listas de compras pueden crearse, editarse, chequearse y completarse aun sin conexión con Supabase.
  - La reconexión propaga los cambios remotos sin pisar datos del usuario.

---

### P21 — Buscador Omnicanal Global (`Cmd+K`) & Acciones Rápidas
- **Problema:** Encontrar rápidamente una transacción por comercio o monto, saltar a una cuenta específica o disparar un nuevo gasto requiere múltiples clics o navegar por menús dispersos.
- **Alcance:**
  - Componente modal tipo Linear/Raycast (`GlobalCommandMenu.tsx`) accesible globalmente mediante el atajo `Cmd+K` / `Ctrl+K` en desktop y botón lupa en la barra de navegación móvil.
  - Búsqueda en tiempo real indexando:
    - **Transacciones:** búsqueda por descripción, comercio y monto.
    - **Cuentas bancarias & billeteras:** salto directo a la cuenta seleccionada.
    - **Categorías & Presupuestos:** acceso directo al detalle de asignación.
    - **Acciones Rápidas (Command Palette):**
      - `+ Registrar Gasto` (abre `QuickAddSheet` con foco listo en monto).
      - `+ Nueva Lista de Compras` (abre `ShoppingListManager` en creación).
      - `🔒 Alternar Modo Privacidad` (ofusca o revela saldos al instante).
      - `🌓 Alternar Modo Oscuro/Claro`.
      - `📥 Importar Extracto Bancario (CSV/Excel/PDF)`.
      - `📊 Ir a Reportes / Flujo de Caja / Tarjetas`.
- **Criterios de Aceptación:**
  - `Cmd+K` abre el modal en menos de 100ms con foco automático en el input.
  - La navegación con flechas de teclado y `Enter` ejecuta la acción o abre la vista seleccionada.
  - En móviles, un botón táctil en el header o barra inferior activa la misma experiencia.

---

### P22 — Atajos de Teclado Globales & Cheat Sheet Modal (`?`)
- **Problema:** Los usuarios avanzados operan mucho más rápido con teclado, pero los atajos actuales (como `H` para privacidad) están ocultos y no existe un estándar consistente de navegación rápida.
- **Alcance:**
  - Sistema de atajos globales unificado:
    - **Navegación Go-To (Secuencias `G + [tecla]`):** `G + D` (Dashboard), `G + T` (Transacciones), `G + C` (Tarjetas), `G + B` (Presupuestos), `G + S` (Shopping List), `G + R` (Reportes), `G + A` (Ajustes).
    - **Acciones Directas:** `N` (Nuevo gasto), `H` (Modo privacidad), `Cmd+K` (Buscador), `?` (Ver atajos).
  - Modal interactivo de referencia rápida (`KeyboardShortcutsModal.tsx`) accesible presionando `?` o `Shift + /` en cualquier pantalla que no sea un campo de texto editable.
- **Criterios de Aceptación:**
  - Presionar `?` despliega el modal con diseño estético de alta gama agrupado por categorías.
  - Los atajos no se disparan cuando el usuario está escribiendo en un input o textarea.

---

### P23 — Transiciones Cinemáticas de Vistas (Framer Motion)
- **Problema:** Al alternar entre pestañas o módulos principales, el contenido parpadea o cambia de golpe, rompiendo la sensación de aplicación premium y artesanal.
- **Alcance:**
  - Envoltorio unificado `<PageTransition>` para todas las vistas principales en `Index.tsx`.
  - Animación fluida de entrada/salida (`opacity: 0, y: 8` -> `opacity: 1, y: 0`) con curva orgánica (`easeOut`, 250ms).
  - Respeto estricto a preferencias de accesibilidad (`prefers-reduced-motion`).
- **Criterios de Aceptación:**
  - [x] Todo cambio de pestaña se siente suave, continuo y a 60 FPS sin tirones visuales.

---

### P24 — Sparklines de Tendencia en Métricas del Dashboard
- **Problema:** Las tarjetas de métricas del Dashboard (Ingresos, Gastos, Balance Neto) son números estáticos que no transmiten la velocidad ni la aceleración del flujo de dinero en el mes.
- **Alcance:**
  - Componente `<DashboardSparkline>` embebido en el fondo de las tarjetas de métricas principales.
  - Mini gráfico de área minimalista con gradiente suave (`defs/linearGradient`), sin ejes ni etiquetas ruidosas, reflejando la curva evolutiva de los últimos 14/30 días.
  - Adaptación cromática automática según el tipo de métrica (verde para ingresos, rojo/ámbar para gastos, acento para balance).
- **Criterios de Aceptación:**
  - Las tarjetas de resumen muestran la mini-curva de fondo sin sobrecargar la lectura del número monetario principal.
  - Se adapta responsivamente al ancho de pantalla.

---

### P25 — Pull-To-Refresh Móvil con Respuesta Háptica
- **Problema:** En smartphones y PWA instalada, para refrescar datos o cotizaciones el usuario debe recurrir a trucos de navegación o recargar el navegador.
- **Alcance:**
  - Componente contenedor `<PullToRefresh>` que detecta el gesto de arrastre vertical hacia abajo cuando el scroll está en la parte superior.
  - Resistencia elástica progresiva, indicador visual giratorio y vibración táctil nativa (`navigator.vibrate` / háptica) al alcanzar el umbral de disparo.
  - Recálculo en caliente de balances, cotizaciones de divisas y sincronización de la cola de Shopping List.
- **Criterios de Aceptación:**
  - [x] Funciona naturalmente en dispositivos móviles táctiles sin interferir con el scroll vertical normal.
  - [x] Feedback háptico sutil al completar el gesto.

---

### P26 — Centro de Novedades In-App ("What's New Modal")
- **Problema:** Cuando se despliegan actualizaciones y mejoras de valor, el usuario no se entera o las descubre por casualidad, perdiéndose el impacto del progreso continuo del producto.
- **Alcance:**
  - Modal interactivo de novedades (`ReleaseNotesModal.tsx`) con estética visual de impacto:
    - Badge animado de versión (*"Update Disponible v0.2.0"*).
    - Tarjetas con íconos de highlights funcionales destacando las 3 mejoras principales del release.
    - Botón primario de confirmación (*"¡Entendido, vamos!"*) y enlace para ver el historial completo.
  - Apertura automática en el primer inicio tras un cambio de versión (persistido en `localStorage`), y botón manual en el perfil o ajustes para consultarlo cuando se desee.
- **Criterios de Aceptación:**
  - Si la versión en `package.json` es superior a la última vista por el usuario, el modal aparece una única vez tras el login.
  - Puede volver a abrirse manualmente en cualquier momento desde *Ajustes* o *Mi Perfil*.


---

### P27 — Motor Global Offline-First & Outbox Sync (Toda la App)
- **Problema:** La carga de gastos y operaciones financieras ocurre primordialmente en la calle (bares, cocheras, transporte, supermercados) donde la red celular puede fallar o fluctuar. Revertir transacciones (`rollback`), perder datos o mostrar pantallas en blanco por falta de conexión destruye la confiabilidad del producto.
- **Alcance:**
  - **Apertura Instantánea (0ms):** Carga inicial de `useFinanceStore` hidratada desde almacenamiento local (`localStorage`), permitiendo visualizar cuentas, saldos y transacciones sin latencia de red ni spinners bloqueantes (*Stale-While-Revalidate*).
  - **Outbox Pattern Universal:** Servicio central de cola de salida (`sync-queue.service.ts`) para acumular operaciones sin conexión cubriendo **todas las 9 entidades de dominio**:
    1. Transacciones (crear, editar, borrar, recalcular saldos).
    2. Cuentas (crear, editar, archivar, restaurar, eliminar, ajustar balance).
    3. Categorías (crear, editar, archivar, eliminar).
    4. Presupuestos (crear, editar, eliminar).
    5. Metas (crear, editar, aportar, retirar, eliminar).
    6. Facturas / Servicios (crear, editar, marcar pagado, eliminar).
    7. Transacciones Recurrentes (crear, editar, pausar/reanudar, eliminar).
    8. Etiquetas (crear, eliminar).
    9. Reglas de Categorización (crear, editar, pausar/activar, eliminar).
  - **UUIDs v4 en Cliente:** Identificadores `crypto.randomUUID()` generados en el navegador para todas las nuevas entidades, garantizando relaciones íntegras en memoria y persistencia idempotente en Supabase vía `upsert` con `onConflict: "id"`.
  - **Auto-Sincronización Idempotente:** Listener automático ante reconexión (`window.ononline`) con drenado secuencial FIFO y botón de sincronización forzada bajo demanda.
  - **Indicador Global de Conectividad:** Chip minimalista en la cabecera indicando *"Al día"* o *"X pendientes"* con feedback animado de sincronización y disparador táctil.
- **Criterios de Aceptación:**
  - [x] El usuario puede abrir la app y operar en modo avión sin pantallas en blanco ni bloqueos.
  - [x] Toda entidad creada o modificada sin internet se persiste localmente y se encola para su despacho posterior sin rollbacks destructivos.
  - [x] Al restablecerse la red, los datos se propagan a Supabase automáticamente sin generar duplicados.
  - [x] Retención segura de operaciones en la cola si el servidor responde con error, permitiendo reintentos.

---

## 💡 Próximos Horizontes de Producto (Siguiente Etapa de DOM)

Habiendo liquidado la totalidad de las épicas fundamentales (**P0 a P20**) y el sprint de Quick Wins de UX (**P21, P22, P24, P26**), el producto consolida una experiencia de uso ágil y sensorial:

### C1 — Personalidades Configurables del Bot Financiero (Salo / Levi / Tito)
- **Problema:** Cada usuario tiene una relación psicológica distinta con el dinero. Algunos prefieren sobriedad y sabiduría directa, otros precisión técnica de copiloto, y otros un trato compinche y relajado que desdramatice las finanzas.
- **Alcance:**
  - Selector de arquetipo en *Ajustes de Perfil / Integración WhatsApp*:
    1. **Salo (El Sabio Práctico):** Directo, protector, astuto con las cuotas y vencimientos, habla con sabiduría de calle y firmeza paternal.
    2. **Levi (El Copiloto Analítico):** Preciso, sobrio, métrico, enfocado en eficiencia, apalancamiento y ratios de ahorro.
    3. **Tito (El Compinche Positivo):** Relajado, amigable, desestresante, celebra los logros y quita la culpa del gasto sin perder el rigor en el registro.
  - Inyección dinámica del *system prompt* del webhook de WhatsApp según la preferencia elegida en `public.profiles.bot_personality`.
- **Criterios de Aceptación:**
  - El usuario puede alternar la personalidad de su asistente desde la app y el bot adopta el tono inmediatamente en su siguiente respuesta.

---

### C2 — Escaneo Inteligente de Tickets con Visión Multimodal (Client-side / Cloud OCR)
- **Problema:** Tipear manualmente los detalles de tickets extensos de supermercados o facturas de compras físicas sigue generando fricción cuando se registra un comprobante.
- **Alcance:**
  - Integrar extracción automática de ítems, montos y comercio al subir una foto o comprobante en `QuickAddSheet` o `TransactionEditSheet`.
  - Sugerencia de autocompletado de ítems para poblar la lista de compras o desglosar gastos en subcategorías.
- **Criterios de Aceptación:**
  - Al tomar foto a un ticket, el sistema extrae automáticamente fecha, comercio, total e ítems sugeridos con confirmación en 1-tap.

---

### C3 — Detector de Fugas & Auditor de Suscripciones (Subscription Leak Detector)
- **Problema:** Micro-gastos recurrentes invisibles (streaming, membresías olvidadas, comisiones bancarias) drenan el ahorro sin que el usuario sea consciente de su impacto anual y plurianual.
- **Alcance:**
  - Detección automática en el historial de transacciones de patrones mensuales fijos.
  - Cálculo del costo proyectado a 1 año, 3 años y 5 años con interés compuesto de costo de oportunidad.
  - Acciones rápidas: *"Pausar suscripción"*, *"Establecer recordatorio de cancelación"* o *"Marcar como indispensable"*.
- **Criterios de Aceptación:**
  - El usuario visualiza un ranking de suscripciones activas ordenadas por peso anual sobre sus ingresos.

---

### C4 - Finanzas Compartidas / Modo Pareja o Familia (Household Finance)
- **Problema:** En parejas o familias se comparten gastos comunes (alquiler, compras, servicios) pero cada miembro mantiene cuentas bancarias y gastos personales separados.
- **Alcance:**
  - Vinculación segura de dos perfiles de DOMINUS a un "Espacio Compartido".
  - Posibilidad de imputar transacciones a presupuestos compartidos o registrar quién pagó para cálculo automático de liquidación de saldos (*Splitwise-style* integrado).
- **Criterios de Aceptación:**
  - Cada miembro mantiene sus cuentas bancarias privadas, pero puede visualizar y nutrir los compromisos y presupuestos comunes.

---

### P29 - Transición a Marca DOM: Identidad Soberana, Geometría SIGIL, Retrocompatibilidad & Cero Pérdida de Datos
- **Problema:** Las denominaciones previas (m3 e IMPERO) presentaban fricciones legales y de percepción de marca (connotaciones autoritarias o genéricas). Se requiere una identidad perenne, sobria y de autoridad serena ("DOM") manteniendo absoluta continuidad operativa sin pérdida de datos para los usuarios existentes.
- **Alcance:**
  - **Identidad Visual:** Geometría matemática SIGIL integrada en isotipo (`DominusSymbol`), logotipo institucional con tipografía noble `Cinzel` (`DominusLogo`) y tokens de color con contraste WCAG AAA.
  - **Retrocompatibilidad Absoluta:** Motor de migración en cadena de claves locales hacia `dom-*` (`storage-migration.ts`) con preservación de colas offline y cachés previas.
  - **PWA & Assets Móviles:** Actualización de `manifest.webmanifest`, splash screen en carbón `#0c0e12`, generación de assets con SDF y auditoría de recursos con `pwa-assets-audit`.
  - **Canales Externos:** Rediseño de las 8 plantillas transaccionales de correo en Supabase Auth y actualización de mensajes en el webhook de WhatsApp.
  - **Internacionalización:** 100% de paridad en 1.110 claves bilingües con la nueva microcopia de soberanía.
- **Criterios de Aceptación:**
  - Cero pérdida de datos o desconfiguración de sesiones para usuarios preexistentes.
  - La suite de validación (`npm run check:all`) pasa al 100% con cero errores y cero advertencias.


