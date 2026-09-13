# DOM - Finanzas Personales Soberanas

<p align="center">
  <img src="public/icons/icon.svg" width="128" height="128" alt="DOM logo" />
  <br />
  <strong>El dominio no se conquista. Se administra.</strong>
</p>

> **Finanzas personales soberanas, privadas y con proyección certera.**  
> Aplicación open-source y self-hosted diseñada para eliminar la fricción de registro mediante IA (WhatsApp con audio, fotos o texto), proyectar el flujo de caja a 30/60/90 días y gobernar tu economía personal con serenidad y constancia.

---

## 🌟 ¿Por qué DOM? (Ventajas frente a soluciones tradicionales)

A diferencia de aplicaciones comerciales cerradas (**Mobills**, **Wallet by BudgetBakers**, etc.) que cobran suscripciones mensuales recurrentes o venden datos a redes de crédito:

- 🛡️ **100% Soberana y Privada:** Vos sos el único dueño de tu información. Corre sobre tu propia base de datos PostgreSQL en Supabase (o en local con Docker) con Row Level Security (RLS) activo.
- 💬 **Ingesta de Cero Fricción por WhatsApp (IA):** Registrá gastos en segundos enviando un audio de voz, una foto de ticket de compra o texto en lenguaje natural a tu propio webhook de WhatsApp.
- 📈 **Proyección de Flujo de Caja (30/60/90 días):** Simulador de compras incorporado (*"¿Puedo gastar $X hoy sin quedar en descubierto?"*).
- 🌐 **Soporte Multi-Moneda y Balance Consolidado:** Cuentas en ARS, USD, EUR con cotizaciones dinámicas y arbitraje automático en transferencias.
- 🔄 **Presupuestos con Rollover:** Trasladá el dinero ahorrado al mes siguiente automáticamente.
- ⚡ **PWA Instalable:** Instalable en iPhone, Android y escritorio como app nativa con soporte offline-first.

---

## 🚀 Despliegue en 5 Minutos (Tu Instancia Personal)

### Opción A: Despliegue en Vercel + Supabase Cloud (Recomendada)

