# Gestión de Base de Datos & Migraciones — DOM

Guía unificada de arquitectura y mantenimiento de la base de datos PostgreSQL de DOM (Supabase).

---

## 📂 Taxonomía de Directorios

```
supabase/
├── migrations/
│   ├── 00000000000000_schema_foundation.sql   ← FUENTE DE VERDAD: DDL completo consolidado
│   ├── delta/                                  ← Deltas incrementales e idempotentes para Cloud/Producción
│   │   ├── 20260908_consolidation_delta.sql
│   │   ├── 20260910_v0.2.0_release_delta.sql
│   │   ├── 20260911_purge_user_data_rpc.sql
│   │   ├── 20260911_sync_profiles_and_avatars_delta.sql
│   │   └── 20260915_performance_indexes.sql
│   └── archive/                                ← Archivo histórico de migraciones y snapshots previos
│       ├── releases/                           ← Snapshots legados de versiones iniciales
│       └── *.sql                               ← Migraciones históricas previas a la consolidación
├── snippets/                                   ← Scripts utilitarios y de mantenimiento puntual (no DDL)
│   ├── clear_seed_data.sql                     ← Limpieza de datos de prueba en desarrollo
│   └── README.md
├── functions/                                  ← Edge Functions en Deno (Deno.serve)
├── templates/                                  ← Plantillas HTML oficiales de correos y Auth
└── seed.sql                                    ← Datos semilla oficiales para desarrollo local
```

---

## 🧭 Criterio de Uso: ¿Qué archivo se usa en cada momento?

### 1. Desarrollo Local (Desde Cero)
```bash
supabase db reset
```
Aplica **únicamente** `migrations/00000000000000_schema_foundation.sql` seguido de `seed.sql`. Levanta una base de datos local íntegra, con todos los tipos, tablas, triggers y RLS en un solo paso determinista.

### 2. Producción / Supabase Cloud (Sin Pérdida de Datos)
En producción **no se resetea la base**. Para propagar cambios de esquema:
1. Se genera un archivo en `migrations/delta/YYYYMMDD_<nombre>.sql` con operaciones idempotentes (`IF NOT EXISTS`, `OR REPLACE`).
2. Se ejecuta manualmente desde el SQL Editor de Supabase Cloud.

### 3. Utilitarios y Diagnósticos
Los scripts de conveniencia (limpieza de datos demo, consultas de auditoría, scripts de soporte) residen en `supabase/snippets/`.
> ⚠️ **Regla de higiene:** Prohibido commitear archivos temporales del editor web (`Untitled query *.sql`).

### 4. Histórico y Auditoría
Cualquier migración superseded o snapshot anterior se preserva dentro de `supabase/migrations/archive/` como registro histórico inerte (no se ejecuta en ningún pipeline).

---

## 🛠️ Flujo para Modificaciones de Esquema

1. **Local:** Modificar la definición de la entidad directamente en `00000000000000_schema_foundation.sql`.
2. **Cloud:** Crear el delta idempotente correspondiente en `migrations/delta/YYYYMMDD_<nombre>.sql`.
3. **Validar:** Ejecutar `supabase db reset` para asegurar que el foundation compile sin errores.
4. **Auditar:** Ejecutar `supabase db advisors --local` para certificar la ausencia de alertas de seguridad o rendimiento.
