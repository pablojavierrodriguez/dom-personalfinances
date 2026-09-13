# SPEC-021: Transición de Identidad de Marca hacia IMPERO (Histórico — Actual: DOM)

> [!NOTE]
> **Trazabilidad Histórica:** Esta especificación documenta la transición intermedia hacia IMPERO. La identidad definitiva consolidada del producto es **DOM** (*"El dominio no se conquista. Se administra."*), formalizada en [rebrand.md](file:///Users/adrisol/Pablo/code/m3/docs/reports/rebrand.md).

---

## 1. Contexto y Objetivos

Esta especificación formaliza las pautas técnicas, de producto y de microcopia para la evolución del proyecto de su nombre técnico anterior (`m3`) a su identidad oficial definitiva: **IMPERO**.

El objetivo no es un mero reemplazo de logotipo o cadenas de texto, sino asegurar consistencia entre la arquitectura de software, la experiencia de usuario y la premisa fundacional: **administración financiera con visión y propósito**.

---

## 2. Principios de Microcopia y Vocabulario Técnico

Para erradicar la culpa y el estrés asociados tradicionalmente a las finanzas personales, la terminología en la UI y notificaciones debe seguir esta equivalencia estricta:

| Término Tradicional / Obsoleto | Nuevo Estándar IMPERO | Fundamento Psicológico |
| :--- | :--- | :--- |
| **Presupuesto / Límites de Gasto** | **Asignación de Recursos** | Enfatiza soberanía y gobierno activo sobre el destino del capital, no restricción pasiva. |
| **Gasto Excedido / ¡Cuidado! / Peligro** | **Umbral de Asignación Alcanzado** | Feedback neutral y sereno; elimina la culpa y favorece la toma de decisiones consciente. |
| **Gastar Menos / Ahorrar a la fuerza** | **Optimización de Flujo / Reserva Estratégica** | Mentalidad de soberano administrando su tesoro. |
| **Dashboard de Gastos** | **Tablero de Soberanía / Flujo de Caja** | Enfoque en control prospectivo (30/60/90 días) antes que en autopsia de gastos pasados. |

---

## 3. Jerarquía de Identidad y Arquitectura de Asistentes

1. **La Plataforma:** **IMPERO** es el sistema, la base de datos soberana y el hub web/móvil.
2. **El Asistente Inteligente (WhatsApp):** No compite con la marca principal. Se configura por perfil de personalidad:
   - **Salo:** Guía predeterminada. Prudente, conciso y reflexivo.
   - **Levi:** Modo técnico/escriba para registro minimalista e instantáneo.
   - **Tito:** Enfoque disciplinar y estoico.

---

## 4. Áreas de Aplicación en el Código

- **PWA / App Shell:** Metadatos `index.html`, `manifest.webmanifest`, nombre del binario/paquete en `package.json`.
- **Onboarding & Landing:** Presentación institucional basada en soberanía financiera y privacidad absoluta (self-hosted / local-first).
- **Bot Engine / Edge Functions:** Actualización de saludos, ayuda contextual y despedidas para reflejar la pertenencia a IMPERO.
