# Plantillas de Email Oficiales - DOM (El dominio no se conquista. Se administra)

> **CONFIGURACIÓN DEL LOGOTIPO Y DOMINIO:**
> Las plantillas están preparadas para cargar el logo desde el repositorio o dominio público:
> `https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg`
> (o reemplazar por `https://<tu-dominio-produccion>/icons/icon.svg`).
> Si las imágenes remotas son bloqueadas por el cliente de correo del usuario, la etiqueta cuenta con fallback automático (`onerror="this.style.display='none'"`) para que la tipografía de **DOM** se muestre de forma limpia e impecable.

---

## 🏛️ Despliegue Open-Source & Self-Hosted (Soberanía Total)

En una instalación **Self-Hosted** de DOM (desplegada con Docker Compose, Supabase CLI, Coolify, Dokku o VPS propio), **no existe ninguna restricción de edición**:

1. **Templates físicos en el repositorio:** Todas las plantillas HTML ya residen directamente en la carpeta [`supabase/templates/`](file:///Users/adrisol/Pablo/code/m3/supabase/templates) del proyecto:
   - `invite.html`
   - `confirm_signup.html`
   - `magic_link.html`
   - `reset_password.html`
   - `change_email.html`
   - `email_changed_notification.html`
   - `password_changed_notification.html`
   - `reauthentication.html`

2. **Entorno Local (Supabase CLI):**
   Ya están cableadas en [`supabase/config.toml`](file:///Users/adrisol/Pablo/code/m3/supabase/config.toml). Al iniciar el entorno con `npx supabase start`, los correos se renderizan automáticamente con la identidad de DOM en el buzón local de desarrollo **Inbucket** (`http://127.0.0.1:54324`).

3. **Producción Self-Hosted (Docker Compose):**
   En el servicio de autenticación (`auth` / `gotrue`), se monta el volumen de plantillas o se configuran las variables de entorno:
   ```yaml
   auth:
     image: supabase/gotrue:v2.158.1
     volumes:
       - ./supabase/templates:/etc/gotrue/templates:ro
     environment:
       # Servidor SMTP soberano del usuario (Postfix, Mailcow, Stalwart, Gmail, etc.)
       GOTRUE_SMTP_HOST: ${SMTP_HOST}
       GOTRUE_SMTP_PORT: ${SMTP_PORT:-587}
       GOTRUE_SMTP_USER: ${SMTP_USER}
       GOTRUE_SMTP_PASS: ${SMTP_PASS}
       GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL:-notificaciones@tudominio.com}
       GOTRUE_SMTP_SENDER_NAME: "DOM"
       # Asuntos oficiales
       GOTRUE_MAILER_SUBJECTS_INVITE: "🚀 Te damos la bienvenida a DOM"
       GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "📩 Confirmá tu registro en DOM"
       GOTRUE_MAILER_SUBJECTS_RECOVERY: "🔑 Restablecer tu contraseña de DOM"
       GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "✨ Tu enlace de acceso a DOM"
       GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE: "📫 Confirmación de cambio de correo electrónico - DOM"
       # Rutas montadas de templates
       GOTRUE_MAILER_TEMPLATES_INVITE: "/etc/gotrue/templates/invite.html"
       GOTRUE_MAILER_TEMPLATES_CONFIRMATION: "/etc/gotrue/templates/confirm_signup.html"
       GOTRUE_MAILER_TEMPLATES_RECOVERY: "/etc/gotrue/templates/reset_password.html"
       GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: "/etc/gotrue/templates/magic_link.html"
       GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE: "/etc/gotrue/templates/change_email.html"
   ```

---

## ☁️ Si utilizás Supabase Cloud (Multidispositivo): Configurar SMTP

Si utilizás **Supabase Cloud** (el dashboard en `app.supabase.com`) para sincronizar tu cuenta entre celular, tablet y computadora personal:
- Las directivas locales de `supabase/config.toml` **no se aplican a la nube**.
- Supabase Cloud **bloquea la edición del asunto y cuerpo de los templates** si usás su mailer compartido por defecto (`@supabase.co`) para prevenir spam, forzando los correos en inglés y con un límite de ~3 correos por hora.
- **En cuanto configurás un servidor SMTP (gratuito), la interfaz se desbloquea al instante** y todos los correos solicitados desde cualquier dispositivo saldrán con el diseño soberano de DOM.

---

### Paso 1: Elegir un proveedor SMTP gratuito

Tenés dos caminos rápidos y sin costo:

#### Opción A: Tu propio Gmail personal (Sin registrarte en plataformas nuevas)
Si ya tenés una cuenta de Gmail personal o Google Workspace:
1. Andá a tu cuenta de Google > **Seguridad** (asegurate de tener activada la Verificación en 2 pasos).
2. En la barra de búsqueda de tu cuenta de Google escribí **Contraseñas de aplicaciones** (App Passwords).
3. Creá una contraseña con el nombre `DOM`. Google te mostrará una clave de 16 letras (ej: `abcd efgh ijkl mnop`).
4. En Supabase (`Project Settings` > `Authentication` > `SMTP Settings`), completá:
   - **Enable Custom SMTP:** ON
   - **Sender email:** `tu-correo@gmail.com`
   - **Sender name:** `DOM`
   - **Host:** `smtp.gmail.com`
   - **Port:** `465` (SSL)
   - **User:** `tu-correo@gmail.com`
   - **Password:** `<la clave de 16 letras generada>`

#### Opción B: Resend (Servicio especializado — 3.000 correos/mes gratis)
1. Creá una cuenta en [resend.com](https://resend.com).
2. Andá a **API Keys** y generá una clave (`re_...`).
3. En Supabase (`Project Settings` > `Authentication` > `SMTP Settings`), completá:
   - **Enable Custom SMTP:** ON
   - **Sender email:** `onboarding@resend.dev` (o tu correo verificado)
   - **Sender name:** `DOM`
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Password:** `<tu API Key de Resend>`

---

### Paso 2: Copiar las plantillas a Supabase Cloud

Una vez que hiciste clic en **Save** en los ajustes SMTP:
1. En el menú lateral izquierdo de Supabase Studio, navegá a **Authentication** > **Email Templates**.
2. Verás que los campos de texto y HTML ahora están **completamente desbloqueados**.
3. Seleccioná cada plantilla (*Confirm signup*, *Reset password*, *Magic link*, etc.):
   - Copiá el **Subject** en español especificado abajo.
   - En el editor HTML, reemplazá todo el contenido pegando el código del archivo correspondiente en `supabase/templates/` (o copiando los bloques HTML de esta documentación).
   - Hacé clic en **Save changes**.

A partir de ese instante, cualquier acción iniciada desde tu celular, tablet o navegador web disparará el correo oficial de DOM.

---

## 1. Invite User (Invitación a Usuario Nuevo)

**Panel Supabase:** `Authentication` > `Email Templates` > `Invite user`  
**Asunto:** `🚀 Te damos la bienvenida a DOM`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenida a DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Te damos la bienvenida a tu centro de control financiero</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Fuiste invitado a formar parte de <b>DOM</b>, la plataforma diseñada para brindarte administración financiera con visión y propósito, proyección certera y soberanía total sobre tus recursos.
                </p>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Para activar tu cuenta y configurar tu contraseña de acceso seguro, hacé clic en el siguiente enlace:
                </p>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .ConfirmationURL }}" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);">Activar mi Cuenta</a>
                </div>
                <p style="font-size: 13px; color: #64748b; margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5;">
                    Si no esperabas esta invitación o considerás que fue un error, podés ignorar este correo de forma segura.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 2. Confirm Signup (Confirmación de Registro)

**Panel Supabase:** `Authentication` > `Email Templates` > `Confirm signup`  
**Asunto:** `📩 Confirmá tu registro en DOM`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmá tu registro en DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Un paso más hacia tu claridad financiera</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Gracias por iniciar tu registro en <b>DOM</b>. Para garantizar la seguridad de tus finanzas y confirmar la titularidad de tu cuenta, necesitamos verificar tu dirección de correo electrónico.
                </p>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .ConfirmationURL }}" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);">Confirmar mi Email</a>
                </div>
                <p style="font-size: 13px; color: #64748b; margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5;">
                    Si no creaste esta cuenta, simplemente desestimá este mensaje. Nadie podrá acceder a tus datos sin este paso de verificación.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 3. Magic Link (Ingreso sin Contraseña)

