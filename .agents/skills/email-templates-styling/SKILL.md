---
name: email-templates-styling
description: Usar esta skill siempre que se creen, diseñen, auditen o modifiquen plantillas de correo electrónico transaccionales en DOM (invitaciones, confirmación de registro, reseteo de clave, magic links, OTP o alertas financieras).
---

# Email Templates & Styling Guidelines - DOM

Guía de estándares de ingeniería para el diseño, maquetación HTML responsive y redacción de correos electrónicos transaccionales y de notificación en **DOM (El dominio no se conquista. Se administra)**.

---

## 1. Identidad Visual y Paleta de Emails

Los correos de DOM deben transmitir sobriedad, control, privacidad y elegancia soberana:

- **Header:** Fondo oscuro profundo `#0d0e12` (Obsidian luxury theme) con el logotipo de DOM y tipografía de alto impacto.
- **Logotipo y Marca:** Texto `DOM` en blanco (`#ffffff`), `font-weight: 900`, `letter-spacing: -0.04em`, acompañado del lema `El dominio no se conquista. Se administra` en color verde esmeralda `#10b981`.
- **Fondo exterior (Wrapper):** `#f4f4f7` (Platinum light neutro que garantiza contraste universal en clientes de correo con o sin dark mode forzado).
- **Contenedor central:** Fondo blanco puro `#ffffff`, `max-width: 600px`, `border-radius: 16px`, borde perimetral sutil `1px solid #e2e8f0`, sombra suave `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05)`.
- **Botón principal (CTA Primario):**
  - Fondo: `#10b981` (Verde Esmeralda Soberano de DOM).
  - Texto: `#ffffff !important`, `font-weight: 700`, sin subrayado (`text-decoration: none`).
  - Radio: `border-radius: 12px`.
  - Padding: `16px 40px`.
  - Sombra sutil: `box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35)`.
- **Botón secundario / Alerta de Seguridad (Reset Password):**
  - Fondo: `#0d0e12` (Dark Obsidian).
  - Borde superior de advertencia en contenedor: `border-top: 6px solid #f59e0b` (Ámbar de precaución).
- **Caja de Código OTP:**
  - Fondo: `#f8fafc`.
  - Borde: `2px dashed #94a3b8`, `border-radius: 12px`.
  - Tipografía: Monospaced / `32px`, `font-weight: 900`, `letter-spacing: 0.25em`, color `#0d0e12`.
- **Tipografía general:** `'IBM Plex Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Footer oficial:**
  - `© 2026 DOM • El dominio no se conquista. Se administra`
  - `Administración financiera con visión y propósito`
  - Microtipografía: `11px`, `#94a3b8`, `text-transform: uppercase`, `letter-spacing: 0.15em`.

---

## 2. Reglas de Compatibilidad HTML para Clientes de Correo

1. **Estilos en línea (Inline CSS) obligatorios:**
   - La mayoría de los webmails (Gmail, Outlook 365, Yahoo) limpian o ignoran selectores CSS avanzados y bloques `<style>` externos.
   - Definir siempre las reglas visuales críticas como atributos `style="..."` directamente en las etiquetas `<div>`, `<a>`, `<p>`, `<td>`.
2. **Ancho máximo seguro (Max-width 600px):**
   - El contenedor central debe tener `max-width: 600px; width: 100%; margin: 0 auto;`.
3. **Resiliencia ante bloqueo de imágenes:**
   - Todo elemento `<img>` debe incluir el atributo `onerror="this.style.display='none'"` y un texto de marca HTML adyacente para que, si el cliente bloquea imágenes por defecto, la identidad de DOM se visualice impecable.
4. **Variables nativas de Supabase Auth (GoTrue):**
   - Enlace de confirmación / activación: `{{ .ConfirmationURL }}`
   - Token / Código OTP: `{{ .Token }}`
   - Email del destinatario: `{{ .Email }}`
   - URL del sitio configurada: `{{ .SiteURL }}`

---

## 3. Plantilla Canónica Base (HTML)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOM</title>
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
                <h2 style="font-size: 22px; font-weight: 800; margin-top: 0; color: #0d0e12; line-height: 1.3;"><!-- Título del Mensaje --></h2>
                <p style="font-size: 15px; line-height: 1.6; margin-bottom: 22px; color: #475569;"><!-- Contenido Descriptivo --></p>
                <div class="btn-wrapper" style="text-align: center; margin: 35px 0;">
                    <a href="{{ .ConfirmationURL }}" class="btn" style="display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 16px 42px; border-radius: 12px; font-size: 15px; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.35);"><!-- Texto del Botón --></a>
                </div>
                <p style="font-size: 13px; color: #64748b; margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5;">
                    Si no reconocés esta solicitud, podés desestimar este mensaje de forma segura. Tus datos permanecen resguardados.
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

## 4. Checklist de Auditoría de Correos

Antes de publicar cualquier plantilla de email en Supabase o en el proveedor SMTP:

- [ ] ¿Los botones y links críticos tienen estilos inline `style="..."` completos?
- [ ] ¿El texto está redactado en español rioplatense formal, sobrio y consistente con los valores de DOM?
- [ ] ¿Las variables de reemplazo (`{{ .ConfirmationURL }}`, `{{ .Token }}`) corresponden con GoTrue de Supabase?
- [ ] ¿El contenedor no supera los `600px` y tiene resguardos para pantallas móviles (`width: 100%`)?
- [ ] ¿El enlace o botón incluye advertencia de seguridad para desestimar si el destinatario no inició la acción?
- [ ] ¿Se incluye el footer oficial con el copyright y el lema de DOM?
