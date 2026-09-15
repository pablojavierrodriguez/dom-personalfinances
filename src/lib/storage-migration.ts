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
  { legacyKey: "dominus-onboarding-complete",   newKey: "dom-onboarding-complete" },
  { legacyKey: "onboarding-complete",           newKey: "dom-onboarding-complete" },
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

  const repairResult = repairNonUuidEntities();
  if (repairResult.repairedAccounts > 0 || repairResult.repairedTxs > 0 || repairResult.repairedOps > 0) {
    console.info("[DOM Storage] Auto-reparación de entidades no-UUID completada:", repairResult);
  }

  return { migratedCount, errorCount };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  return typeof id === "string" && UUID_REGEX.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Escanea y auto-repara cuentas, transacciones y colas de sincronización
 * que contengan IDs no-UUID (como card-*, acc-*, o timestamps numéricos).
 * Mapea deterministamente cada ID obsoleto a un UUID v4 legítimo para
 * evitar rechazos de sintaxis de tipo UUID ('22P02') en Supabase/PostgreSQL.
 */
export function repairNonUuidEntities(): { repairedAccounts: number; repairedTxs: number; repairedOps: number } {
  if (typeof window === "undefined" || !window.localStorage) {
    return { repairedAccounts: 0, repairedTxs: 0, repairedOps: 0 };
  }

  let repairedAccounts = 0;
  let repairedTxs = 0;
  let repairedOps = 0;

  const idMap = new Map<string, string>();

  // 1. Escanear cachés de cuentas
  const accountKeys = ["dom-cache-accounts", "dom-accounts", "dominus-cache-accounts", "impero-cache-accounts"];
  for (const accKey of accountKeys) {
    try {
      const raw = localStorage.getItem(accKey);
      if (!raw) continue;
      const accounts = JSON.parse(raw);
      if (!Array.isArray(accounts)) continue;

      let changed = false;
      const updatedAccounts = accounts.map((acc: any) => {
        if (acc && acc.id && !isValidUuid(acc.id)) {
          if (!idMap.has(acc.id)) {
            idMap.set(acc.id, generateUUID());
          }
          const newId = idMap.get(acc.id)!;
          changed = true;
          repairedAccounts++;
          return { ...acc, id: newId };
        }
        return acc;
      });

      if (changed) {
        localStorage.setItem(accKey, JSON.stringify(updatedAccounts));
      }
    } catch (e) {
      console.warn(`[repairNonUuidEntities] Error reparando cuentas en ${accKey}:`, e);
    }
  }

  // 2. Escanear la cola de sincronización global
  const queueKeys = ["dom-global-sync-queue", "dominus-global-sync-queue", "impero-global-sync-queue"];
  for (const qKey of queueKeys) {
    try {
      const raw = localStorage.getItem(qKey);
      if (!raw) continue;
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue)) continue;

      let changed = false;
      const updatedQueue = queue.map((op: any) => {
        if (!op) return op;

        // Inserción de cuenta con id corrupto
        if (op.type === "insert_account" && op.payload) {
          const oldId = op.payload.id;
          if (oldId && !isValidUuid(oldId)) {
            if (!idMap.has(oldId)) {
              idMap.set(oldId, generateUUID());
            }
            const newId = idMap.get(oldId)!;
            changed = true;
            repairedOps++;
            return {
              ...op,
              payload: { ...op.payload, id: newId },
            };
          }
        }

        // Actualización de cuenta o balance con id corrupto
        if ((op.type === "update_account_balance" || op.type === "update_account" || op.type === "delete_account") && op.id) {
          if (idMap.has(op.id) || !isValidUuid(op.id)) {
            if (!idMap.has(op.id)) {
              idMap.set(op.id, generateUUID());
            }
            const newId = idMap.get(op.id)!;
            changed = true;
            repairedOps++;
            return { ...op, id: newId };
          }
        }

        // Transacciones asociadas a cuenta corrupta
        if ((op.type === "insert_transaction" || op.type === "update_transaction") && op.payload) {
          let txModified = false;
          let newPayload = { ...op.payload };

          const oldAccId = op.payload.accountId;
          if (oldAccId && (idMap.has(oldAccId) || !isValidUuid(oldAccId))) {
            if (!idMap.has(oldAccId)) {
              idMap.set(oldAccId, generateUUID());
            }
            newPayload.accountId = idMap.get(oldAccId)!;
            txModified = true;
          }

          if (op.type === "insert_transaction" && op.payload.id && !isValidUuid(op.payload.id)) {
            newPayload.id = generateUUID();
            txModified = true;
          }

          if (txModified) {
            changed = true;
            repairedOps++;
            return {
              ...op,
              payload: newPayload,
            };
          }
        }

        return op;
      });

      if (changed) {
        localStorage.setItem(qKey, JSON.stringify(updatedQueue));
      }
    } catch (e) {
      console.warn(`[repairNonUuidEntities] Error reparando cola de sync en ${qKey}:`, e);
    }
  }

  // 3. Escanear cachés de transacciones
  const txKeys = ["dom-cache-transactions", "dom-transactions", "dominus-cache-transactions", "impero-cache-transactions"];
  for (const txKey of txKeys) {
    try {
      const raw = localStorage.getItem(txKey);
      if (!raw) continue;
      const txs = JSON.parse(raw);
      if (!Array.isArray(txs)) continue;

      let changed = false;
      const updatedTxs = txs.map((tx: any) => {
        if (!tx) return tx;
        let modified = false;
        let newTx = { ...tx };

        if (tx.accountId && (idMap.has(tx.accountId) || !isValidUuid(tx.accountId))) {
          if (!idMap.has(tx.accountId)) {
            idMap.set(tx.accountId, generateUUID());
          }
          newTx.accountId = idMap.get(tx.accountId)!;
          modified = true;
        }

        if (tx.id && !isValidUuid(tx.id)) {
          newTx.id = generateUUID();
          modified = true;
        }

        if (modified) {
          changed = true;
          repairedTxs++;
          return newTx;
        }
        return tx;
      });

      if (changed) {
        localStorage.setItem(txKey, JSON.stringify(updatedTxs));
      }
    } catch (e) {
      console.warn(`[repairNonUuidEntities] Error reparando transacciones en ${txKey}:`, e);
    }
  }

  return { repairedAccounts, repairedTxs, repairedOps };
}