**Panel Supabase:** `Authentication` > `Email Templates` > `Magic Link`  
**Asunto:** `✨ Tu enlace de acceso a DOM`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso rápido a DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; text-align: center; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Acceso seguro e instantáneo</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Hacé clic en el siguiente botón para ingresar directamente a tu panel de control de <b>DOM</b> sin necesidad de ingresar contraseña:
                </p>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .ConfirmationURL }}" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);">Ingresar al Sistema</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; line-height: 1.5; font-style: italic;">
                    Este enlace es de un solo uso y caduca automáticamente por razones de seguridad.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 4. Reset Password (Recuperación de Contraseña)

**Panel Supabase:** `Authentication` > `Email Templates` > `Reset password`  
**Asunto:** `🔑 Restablecer tu contraseña de DOM`

> [!NOTE]
> Esta plantilla incorpora un borde superior de alerta ámbar (`#f59e0b`) y un botón de fondo oscuro sobrio (`#0d0e12`), denotando una acción de seguridad crítica.

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer contraseña - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-top: 6px solid #f59e0b; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; text-align: center; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #0d0e12; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(13, 14, 18, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-top: 6px solid #f59e0b; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Solicitud para restablecer tu contraseña</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Recibimos una solicitud para actualizar la contraseña de acceso a tu cuenta en <b>DOM</b>. Si fuiste vos, podés generar una nueva credencial ahora mismo:
                </p>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .ConfirmationURL }}" class="btn" style="display: inline-block; background-color: #0d0e12; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(13, 14, 18, 0.35);">Restablecer Contraseña</a>
                </div>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 35px; font-style: italic; line-height: 1.5;">
                    Si no solicitaste este cambio, no te preocupes: tu cuenta y tus datos continúan completamente protegidos. Podés ignorar este correo.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 5. Change Email Address (Cambio de Correo)

