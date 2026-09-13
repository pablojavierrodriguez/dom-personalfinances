---
name: supabase-integration
description: Usar esta skill siempre que se trabaje con Supabase — cliente JS, autenticación, políticas RLS, CLI, migraciones, o al alternar entre la instancia local (Docker) y el proyecto cloud de producción. También cuando el usuario mencione errores de conexión con Supabase, problemas de login del CLI, o el error "Resource has been removed".
---

# Supabase Integration — DOM

Convenciones y estándares para el proyecto, que utiliza un entorno local con Docker y un proyecto cloud de producción en Supabase.

## Si el MCP de Supabase o Postgres está conectado

Preferir las herramientas del MCP para consultar el schema real, policies existentes, o correr queries de diagnóstico contra el proyecto, en vez de asumir cómo está armada la base. Especialmente antes de generar un delta o un query complejo: primero confirmar el estado real vía MCP, después escribir el código.

---

## Local (Docker) vs Cloud

- **Desarrollo web**: `supabase start` levanta el stack local (Postgres, Auth, Storage, Studio) vía Docker.
- **Variables de entorno**: La app web lee URL y Anon Key (`.env.local` apunta al local, `.env.production` al cloud).
- **Supabase Studio local**: puerto `54423` (o según `supabase/config.toml`) → `http://localhost:54423`
- **API local**: puerto `54421` → usar siempre `http://127.0.0.1:54421` (nunca `localhost`) para evitar fallos de resolución de DNS en OAuth o en el SDK.
- **Capacitor / Mobile**: En el build nativo de Android el `.env` no se relee en runtime; coordinar con la configuración de Capacitor si se prueba contra entornos locales o cloud.

---

## CLI: Comandos frecuentes

```bash
supabase start              # levanta el entorno local (Docker)
supabase stop               # apaga el entorno local
supabase db reset           # reaplica migración base + seed sobre el entorno local
supabase link --project-ref <ref>   # vincula el proyecto local al cloud
supabase db push            # aplica migraciones locales al cloud
supabase db advisors --local  # auditoría de seguridad y rendimiento
```

---

## ⚡ Patrón de Consultas Resilientes (Desacopladas con Map)

Cuando se consultan tablas altamente relacionadas (ej: `transactions` con `categories` y `accounts`), los joins anidados profundos de PostgREST como `.select("id, categories(name, icon), accounts(name, currency)")` a veces resultan pesados o difíciles de normalizar en stores de Zustand / caches locales.

**Patrón recomendado para sincronización y dashboards**:
1. Hacer consultas directas y planas a las colecciones base (`transactions`, `accounts`, `categories`).
2. Indexar entidades en memoria usando un `Map<string, Entity>()` o lookup dictionaries en TypeScript.
3. Resolver nombres, íconos y relaciones en el frontend en tiempo constante $O(1)$.

Este patrón es ideal para el enfoque offline-first y reduce la complejidad de políticas RLS anidadas.

---

## 🔗 Sintaxis Canónica de Relaciones en PostgREST (Embeds)

Cuando se requieran joins directos vía Supabase JS:

### 1. Relación estándar vía Foreign Key
- **Sintaxis**: `tabla_destino(columna1, columna2)` o `alias:columna_fk(columna1, columna2)`
```ts
// ✅ Correcto (Relación 1 a 1 vía category_id):
.select("id, amount, date, category:category_id(id, name, color, icon)")

// ✅ Correcto (Relación 1 a N de ítems de una lista de compras):
.select("id, name, shopping_list_items(id, name, quantity, is_checked)")
```

### 2. Auto-relación (Jerarquías como Categorías Padre/Hijo)
- Cuando una tabla se referencia a sí misma (ej: `categories.parent_id`), especificar la foreign key para desambiguar:
```ts
// ✅ Correcto:
.select("id, name, parent_category:categories!categories_parent_id_fkey(name)")
```

### 3. ❌ Anti-patrones que causan error 400 (Bad Request)
- **NUNCA usar `alias:columna_fk(...)` sobre una tabla embebida secundaria:**
  ```ts
  // ❌ Prohibido: PostgREST busca una entidad errónea y rompe con error 400
  .select("id, items(id, category_id:categories(name))")
  ```

---

## Autenticación del CLI (macOS)

En macOS, el login interactivo del CLI puede fallar por permisos del Keychain (pide acceso repetidamente o falla en scripts/CI). Preferir autenticación por token:

```bash
export SUPABASE_ACCESS_TOKEN=<token_generado_en_app.supabase.com/account/tokens>
```

---

## Arquitectura de Migraciones en DOM

El proyecto utiliza una **estrategia de migración consolidada**:

```
supabase/
├── migrations/
│   ├── 00000000000000_schema_foundation.sql   ← FUENTE DE VERDAD: esquema completo consolidado
│   ├── delta/                                  ← Deltas para aplicar en Supabase Cloud (sin borrar datos)
│   │   └── YYYYMMDD_<nombre>.sql
│   └── archive/                                ← Histórico de migraciones anteriores (solo referencia)
├── releases/                                   ← Resúmenes por versión de producto
└── snippets/                                   ← Scripts utilitarios puntuales (no son migraciones)
```

### Política Estricta de Migraciones:
- **CERO MIGRACIONES PARCHE EN LOCAL**: Para cualquier cambio de esquema, se debe modificar directamente `supabase/migrations/00000000000000_schema_foundation.sql` (en la definición `CREATE TABLE` correspondiente o sección correspondiente) para garantizar que `supabase db reset` sea 100% limpio y determinista.
- **DELTAS IDEMPOTENTES PARA CLOUD**: Para aplicar cambios en bases de datos remotas en producción sin perder datos, se crea un delta fechado en `supabase/migrations/delta/YYYYMMDD_<nombre>.sql`.
- **PROHIBIDO GUARDAR DELTAS EN `supabase/snippets/`**: La única ubicación autorizada para deltas es `supabase/migrations/delta/`.

**Estructura de un Delta Idempotente:**
```sql
-- 1. Agregar columnas de forma segura
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ARS';

-- 2. Actualizar políticas de forma idempotente
DROP POLICY IF EXISTS "nombre_politica" ON public.tabla;
CREATE POLICY "nombre_politica" ON public.tabla ...;

-- 3. Recargar PostgREST
NOTIFY pgrst, 'reload schema';
```

---

## SECURITY INVOKER vs SECURITY DEFINER

### Regla 1 — Triggers: INVOKER por defecto, DEFINER con excepción
La mayoría de funciones asociadas a triggers corren con `SECURITY INVOKER`.

**Excepción obligatoria → usar `SECURITY DEFINER` si el trigger:**
- Sincroniza datos disparados por el sistema de autenticación de Supabase (como `handle_new_user` tras un insert en `auth.users`).

### Regla 2 — `SET search_path = public` es SIEMPRE obligatorio
Tanto en `SECURITY DEFINER` como en `SECURITY INVOKER`, sin excepción (previene ataques de inyección y silencia Linter 0011):

```sql
CREATE OR REPLACE FUNCTION public.mi_funcion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```

---

## Grants explícitos (DEFAULT PRIVILEGES)

Toda función o RPC nuevo debe tener permisos controlados explícitamente:

| Tipo de función | GRANT / REVOKE |
|---|---|
| Trigger interno (ej. `handle_new_user`) | `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated;` |
| RPC para usuarios autenticados | `GRANT EXECUTE ON FUNCTION ... TO authenticated;` |
| RPC público sin login | `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated;` |

---

## RLS — Checklist para tablas nuevas

1. `ALTER TABLE public.mi_tabla ENABLE ROW LEVEL SECURITY;` obligatorio en toda tabla nueva.
2. **Subconsultas para auth (Linter 0003)**: Usar siempre `(select auth.uid())`:
   ```sql
   CREATE POLICY "Users manage own records" ON public.mi_tabla
     FOR ALL
     USING ((select auth.uid()) = user_id)
     WITH CHECK ((select auth.uid()) = user_id);
   ```
3. **Linter 0006**: No crear múltiples políticas permisivas para la misma acción (`FOR SELECT`) sobre una tabla; unificar con `OR`.
4. Al modificar RLS: siempre `DROP POLICY IF EXISTS "nombre" ON public.tabla;` antes de recrear.

---

## Sincronización Automática `auth.users` $\rightarrow$ `public.profiles` (`handle_new_user`)

Todo usuario registrado vía `supabase.auth.signUp()` o proveedores OAuth (Google) debe inicializarse automáticamente:

1. **Trigger `on_auth_user_created`:**
   - La función `public.handle_new_user()` (`SECURITY DEFINER SET search_path = public`) se dispara en `AFTER INSERT ON auth.users`.
   - Crea automáticamente la fila en `public.profiles` e inicializa las categorías y cuentas por defecto.
2. **Integridad de Foreign Keys:**
   - Casi todas las tablas de negocio (`accounts`, `categories`, `transactions`, `budgets`) tienen `user_id REFERENCES auth.users(id) ON DELETE CASCADE`.

---

## Edge Functions & Deno (`supabase/functions/`)

1. **Uso de `Deno.serve(...)` nativo**: Prohibido importar `std/http/server.ts` antiguo.
2. **TypeScript & IDE**: Colocar `// @ts-ignore` en imports remotos `https://esm.sh/...` y `declare const Deno: any;` en la cabecera si el Language Server del IDE no reconoce los globales de Deno.

---

## Validación obligatoria antes de cerrar cualquier tarea

```bash
npm run check:all              # Validación general (Releases + Tipado TypeScript + Tests + Build)
supabase db advisors --local   # (Si Docker local está activo) Security & Performance Advisor
```
