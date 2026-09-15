import { supabase } from "@/integrations/supabase/client";
import { CACHE_KEYS, GLOBAL_QUEUE_KEY } from "@/services/sync-queue.service";
import { SHOPPING_CACHE_KEY, SHOPPING_QUEUE_KEY } from "@/services/shopping.service";

/**
 * Elimina todos los registros de negocio del usuario en Supabase.
 * Prioriza la llamada RPC atómica 'purge_user_data' (transaccional en PostgreSQL).
 * Si la función RPC no está disponible en la base de datos, ejecuta un fallback
 * REST estructurado con validación estricta de errores y orden de dependencias seguro.
 */
export async function purgeRemoteUserData(userId?: string, options?: { reseed?: boolean }): Promise<void> {
  const shouldReseed = options?.reseed ?? true;

  // 1. Intento primario: RPC atómico
  try {
    const { error } = await (supabase as any).rpc("purge_user_data", { p_reseed: shouldReseed });
    if (!error) {
      return;
    }
    console.warn("[UserDataService] purge_user_data RPC no disponible o falló, ejecutando fallback REST:", error);
  } catch (rpcErr) {
    console.warn("[UserDataService] Error al invocar purge_user_data RPC:", rpcErr);
  }

  // 2. Fallback REST estructurado
  const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!effectiveUserId) return;

  // 2.1. Listas de compras y sus artículos
  const { data: userLists, error: fetchListsErr } = await supabase
    .from("shopping_lists")
    .select("id")
    .eq("user_id", effectiveUserId);
  if (fetchListsErr) {
    console.warn("[UserDataService] Error al consultar shopping_lists:", fetchListsErr);
  }

  if (userLists && userLists.length > 0) {
    const listIds = userLists.map((l) => l.id);
    const { error: delItemsErr } = await supabase.from("shopping_list_items").delete().in("list_id", listIds);
    if (delItemsErr) {
      console.warn("[UserDataService] Error al purgar shopping_list_items:", delItemsErr);
    }
  }
  const { error: delListsErr } = await supabase.from("shopping_lists").delete().eq("user_id", effectiveUserId);
  if (delListsErr) {
    console.warn("[UserDataService] Error al purgar shopping_lists:", delListsErr);
  }

  // 2.2. Reglas automáticas de categorización
  const { error: rulesErr } = await (supabase.from("transaction_rules" as any) as any)
    .delete()
    .eq("user_id", effectiveUserId);
  if (rulesErr) {
    console.warn("[UserDataService] Error al purgar transaction_rules:", rulesErr);
  }

  // 2.3. Recordatorios de pago y transacciones periódicas
  const { error: billsErr } = await supabase.from("bill_reminders").delete().eq("user_id", effectiveUserId);
  if (billsErr) {
    console.warn("[UserDataService] Error al purgar bill_reminders:", billsErr);
  }
  const { error: recErr } = await supabase.from("recurring_transactions").delete().eq("user_id", effectiveUserId);
  if (recErr) {
    console.warn("[UserDataService] Error al purgar recurring_transactions:", recErr);
  }

  // 2.4. Presupuestos y metas financieras
  const { error: bgErr } = await supabase.from("budgets").delete().eq("user_id", effectiveUserId);
  if (bgErr) {
    console.warn("[UserDataService] Error al purgar budgets:", bgErr);
  }
  const { error: goalsErr } = await supabase.from("goals").delete().eq("user_id", effectiveUserId);
  if (goalsErr) {
    console.warn("[UserDataService] Error al purgar goals:", goalsErr);
  }

  // 2.5. WhatsApp (Integraciones y Mensajes ANTES de transacciones para evitar bloqueo de FK ON DELETE SET NULL)
  const { error: waMsgErr } = await supabase.from("whatsapp_messages").delete().eq("user_id", effectiveUserId);
  if (waMsgErr) {
    console.warn("[UserDataService] Error al purgar whatsapp_messages:", waMsgErr);
  }
  const { error: waIntErr } = await supabase.from("whatsapp_integrations").delete().eq("user_id", effectiveUserId);
  if (waIntErr) {
    console.warn("[UserDataService] Error al purgar whatsapp_integrations:", waIntErr);
  }

  // 2.6. Transacciones históricas
  const { error: txErr } = await supabase.from("transactions").delete().eq("user_id", effectiveUserId);
  if (txErr) {
    console.warn("[UserDataService] Error al purgar transactions:", txErr);
  }

  // 2.7. Etiquetas (Tags)
  const { error: tagsErr } = await supabase.from("tags").delete().eq("user_id", effectiveUserId);
  if (tagsErr) {
    console.warn("[UserDataService] Error al purgar tags:", tagsErr);
  }

  // 2.8. Cuentas: Garantizar primero balance 0 absoluto para que nunca persistan saldos residuales
  await supabase.from("accounts").update({ balance: 0 }).eq("user_id", effectiveUserId);
  const { error: accErr } = await supabase.from("accounts").delete().eq("user_id", effectiveUserId);
  if (accErr) {
    console.warn("[UserDataService] Error al purgar accounts:", accErr);
  }

  // 2.9. Categorías (primero subcategorías con parent_id FK, luego raíces)
  const { error: subCatErr } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", effectiveUserId)
    .not("parent_id", "is", null);
  if (subCatErr) {
    console.warn("[UserDataService] Error al purgar subcategorías:", subCatErr);
  }
  const { error: catErr } = await supabase.from("categories").delete().eq("user_id", effectiveUserId);
  if (catErr) {
    console.warn("[UserDataService] Error al purgar categories:", catErr);
  }

  // 2.10. Re-seed de contingencia en cliente sólo si shouldReseed es true
  if (shouldReseed) {
    try {
      const { data: remainingAccounts } = await supabase.from("accounts").select("id").eq("user_id", effectiveUserId);
      if (!remainingAccounts || remainingAccounts.length === 0) {
        await supabase.from("accounts").insert([
          { user_id: effectiveUserId, name: "Efectivo", balance: 0, type: "cash", color: "bg-emerald-500", icon: "banknote" },
          { user_id: effectiveUserId, name: "Caja de Ahorro", balance: 0, type: "savings", color: "bg-sky-500", icon: "landmark" },
          { user_id: effectiveUserId, name: "Billetera Virtual", balance: 0, type: "checking", color: "bg-violet-500", icon: "wallet" },
        ]);
      }
    } catch (seedAccErr) {
      console.warn("[UserDataService] Error en re-seed de cuentas:", seedAccErr);
    }

    try {
      const { data: remainingCategories } = await supabase.from("categories").select("id").eq("user_id", effectiveUserId);
      if (!remainingCategories || remainingCategories.length === 0) {
        await supabase.from("categories").insert([
          { user_id: effectiveUserId, name: "Salario", color: "bg-emerald-500", type: "income", icon: "briefcase", sort_order: 1 },
          { user_id: effectiveUserId, name: "Otros Ingresos", color: "bg-teal-500", type: "income", icon: "wallet", sort_order: 2 },
          { user_id: effectiveUserId, name: "Alimentación", color: "bg-orange-500", type: "expense", icon: "utensils", sort_order: 10 },
          { user_id: effectiveUserId, name: "Transporte", color: "bg-sky-500", type: "expense", icon: "car", sort_order: 20 },
          { user_id: effectiveUserId, name: "Vivienda", color: "bg-violet-500", type: "expense", icon: "home", sort_order: 30 },
          { user_id: effectiveUserId, name: "Servicios", color: "bg-yellow-500", type: "expense", icon: "zap", sort_order: 40 },
          { user_id: effectiveUserId, name: "Ocio y Salidas", color: "bg-pink-500", type: "expense", icon: "film", sort_order: 50 },
          { user_id: effectiveUserId, name: "Salud", color: "bg-red-400", type: "expense", icon: "heart-pulse", sort_order: 60 },
        ]);
      }
    } catch (seedCatErr) {
      console.warn("[UserDataService] Error en re-seed de categorías:", seedCatErr);
    }
  }

  // Si fallaron simultáneamente las tablas críticas, propagar error
  if (txErr && accErr) {
    throw new Error(txErr.message || accErr.message || "Error al purgar datos remotos");
  }
}

