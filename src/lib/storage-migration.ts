/**
 * DOM Storage Migration Utility
 * 
 * Garantiza retrocompatibilidad total y migración transparente de claves locales
 * desde las marcas previas (IMPERO y m3) hacia la nueva identidad DOM.
 */

export interface StorageMigrationPair {
  legacyKey: string;
  newKey: string;
}

export const STORAGE_MIGRATION_PAIRS: StorageMigrationPair[] = [
  // ── Capa 1: impero/m3 → dominus (legado histórico) ──────────────────────────
  // Colas y sincronización
  { legacyKey: "impero-global-sync-queue",       newKey: "dom-global-sync-queue" },

  // Cachés de entidades
  { legacyKey: "impero-cache-accounts",          newKey: "dom-cache-accounts" },
  { legacyKey: "impero-cache-categories",        newKey: "dom-cache-categories" },
  { legacyKey: "impero-cache-transactions",      newKey: "dom-cache-transactions" },
  { legacyKey: "impero-cache-budgets",           newKey: "dom-cache-budgets" },
  { legacyKey: "impero-cache-goals",             newKey: "dom-cache-goals" },
  { legacyKey: "impero-cache-bills",             newKey: "dom-cache-bills" },
  { legacyKey: "impero-cache-recurring",         newKey: "dom-cache-recurring" },
  { legacyKey: "impero-cache-tags",              newKey: "dom-cache-tags" },

  // Reglas de conciliación (soporte para impero y m3 heredado)
  { legacyKey: "impero-transaction-rules",       newKey: "dom-transaction-rules" },
  { legacyKey: "m3-transaction-rules",           newKey: "dom-transaction-rules" },

  // Biometría y privacidad
  { legacyKey: "impero-biometric-credential-id", newKey: "dom-biometric-credential-id" },
  { legacyKey: "impero-biometric-enabled",       newKey: "dom-biometric-enabled" },
  { legacyKey: "impero-biometric-timeout",       newKey: "dom-biometric-timeout" },
  { legacyKey: "impero-privacy-mode",            newKey: "dom-privacy-mode" },
  { legacyKey: "m3-privacy-mode",               newKey: "dom-privacy-mode" },

  // Release notes y control de versiones
  { legacyKey: "impero_last_seen_release",       newKey: "dom_last_seen_release" },

  // Cachés históricas
  { legacyKey: "impero-finance-data",            newKey: "dom-finance-data" },
  { legacyKey: "impero-transactions",            newKey: "dom-transactions" },
  { legacyKey: "impero-accounts",               newKey: "dom-accounts" },
  { legacyKey: "impero-categories",             newKey: "dom-categories" },

  // ── Capa 2: dominus → dom (rebrand v3.0 DOM) ────────────────────────────────
  { legacyKey: "dominus-global-sync-queue",      newKey: "dom-global-sync-queue" },
  { legacyKey: "dominus-shopping-lists-cache",   newKey: "dom-shopping-lists-cache" },
  { legacyKey: "dominus-shopping-sync-queue",    newKey: "dom-shopping-sync-queue" },
  { legacyKey: "dominus-cache-accounts",         newKey: "dom-cache-accounts" },
  { legacyKey: "dominus-cache-categories",       newKey: "dom-cache-categories" },
  { legacyKey: "dominus-cache-transactions",     newKey: "dom-cache-transactions" },
  { legacyKey: "dominus-cache-budgets",          newKey: "dom-cache-budgets" },
  { legacyKey: "dominus-cache-goals",            newKey: "dom-cache-goals" },
  { legacyKey: "dominus-cache-bills",            newKey: "dom-cache-bills" },
  { legacyKey: "dominus-cache-recurring",        newKey: "dom-cache-recurring" },
  { legacyKey: "dominus-cache-tags",             newKey: "dom-cache-tags" },
  { legacyKey: "dominus-transaction-rules",      newKey: "dom-transaction-rules" },
  { legacyKey: "dominus-biometric-credential-id", newKey: "dom-biometric-credential-id" },
  { legacyKey: "dominus-biometric-enabled",      newKey: "dom-biometric-enabled" },
  { legacyKey: "dominus-biometric-timeout",      newKey: "dom-biometric-timeout" },
  { legacyKey: "dominus-privacy-mode",           newKey: "dom-privacy-mode" },
  { legacyKey: "dominus_last_seen_release",      newKey: "dom_last_seen_release" },
  { legacyKey: "dominus-finance-data",           newKey: "dom-finance-data" },
  { legacyKey: "dominus-transactions",           newKey: "dom-transactions" },
  { legacyKey: "dominus-accounts",              newKey: "dom-accounts" },
  { legacyKey: "dominus-categories",            newKey: "dom-categories" },
];

/**
 * Obtiene un valor de localStorage buscando primero la clave moderna (DOM)
 * y cayendo en retrocompatibilidad con las claves legadas si la moderna aún no existe.
 */
export function getMigratedStorageItem(primaryKey: string, legacyKeys: string[] = []): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const modernVal = localStorage.getItem(primaryKey);
    if (modernVal !== null) {
      return modernVal;
    }

    for (const legacyKey of legacyKeys) {
      const legacyVal = localStorage.getItem(legacyKey);
      if (legacyVal !== null) {
        // Migración silenciosa inmediata al primer acceso
        try {
          localStorage.setItem(primaryKey, legacyVal);
        } catch {
          // Ignorar error de cuota si ocurre
        }
        return legacyVal;
      }
    }

    return null;
  } catch (err) {
    console.warn(`[DOM Storage] Error leyendo clave ${primaryKey}:`, err);
    return null;
  }
}

/**
 * Ejecuta la migración silenciosa e idempotente de todas las claves legadas a DOM.
 * No sobrescribe valores ya existentes en las claves nuevas.
 */
export function runStorageMigration(): { migratedCount: number; errorCount: number } {
  if (typeof window === "undefined" || !window.localStorage) {
    return { migratedCount: 0, errorCount: 0 };
  }

  let migratedCount = 0;
  let errorCount = 0;

  for (const { legacyKey, newKey } of STORAGE_MIGRATION_PAIRS) {
    try {
      const legacyVal = localStorage.getItem(legacyKey);
      if (legacyVal !== null) {
        const modernVal = localStorage.getItem(newKey);
        // Solo migrar si la clave moderna no tiene valor aún
        if (modernVal === null) {
          localStorage.setItem(newKey, legacyVal);
          migratedCount++;
        }
      }
    } catch (err) {
      errorCount++;
      console.warn(`[DOM Storage] Error al migrar ${legacyKey} -> ${newKey}:`, err);
    }
  }

  return { migratedCount, errorCount };
}
