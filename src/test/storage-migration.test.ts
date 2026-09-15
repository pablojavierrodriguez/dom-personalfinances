import { describe, it, expect, beforeEach } from "vitest";
import {
  runStorageMigration,
  getMigratedStorageItem,
  STORAGE_MIGRATION_PAIRS,
  repairNonUuidEntities,
  isValidUuid,
} from "../lib/storage-migration";

describe("DOM Storage Migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates legacy impero and m3 keys to dom without data loss", () => {
    // Simular estado previo del usuario
    localStorage.setItem("impero-global-sync-queue", JSON.stringify([{ id: "op-1" }]));
    localStorage.setItem("impero-cache-accounts", JSON.stringify([{ id: "acc-1", name: "Banco Galicia" }]));
    localStorage.setItem("impero-transaction-rules", JSON.stringify([{ id: "rule-1" }]));
    localStorage.setItem("impero-privacy-mode", "true");
    localStorage.setItem("impero_last_seen_release", "0.3.1");

    const result = runStorageMigration();

    expect(result.migratedCount).toBeGreaterThanOrEqual(5);
    expect(result.errorCount).toBe(0);

    // Verificar que las nuevas claves DOM tienen los datos migrados y auto-reparados a UUID
    expect(JSON.parse(localStorage.getItem("dom-global-sync-queue")!)).toEqual([{ id: "op-1" }]);
    const migratedAccounts = JSON.parse(localStorage.getItem("dom-cache-accounts")!);
    expect(migratedAccounts[0].name).toBe("Banco Galicia");
    expect(isValidUuid(migratedAccounts[0].id)).toBe(true);
    expect(JSON.parse(localStorage.getItem("dom-transaction-rules")!)).toEqual([{ id: "rule-1" }]);
    expect(localStorage.getItem("dom-privacy-mode")).toBe("true");
    expect(localStorage.getItem("dom_last_seen_release")).toBe("0.3.1");
  });

  it("does not overwrite modern keys if they already exist", () => {
    localStorage.setItem("impero-privacy-mode", "false");
    localStorage.setItem("dom-privacy-mode", "true");

    const result = runStorageMigration();

    expect(localStorage.getItem("dom-privacy-mode")).toBe("true");
  });

  it("getMigratedStorageItem fallback works and copies value on read", () => {
    localStorage.setItem("impero-biometric-credential-id", "cred-12345");

    const value = getMigratedStorageItem("dom-biometric-credential-id", [
      "impero-biometric-credential-id",
    ]);

    expect(value).toBe("cred-12345");
    // Se debe haber copiado a la clave nueva
    expect(localStorage.getItem("dom-biometric-credential-id")).toBe("cred-12345");
  });

  it("stress test: flawlessly migrates all legacy keys with complex nested payloads", () => {
    const uniqueTargetKeys = new Set(STORAGE_MIGRATION_PAIRS.map((p) => p.newKey));

    // Poblar todas las claves legadas registradas
    STORAGE_MIGRATION_PAIRS.forEach(({ legacyKey }, idx) => {
      const complexPayload = JSON.stringify({
        id: `id-${idx}`,
        key: legacyKey,
        nested: { count: idx * 100, active: true },
        tags: ["finance", "dom", "test"],
      });
      localStorage.setItem(legacyKey, complexPayload);
    });

    const result = runStorageMigration();

    expect(result.errorCount).toBe(0);
    // Cada clave destino única debe haber recibido su migración
    expect(result.migratedCount).toBe(uniqueTargetKeys.size);

    // Validar que cada clave destino nueva posee el payload íntegro sin corrupción
    uniqueTargetKeys.forEach((newKey) => {
      const modernVal = localStorage.getItem(newKey);
      expect(modernVal).not.toBeNull();
      const parsed = JSON.parse(modernVal!);
      expect(parsed.tags).toEqual(["finance", "dom", "test"]);
      expect(parsed.nested.active).toBe(true);
    });

    // Validar que las claves legadas siguen intactas en el almacenamiento local
    STORAGE_MIGRATION_PAIRS.forEach(({ legacyKey }) => {
      expect(localStorage.getItem(legacyKey)).not.toBeNull();
    });
  });

  it("repairs non-UUID entities (e.g. card-*) in accounts, transactions and sync queue deterministically", () => {
    const corruptCardId = "card-1789410688204";
    const corruptTxId = "tx-1789410688300";

    // Simular cuentas con ID corrupto
    localStorage.setItem(
      "dom-cache-accounts",
      JSON.stringify([
        { id: corruptCardId, name: "Visa Signature", balance: -50000, type: "credit" },
        { id: "550e8400-e29b-41d4-a716-446655440000", name: "Santander Rio", balance: 100000, type: "checking" },
      ])
    );

    // Simular transacciones asociadas a la cuenta corrupta
    localStorage.setItem(
      "dom-cache-transactions",
      JSON.stringify([
        {
          id: corruptTxId,
          accountId: corruptCardId,
          amount: 25000,
          description: "Supermercado Coto",
        },
        {
          id: "76c9eac1-e68f-4872-82c3-f064147991f9",
          accountId: corruptCardId,
          amount: 15000,
          description: "Combustible Shell",
        },
      ])
    );

    // Simular operaciones en la cola de sync global atascadas por error 22P02
    localStorage.setItem(
      "dom-global-sync-queue",
      JSON.stringify([
        {
          type: "insert_account",
          payload: { id: corruptCardId, name: "Visa Signature", balance: -50000, type: "credit" },
        },
        {
          type: "update_account_balance",
          id: corruptCardId,
          balance: -40000,
        },
        {
          type: "insert_transaction",
          payload: {
            id: corruptTxId,
            accountId: corruptCardId,
            amount: 25000,
            description: "Supermercado Coto",
          },
        },
        {
          type: "update_transaction",
          id: "76c9eac1-e68f-4872-82c3-f064147991f9",
          payload: {
            accountId: corruptCardId,
            amount: 16000,
          },
        },
      ])
    );

    const repairStats = repairNonUuidEntities();

    expect(repairStats.repairedAccounts).toBe(1);
    expect(repairStats.repairedTxs).toBe(2);
    expect(repairStats.repairedOps).toBe(4);

    // Verificar que las cuentas ahora tienen UUIDs válidos
    const repairedAccounts = JSON.parse(localStorage.getItem("dom-cache-accounts")!);
    expect(repairedAccounts).toHaveLength(2);
    const newCardId = repairedAccounts[0].id;
    expect(isValidUuid(newCardId)).toBe(true);
    expect(newCardId).not.toBe(corruptCardId);
    expect(repairedAccounts[1].id).toBe("550e8400-e29b-41d4-a716-446655440000");

    // Verificar que las transacciones mapearon la cuenta al nuevo UUID
    const repairedTxs = JSON.parse(localStorage.getItem("dom-cache-transactions")!);
    expect(repairedTxs).toHaveLength(2);
    expect(repairedTxs[0].accountId).toBe(newCardId);
    expect(isValidUuid(repairedTxs[0].id)).toBe(true);
    expect(repairedTxs[1].accountId).toBe(newCardId);
    expect(repairedTxs[1].id).toBe("76c9eac1-e68f-4872-82c3-f064147991f9");

    // Verificar que la cola de sync global tiene todos los IDs mapeados correctamente
    const repairedQueue = JSON.parse(localStorage.getItem("dom-global-sync-queue")!);
    expect(repairedQueue).toHaveLength(4);

    // 1. insert_account
    expect(repairedQueue[0].type).toBe("insert_account");
    expect(repairedQueue[0].payload.id).toBe(newCardId);

    // 2. update_account_balance
    expect(repairedQueue[1].type).toBe("update_account_balance");
    expect(repairedQueue[1].id).toBe(newCardId);

    // 3. insert_transaction
    expect(repairedQueue[2].type).toBe("insert_transaction");
    expect(repairedQueue[2].payload.accountId).toBe(newCardId);
    expect(isValidUuid(repairedQueue[2].payload.id)).toBe(true);

    // 4. update_transaction
    expect(repairedQueue[3].type).toBe("update_transaction");
    expect(repairedQueue[3].payload.accountId).toBe(newCardId);
  });
});
