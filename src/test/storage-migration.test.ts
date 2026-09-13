import { describe, it, expect, beforeEach } from "vitest";
import {
  runStorageMigration,
  getMigratedStorageItem,
  STORAGE_MIGRATION_PAIRS,
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

    // Verificar que las nuevas claves DOM tienen los datos idénticos
    expect(JSON.parse(localStorage.getItem("dom-global-sync-queue")!)).toEqual([{ id: "op-1" }]);
    expect(JSON.parse(localStorage.getItem("dom-cache-accounts")!)).toEqual([{ id: "acc-1", name: "Banco Galicia" }]);
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
});