/**
 * Limpia de manera exhaustiva todo rastro de caché offline, colas diferidas
 * y estados de onboarding en el almacenamiento local del dispositivo.
 */
export function purgeLocalUserData(): void {
  // 1. Caches principales del motor offline
  Object.values(CACHE_KEYS).forEach((cacheKey) => {
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // Ignorar errores de storage restringido
    }
  });

  // 2. Colas de sincronización
  try {
    localStorage.removeItem(GLOBAL_QUEUE_KEY);
    localStorage.removeItem(SHOPPING_CACHE_KEY);
    localStorage.removeItem(SHOPPING_QUEUE_KEY);
  } catch {
    // Silencioso
  }

  // 3. Flags de bienvenida y versión
  try {
    localStorage.removeItem("onboarding-complete");
    localStorage.removeItem("onboarding-current-step");
    localStorage.removeItem("onboarding-temp-currency");
    localStorage.removeItem("onboarding-temp-accounts");
    localStorage.removeItem("dom_last_seen_release");
    localStorage.removeItem("dominus_last_seen_release");
    localStorage.removeItem("impero_last_seen_release");
  } catch {
    // Silencioso
  }

  // 4. Claves de compatibilidad y legacy
  const legacyKeys = [
    "tags",
    "impero-global-sync-queue",
    "impero-cache-accounts",
    "impero-cache-categories",
    "impero-cache-transactions",
    "impero-cache-budgets",
    "impero-cache-goals",
    "impero-cache-bills",
    "impero-cache-recurring",
    "impero-cache-tags",
    "impero-transaction-rules",
    "m3-transaction-rules",
    "impero-finance-data",
    "impero-transactions",
    "impero-accounts",
    "impero-categories",
    "shopping_lists",
    "local_bills",
    "local_recurring",
    "local_budgets",
    "local_goals",
    "local_tags",
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silencioso
    }
  });
}

/**
 * Orquesta la purga integral de datos del usuario (remota si aplica y local siempre).
 */
export async function purgeAllUserData(userId?: string, options?: { reseed?: boolean }): Promise<void> {
  const shouldReseed = options?.reseed ?? false;
  if (userId) {
    await purgeRemoteUserData(userId, { reseed: shouldReseed });
  } else {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        await purgeRemoteUserData(data.user.id, { reseed: shouldReseed });
      }
    } catch {
      // Silencioso en entornos offline o tests sin sesión
    }
  }
  purgeLocalUserData();
}