**Panel Supabase:** `Authentication` > `Email Templates` > `Change email address`  
**Asunto:** `📫 Confirmación de cambio de correo electrónico - DOM`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de nuevo correo - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; text-align: center; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Confirmá tu nueva dirección de correo</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Solicitaste actualizar la dirección de correo asociada a tu cuenta en <b>DOM</b>. Para completar este cambio y resguardar tu acceso soberano, confirmá la nueva dirección:
                </p>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .ConfirmationURL }}" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);">Confirmar Nuevo Email</a>
                </div>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 35px; font-style: italic; line-height: 1.5;">
                    Si no solicitaste este cambio, comunicate de inmediato con el soporte de tu instancia.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 6. Reauthentication (Código de Verificación OTP)

**Panel Supabase:** `Authentication` > `Email Templates` > `Reauthentication`  
**Asunto:** `🔐 Tu código de verificación - DOM`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de verificación - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; text-align: center; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .otp-code { display: inline-block; background-color: #f8fafc; color: #0d0e12; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; padding: 18px 36px; border-radius: 12px; border: 2px dashed #94a3b8; margin: 20px 0; font-family: 'IBM Plex Sans', monospace; }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Verificación de identidad</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Utilizá el siguiente código de un solo uso para confirmar tu acción en <b>DOM</b>. Este código es de validez temporal y expirará en pocos minutos:
                </p>
                <div class="otp-code" style="display: inline-block; background-color: #f8fafc; color: #0d0e12; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; padding: 18px 36px; border-radius: 12px; border: 2px dashed #94a3b8; margin: 20px 0;">
                    {{ .Token }}
                </div>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; font-style: italic; line-height: 1.5;">
                    Nunca compartas este código con nadie. El equipo de DOM jamás te solicitará este token por ningún canal.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 7. Email Changed (Notificación de Cambio Exitoso)

**Asunto:** `📫 Tu correo en DOM ha sido actualizado`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Correo actualizado - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; text-align: center; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Dirección de correo actualizada</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Te informamos que la dirección de correo electrónico vinculada a tu cuenta de <b>DOM</b> ha sido actualizada satisfactoriamente.
                </p>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    A partir de este momento, deberás ingresar a la plataforma utilizando tu nueva dirección.
                </p>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 35px; font-style: italic; line-height: 1.5;">
                    Si no realizaste este cambio, ponete en contacto de inmediato con el administrador o soporte, ya que la seguridad de tu acceso podría estar comprometida.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 8. Password Changed (Notificación de Contraseña Actualizada)

**Asunto:** `🔐 Tu contraseña de DOM ha sido cambiada`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contraseña actualizada - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; text-align: center; }
        .content h2 { font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3; }
        .content p { font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569; }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Contraseña modificada correctamente</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Te confirmamos que la contraseña de tu cuenta en <b>DOM</b> ha sido cambiada de forma exitosa.
                </p>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Si fuiste vos quien realizó esta acción, no necesitás hacer nada adicional: tu cuenta se encuentra protegida.
                </p>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 35px; font-style: italic; line-height: 1.5;">
                    Si no reconocés esta modificación, restablecé tu contraseña de inmediato desde la pantalla de inicio de sesión de DOM para bloquear accesos no autorizados.
                </p>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 9. Alerta de Vencimiento de Factura / Tarjeta (Dominio Financiero)

