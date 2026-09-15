---
name: release-management
description: Usar esta skill exclusivamente cuando el usuario solicite explícitamente preparar, consolidar o publicar un nuevo release o corte de versión para producción.
---

# Workflow Obligatorio de Release Management - DOM

El proceso de release se ejecuta **única y exclusivamente cuando el usuario lo solicite de forma explícita** para realizar un corte de versión y desplegar a producción (ej: *"preparemos el release v0.2.0 para producción"* o *"hagamos el corte de versión"*).

---

## Principio Fundamental

> [!IMPORTANT]
> **PROHIBIDO INCREMENTAR VERSIONES EN TAREAS COTIDIANAS:**
> Durante el desarrollo diario de features, refactors o bugfixes, **NUNCA** se debe modificar `version` en `package.json`, ni crear cabeceras de nuevas versiones cerradas en `docs/RELEASE_NOTES.md`.
>
> Todo trabajo en curso, por más grande que sea, reside obligatoriamente bajo:
> ```markdown
> ## [Unreleased] — En Desarrollo (Próxima Versión)
> ```
> La versión de `package.json` y los tags de Git representan **exclusivamente** el software desplegado y operativo en Producción (Cloud).

---

## 1. Verificación Previa y Quality Gate (Obligatorio)
Antes de cualquier modificación de versión o documentación de release:
```bash
npm run check:all
```
Este comando ejecuta en secuencia:
1. **Integridad de Releases (`scripts/check-release-integrity.cjs`):** Coherencia entre `package.json` y `RELEASE_NOTES.md`, y ausencia de identificadores internos.
2. **Tipado TypeScript (`tsc --noEmit`):** Cero errores.
3. **Tests Unitarios (`vitest`):** 100% de la suite pasando.
4. **Build de Producción (`vite build`):** Generación limpia de bundle.

Adicionalmente, si hubo cambios de base de datos:
```bash
supabase db reset
supabase db advisors --local
```

---

## 2. Determinación del Incremento de Versión (SemVer 2.0)
Editar `package.json`:
- **Paquete con Nuevas Funcionalidades o Módulos**: Incrementar **MINOR** (`0.1.0` $\rightarrow$ `0.2.0`).
- **Paquete exclusivo de Hotfixes o Correcciones Menores**: Incrementar **PATCH** (`0.1.0` $\rightarrow$ `0.1.1`).
- **Hito Mayor o Rediseño Disruptivo**: Incrementar **MAJOR** (`1.0.0`).

---

## 3. Consolidación de Novedades en `docs/RELEASE_NOTES.md`

### Enfoque de Producto 100% User-Facing:
- **Prohibido incluir identificadores internos:**
  - Ni números de SPEC (`SPEC-020`, `SPEC-014`).
  - Ni nombres de ramas (`feat/shopping-sync`).
  - Ni nombres de scripts SQL o deltas temporales (`20260910_add_rollover...sql`).
- Redactar en lenguaje de valor de producto para usuarios finales.
- En la sección técnica/arquitectura, describir las **capacidades implementadas** (ej: *"Persistencia remota reactiva en Supabase con actualizaciones optimistas y rollback ante desconexión"*), **nunca** mencionar los nombres de archivo de scripts de migración.

### Formato Oficial:
Convertir el contenido de `## [Unreleased]` en la nueva sección cerrada formal:
```markdown
## [X.Y.Z] — YYYY-MM-DD 🚀 <Título Descriptivo del Hito>
*Resumen ejecutivo en cursiva destacando el impacto principal.*

### ✨ Nuevas Funcionalidades & Core Financiero
- **Nombre de la Capacidad (`ComponentePrincipal`):** Detalle de valor para el usuario.

### 📱 Experiencia Móvil & UI
...

### 🛡️ Seguridad, Privacidad & Estabilidad
...
```
Restablecer una nueva cabecera vacía `## [Unreleased] — En Desarrollo (Próxima Versión)` al principio del documento.

