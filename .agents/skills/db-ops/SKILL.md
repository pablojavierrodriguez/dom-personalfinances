---
name: db-ops
description: Operaciones locales de base de datos para DOM. Usar para aplicar migraciones, reiniciar base de datos local, ejecutar seed data y correr validaciones obligatorias de seguridad y performance (db advisors).
---

# DB Ops — Herramientas y Flujo de Base de Datos Local

Guía operativa y scripts de base de datos local (Docker) para `DOM`.

## Variables y Conexión Local

- **Host:** `127.0.0.1`
- **DB Port:** `54422` (definido en `supabase/config.toml`)
- **API Port:** `54421`
- **Studio Port:** `54423`
- **Cadena de conexión:** `postgresql://postgres:postgres@127.0.0.1:54422/postgres`

---

## Estructura de Archivos de DB

```
supabase/
├── migrations/
│   ├── 00000000000000_schema_foundation.sql   ← FUENTE DE VERDAD: esquema completo consolidado
│   ├── delta/                                  ← Deltas para aplicar en cloud (sin borrar datos)
│   │   └── YYYYMMDD_<nombre>.sql
│   └── archive/                                ← Histórico de migraciones anteriores (solo referencia)
├── releases/                                   ← Resúmenes por versión de producto
└── snippets/                                   ← Queries ad-hoc de Studio (no son migraciones)
```

---

## Flujo Obligatorio para Cambios de Esquema

> [!IMPORTANT]
> **Ante cualquier cambio de DB (nueva tabla, columna, índice, política RLS):**

### Paso 1 — Modificar la migración base

Editar `supabase/migrations/00000000000000_schema_foundation.sql`:
- Agregar la nueva columna **directamente en la definición `CREATE TABLE`** (no como `ALTER TABLE` al final).
- Para nuevas tablas, agregarlas en la sección correspondiente del archivo.
- Mantener `IF NOT EXISTS` / `OR REPLACE` en todo para idempotencia.

### Paso 2 — Crear el delta para cloud

Crear `supabase/migrations/delta/YYYYMMDD_<nombre>.sql` con:
- Solo los `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` o `CREATE TABLE IF NOT EXISTS` necesarios.
- El delta debe ser idempotente (se puede ejecutar múltiples veces sin error).
- No incluir `DROP` de datos existentes.

### Paso 3 — Validar localmente

```bash
supabase db reset
```

Esto aplica `00000000000000_schema_foundation.sql` desde cero. Debe completarse sin errores.

### Paso 4 — Auditoría obligatoria (antes de cerrar tarea)

```bash
supabase db advisors --local
```

### Paso 5 — Aplicar en cloud

Ejecutar el delta en Supabase Studio (SQL Editor) o via psql:
```bash
psql postgresql://postgres:<password>@<host>:5432/postgres -f supabase/migrations/delta/YYYYMMDD_<nombre>.sql
```

---

## Comandos Operativos

### Iniciar o verificar entorno local
```bash
supabase start
```

### Reiniciar base de datos local y correr seed
```bash
supabase db reset
```

### Crear nueva migración incremental (legacy — NO usar, seguir flujo de arriba)
```bash
supabase migration new <nombre_migracion>
```

---

## Inspección con MCP Postgres

Cuando el servidor MCP `postgres-local` esté activo, preferir ejecutar consultas directas de solo lectura (schemas, columnas, políticas RLS) para confirmar el estado real antes de escribir código TypeScript o migraciones SQL.