> **Uso:** Plantilla para notificaciones automáticas de cuentas por pagar, vencimiento de resúmenes de tarjetas o suscripciones recurrentes (módulo `bills_and_subscriptions`).

**Asunto:** `⚠️ Recordatorio: Vencimiento de {{ .BillName }} el {{ .DueDate }}`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta de Vencimiento - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-top: 6px solid #10b981; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; }
        .bill-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center; }
        .bill-amount { font-size: 28px; font-weight: 900; color: #0d0e12; font-family: monospace; margin: 10px 0; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-top: 6px solid #10b981; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Tenés un pago próximo a vencer</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    De acuerdo con tu planificación de flujo de caja, el siguiente compromiso financiero vence próximamente:
                </p>
                <div class="bill-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                    <div style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">{{ .BillName }}</div>
                    <div class="bill-amount" style="font-size: 28px; font-weight: 900; color: #0d0e12; font-family: monospace; margin: 10px 0;">$ {{ .Amount }}</div>
                    <div style="font-size: 14px; color: #334155;">Fecha de vencimiento: <b>{{ .DueDate }}</b></div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Modalidad: {{ .PaymentMethod }}</div>
                </div>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .AppURL }}/bills" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);">Registrar Pago en DOM</a>
                </div>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 10. Resumen Mensual de Claridad Financiera (Dominio Financiero)

> **Uso:** Plantilla para el reporte mensual de patrimonio neto, ahorro y flujo de fondos.

**Asunto:** `📊 Tu reporte de Claridad Financiera — Mes de {{ .MonthName }}`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Mensual - DOM</title>
    <style>
        body { font-family: 'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }
        .wrapper { background-color: #f4f4f7; padding: 50px 15px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .header { background-color: #0d0e12; padding: 40px 30px; text-align: center; }
        .logo-img { height: 48px; width: auto; margin-bottom: 8px; }
        .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1; }
        .logo-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px; }
        .content { padding: 45px 35px; color: #1e293b; }
        .stat-grid { width: 100%; border-collapse: collapse; margin: 25px 0; }
        .stat-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; text-align: center; }
        .btn-wrapper { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35); }
        .footer { background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper" style="background-color: #f4f4f7; padding: 50px 15px;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
            <div class="header" style="background-color: #0d0e12; padding: 40px 30px; text-align: center;">
                <img src="https://raw.githubusercontent.com/pablojavierrodriguez/dom/main/public/icons/icon.svg" alt="DOM" class="logo-img" style="height: 48px; width: auto; margin-bottom: 8px;" onerror="this.style.display='none'">
                <div class="logo-text" style="font-size: 26px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; margin: 0; line-height: 1;">DOM</div>
                <div class="logo-sub" style="font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #10b981; text-transform: uppercase; margin-top: 6px;">El dominio no se conquista. Se administra</div>
            </div>
            <div class="content" style="padding: 45px 35px; color: #1e293b;">
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;">Tu visión mensual consolidada</h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;">
                    Este es el resumen de tu posición patrimonial y flujo de fondos al cierre de <b>{{ .MonthName }}</b>:
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 15px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Patrimonio Neto Total</div>
                    <div style="font-size: 32px; font-weight: 900; color: #10b981; font-family: monospace; margin: 8px 0;">$ {{ .NetWorth }}</div>
                    <div style="font-size: 12px; color: #64748b;">Variación vs. mes anterior: <b style="color: #10b981;">{{ .NetWorthVariation }}</b></div>
                </div>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .AppURL }}/reports" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);">Ver Reporte Completo en DOM</a>
                </div>
            </div>
            <div class="footer" style="background-color: #ffffff; padding: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.6;">
                &copy; 2026 DOM • El dominio no se conquista. Se administra<br>
                <span style="font-size: 10px; color: #cbd5e1; letter-spacing: 0.1em; text-transform: none;">Administración financiera con visión y propósito</span>
            </div>
        </div>
    </div>
</body>
</html>
```