---

## 4. Gestión de Base de Datos para Producción (Delta Único)
- **Un único archivo delta por release**: Durante el desarrollo de una versión, nunca dispersar cambios en múltiples archivos SQL sueltos.
- Consolidar todos los cambios DDL/RPC en un único script idempotente en `supabase/migrations/delta/YYYYMMDD_<nombre_release>.sql` listo para aplicar en Supabase Cloud.
- Validar que sea idempotente (`IF NOT EXISTS`, `OR REPLACE`).

---

## 5. Purgado de Backlog
- **`docs/BACKLOG.md`**: Mover los ítems completados al estado `Completado` o archivarlos.
- El historial detallado de lo implementado vive **únicamente en `docs/RELEASE_NOTES.md`**.

---

## 6. Validación de Integridad Post-Corte
Re-ejecutar:
```bash
node scripts/check-release-integrity.cjs
```
Debe confirmar que `package.json` coincide con la nueva versión cerrada y que no se filtraron identificadores internos.

---

## 7. Solicitud Interactiva de Git, Promoción a `main` y Tagging (OBLIGATORIO)

> [!CAUTION]
> **PROHIBIDO EJECUTAR `git commit`, `git tag` O `git push` DE FORMA AUTOMÁTICA.**
> Todo release se desarrolla y valida en `dev`, pero se libera y taguea obligatoriamente en `main` (Producción).

1. **Presentar el resumen consolidado al usuario:**
   - Nueva versión (`X.Y.Z`).
   - Resumen de notas de release generadas.
   - Estado de migraciones SQL para Cloud.
2. **Proponer formalmente la secuencia de comandos:**
   ```bash
   # Paso 1: Commit en dev
   git checkout dev
   git add package.json docs/RELEASE_NOTES.md docs/BACKLOG.md supabase/migrations/
   git commit -m "release(vX.Y.Z): <título del release>"
   git push origin dev

   # Paso 2: Promoción a Producción en main
   git checkout main
   git merge dev
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <título del release>"
   git push origin main && git push origin vX.Y.Z

   # Paso 3: Retorno a desarrollo
   git checkout dev
   ```
3. **Esperar autorización verbal explícita antes de ejecutar cualquier comando.**

---

## 8. Atomicidad y Regla de Amend ante Ajustes de Última Hora

> [!WARNING]
> **PROHIBIDO CREAR COMMITS PARCHE SOBRE UN RELEASE.**
> Ante cualquier ajuste menor, corrección de notas o delta de último momento antes o durante el push:
> - **NUNCA crear un commit adicional** tipo `fix: remove header` o `docs: fix notes`.
> - Integrar obligatoriamente la corrección en el commit de release mediante:
>   ```bash
>   git add <archivos_modificados>
>   git commit --amend --no-edit
>   git tag -d vX.Y.Z
>   git tag -a vX.Y.Z -m "Release vX.Y.Z: <título del release>"
>   ```
> - Si ya se hubiera empujado al remoto, sincronizar con:
>   ```bash
>   git push origin main --force-with-lease && git push origin vX.Y.Z --force
>   ```

---

## 9. Publicación Formal de GitHub Release (OBLIGATORIO)

> [!IMPORTANT]
> **UN GIT TAG NO ES UNA GITHUB RELEASE.**
> Para que el repositorio en GitHub muestre la nueva versión como **Latest Release** en su portada y barra lateral derecha, es obligatorio crear el objeto formal de Release en la plataforma inmediatamente después del push.

1. **Publicar la release mediante GitHub CLI (`gh`):**
   ```bash
   gh release create vX.Y.Z \
     --title "DOM vX.Y.Z — <Título Oficial del Release>" \
     --notes "<Extracto consolidado de docs/RELEASE_NOTES.md>"
   ```
2. **Validación post-publicación:**
   ```bash
   gh release list
   ```
   Debe confirmar que `vX.Y.Z` figura arriba de todo con el badge `Latest`.