1. **Crear base de datos en Supabase (Gratis):**
   - Creá una cuenta en [supabase.com](https://supabase.com) y un nuevo proyecto.
   - En el **SQL Editor** de tu proyecto Supabase, ejecutá el script consolidado:
     ```sql
     -- Copiar y pegar el contenido de:
     supabase/releases/release_v1.0.0_core_foundation.sql
     -- Luego ejecutar el delta de features:
     supabase/releases/release_v1.1.0_ai_whatsapp_and_multicurrency.sql
     ```
   - Obtené tu **Project URL** y **anon/public API key** desde *Project Settings -> API*.

2. **Desplegar el Frontend en Vercel:**
   - Hacé un **Fork** de este repositorio en tu cuenta de GitHub.
   - Entrá a [vercel.com](https://vercel.com) e importá tu fork (o conectá tu proyecto existente con la integración oficial de Supabase).
   - En la sección **Environment Variables**, configurá:
     ```env
     VITE_SUPABASE_PROJECT_ID=tu-project-id
     VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=tu-anon-key-publica
     VITE_ENABLE_SIGNUP=false
     ```
   - Hacé clic en **Deploy**.

3. **Crear tu Usuario Inicial (Instancia Privada):**
   - En tu panel de Supabase: andá a **Authentication** ➔ **Users**.
   - Hacé clic en **"Add user"** ➔ **"Create user"** *(no uses "Invite user")*.
   - Ingresá tu email, definí tu contraseña y asegurate de marcar el switch **"Auto Confirm User?"**.
   - Andá a **Authentication** ➔ **Providers** ➔ **Email** y desmarcá **"Allow new users to sign up"** para que nadie más pueda registrarse en tu base.
   - ¡Listo! Abrí tu app en Vercel e iniciá sesión con ese email y contraseña.

4. **Configurar el Bot de WhatsApp con IA (Opcional):**
   - El bot corre en tu propia Edge Function de Supabase (`supabase/functions/whatsapp-webhook`).
   - Cada usuario coloca sus propias credenciales en los **Secrets de su proyecto Supabase** (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `GEMINI_API_KEY`). No hay servidores compartidos ni intermediarios.
   - En la app, vas a **Ajustes ➔ Integración con WhatsApp**, vinculás tu número telefónico personal y validás con el código OTP de 6 dígitos.

5. **Personalización de Correos Electrónicos (Opcional):**
   - Por defecto, Supabase Cloud envía correos genéricos en inglés.
   - Para que los correos de confirmación y reseteo de contraseña lleven el diseño oficial de DOM, Supabase Cloud requiere habilitar un servidor SMTP propio (podés usar tu propia cuenta de Gmail gratuita con una *Contraseña de aplicación* o Resend).
   - La guía paso a paso y los códigos HTML están detallados en [docs/EMAIL_TEMPLATES.md](docs/EMAIL_TEMPLATES.md).

---

### Opción B: Ejecución 100% Local (Docker + Vite)

Para máxima privacidad sin tocar la nube:

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/dom.git
cd dom

# 2. Instalar dependencias
npm install

# 3. Iniciar Supabase local con Docker
npx supabase start

# 4. Crear archivo .env.local
cp .env.example .env.local
# (Completar con las credenciales locales que devuelve supabase start)

# 5. Iniciar servidor local
npm run dev
```

- La app estará disponible en `http://localhost:5173`.
- La base de datos en `postgresql://postgres:postgres@127.0.0.1:54422/postgres`.
- El buzón de correos de desarrollo (Inbucket) en `http://127.0.0.1:54324`, donde las plantillas en español de DOM ya vienen **preconfiguradas y listas para usar** desde `supabase/templates/`.

---

## 📬 Plantillas de Correo Electrónico (Transaccionales)

DOM incluye plantillas HTML responsive con identidad visual sobria (*Obsidian + Verde Esmeralda*):

- **En Desarrollo Local (Supabase CLI):** Las plantillas en [`supabase/templates/`](supabase/templates/) ya están vinculadas en [`supabase/config.toml`](supabase/config.toml) y se visualizan automáticamente en Inbucket sin configuración adicional.
- **En Producción Self-Hosted (Docker Compose):** Se monta el volumen `./supabase/templates:/etc/gotrue/templates:ro` en el contenedor `auth` y se definen las variables de entorno `GOTRUE_SMTP_*` de tu propio servidor de correo (Postfix, Mailcow, Stalwart, Gmail, etc.).
- **En Supabase Cloud (Managed):** Dado que Supabase Cloud bloquea la edición de templates con su remitente compartido `@supabase.co`, solo tenés que conectar tu SMTP (Gmail App Password o Resend) en *Project Settings ➔ Authentication ➔ SMTP Settings* para desbloquear el editor y pegar los diseños de [docs/EMAIL_TEMPLATES.md](docs/EMAIL_TEMPLATES.md).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Componentes UI:** shadcn/ui, Radix UI, Framer Motion
- **Visualización de Datos:** Recharts (responsive containers con gradientes semánticos)
- **Persistencia & Auth:** Supabase (PostgreSQL 15, Auth con JWT, Row Level Security)
- **Pruebas y QA:** Vitest, Testing Library, PWA Manifest Validator

---

## 🔒 Privacidad, Seguridad y Modo Instancia Personal (Single-User)

- **Protección Anti-Abuso para tu Instancia:** Para evitar que personas no autorizadas se registren y consuman tu cuota gratuita de Supabase:
  1. En tu archivo `.env` o en las variables de entorno de Vercel, mantené `VITE_ENABLE_SIGNUP="false"`. Solo pasalo temporalmente a `"true"` para crear tu usuario inicial.
  2. En el panel de Supabase: **Authentication** ➔ **Providers** ➔ **Email** ➔ desmarcá **"Allow new users to sign up"**.
- Las políticas RLS (`Row Level Security`) garantizan que ningún usuario pueda leer o escribir registros de otro.
- Atajo de teclado nativo: presioná la tecla **`H`** en cualquier momento para activar el **Modo Privacidad** y ofuscar todos los saldos visibles en pantalla (`$ ••••••`).

---

## 📄 Licencia

Software libre bajo licencia MIT. Desarrollado con excelencia por y para personas que valoran la soberanía de sus finanzas. DOM: El dominio no se conquista. Se administra.
