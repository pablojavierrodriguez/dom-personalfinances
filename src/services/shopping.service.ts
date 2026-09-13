import { supabase } from "@/integrations/supabase/client";
import { ShoppingList, ShoppingListItem, ShoppingListStatus } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";

type ShoppingListRow = Database["public"]["Tables"]["shopping_lists"]["Row"];
type ShoppingListItemRow = Database["public"]["Tables"]["shopping_list_items"]["Row"];

export const SHOPPING_CACHE_KEY = "dominus-shopping-lists-cache";
export const LEGACY_SHOPPING_CACHE_KEY = "impero-shopping-lists-cache";
export const SHOPPING_QUEUE_KEY = "dominus-shopping-sync-queue";
export const LEGACY_SHOPPING_QUEUE_KEY = "impero-shopping-sync-queue";

export type ShoppingSyncOperation =
  | {
      type: "create_list";
      payload: {
        id: string;
        name: string;
        targetAccountId?: string | null;
        targetCategoryId?: string | null;
      };
    }
  | {
      type: "update_list";
      id: string;
      payload: Partial<{
        name: string;
        status: ShoppingListStatus;
        targetAccountId: string | null;
        targetCategoryId: string | null;
      }>;
    }
  | { type: "delete_list"; id: string }
  | { type: "create_item"; payload: ShoppingListItem }
  | {
      type: "update_item";
      id: string;
      payload: Partial<{
        name: string;
        quantity: number;
        unitPrice: number;
        isChecked: boolean;
        sortOrder: number;
      }>;
    }
  | { type: "delete_item"; id: string };

function generateClientUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getStoredShoppingLists(): ShoppingList[] {
  try {
    const raw = localStorage.getItem(SHOPPING_CACHE_KEY) ?? localStorage.getItem(LEGACY_SHOPPING_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((l: any) => ({
          ...l,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }))
      : [];
  } catch {
    return [];
  }
}

export function saveStoredShoppingLists(lists: ShoppingList[]): void {
  try {
    localStorage.setItem(SHOPPING_CACHE_KEY, JSON.stringify(lists));
  } catch (err) {
    console.warn("Error saving shopping lists to localStorage:", err);
  }
}

export function getPendingShoppingSyncCount(): number {
  try {
    const raw = localStorage.getItem(SHOPPING_QUEUE_KEY) ?? localStorage.getItem(LEGACY_SHOPPING_QUEUE_KEY);
    if (!raw) return 0;
    const queue = JSON.parse(raw);
    return Array.isArray(queue) ? queue.length : 0;
  } catch {
    return 0;
  }
}

function getSyncQueue(): ShoppingSyncOperation[] {
  try {
    const raw = localStorage.getItem(SHOPPING_QUEUE_KEY) ?? localStorage.getItem(LEGACY_SHOPPING_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSyncQueue(queue: ShoppingSyncOperation[]): void {
  try {
    localStorage.setItem(SHOPPING_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("Error saving shopping sync queue to localStorage:", err);
  }
}

function enqueueSyncOp(op: ShoppingSyncOperation): void {
  const queue = getSyncQueue();
  queue.push(op);
  saveSyncQueue(queue);
}

export async function syncPendingShoppingQueue(): Promise<void> {
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const remaining: ShoppingSyncOperation[] = [];

  for (const op of queue) {
    try {
      if (op.type === "create_list") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("shopping_lists").upsert({
            id: op.payload.id,
            user_id: user.id,
            name: op.payload.name.trim(),
            status: "active",
            target_account_id: op.payload.targetAccountId || null,
            target_category_id: op.payload.targetCategoryId || null,
          });
        }
      } else if (op.type === "update_list") {
        const payload: Partial<Database["public"]["Tables"]["shopping_lists"]["Update"]> = {};
        if (op.payload.name !== undefined) payload.name = op.payload.name;
        if (op.payload.status !== undefined) payload.status = op.payload.status;
        if (op.payload.targetAccountId !== undefined) payload.target_account_id = op.payload.targetAccountId;
        if (op.payload.targetCategoryId !== undefined) payload.target_category_id = op.payload.targetCategoryId;
        await supabase.from("shopping_lists").update(payload).eq("id", op.id);
      } else if (op.type === "delete_list") {
        await supabase.from("shopping_lists").delete().eq("id", op.id);
      } else if (op.type === "create_item") {
        await supabase.from("shopping_list_items").upsert({
          id: op.payload.id,
          list_id: op.payload.listId,
          name: op.payload.name.trim(),
          quantity: op.payload.quantity,
          unit_price: op.payload.unitPrice,
          is_checked: op.payload.isChecked,
          sort_order: op.payload.sortOrder,
        });
      } else if (op.type === "update_item") {
        const payload: Partial<Database["public"]["Tables"]["shopping_list_items"]["Update"]> = {};
        if (op.payload.name !== undefined) payload.name = op.payload.name;
        if (op.payload.quantity !== undefined) payload.quantity = op.payload.quantity;
        if (op.payload.unitPrice !== undefined) payload.unit_price = op.payload.unitPrice;
        if (op.payload.isChecked !== undefined) payload.is_checked = op.payload.isChecked;
        if (op.payload.sortOrder !== undefined) payload.sort_order = op.payload.sortOrder;
        await supabase.from("shopping_list_items").update(payload).eq("id", op.id);
      } else if (op.type === "delete_item") {
        await supabase.from("shopping_list_items").delete().eq("id", op.id);
      }
    } catch (err) {
      console.warn("Failed to sync queue operation, preserving for next retry:", op, err);
      remaining.push(op);
    }
  }

  saveSyncQueue(remaining);
}

export async function fetchShoppingLists(): Promise<ShoppingList[]> {
  try {
    // Sincronizar operaciones pendientes si estamos conectados
    await syncPendingShoppingQueue();

    const { data: listsData, error: listsError } = await supabase
      .from("shopping_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (listsError) throw listsError;
    if (!listsData || listsData.length === 0) {
      saveStoredShoppingLists([]);
      return [];
    }

    const listIds = listsData.map((l) => l.id);

    const { data: itemsData, error: itemsError } = await supabase
      .from("shopping_list_items")
      .select("*")
      .in("list_id", listIds)
      .order("sort_order", { ascending: true });

    if (itemsError) throw itemsError;

    const itemsByList = new Map<string, ShoppingListItem[]>();
    for (const item of itemsData || []) {
      const mappedItem: ShoppingListItem = {
        id: item.id,
        listId: item.list_id,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unit_price) || 0,
        isChecked: item.is_checked,
        sortOrder: item.sort_order,
      };
      const current = itemsByList.get(item.list_id) || [];
      current.push(mappedItem);
      itemsByList.set(item.list_id, current);
    }

    const formattedLists: ShoppingList[] = listsData.map((l: ShoppingListRow): ShoppingList => ({
      id: l.id,
      name: l.name,
      status: (l.status as ShoppingListStatus) || "active",
      targetAccountId: l.target_account_id,
      targetCategoryId: l.target_category_id,
      items: itemsByList.get(l.id) || [],
      createdAt: new Date(l.created_at),
      updatedAt: new Date(l.updated_at),
    }));

    saveStoredShoppingLists(formattedLists);
    return formattedLists;
  } catch (err) {
    console.warn("Supabase fetchShoppingLists failed, using local cache fallback:", err);
    return getStoredShoppingLists();
  }
}

export async function createShoppingList(
  name: string,
  targetAccountId?: string | null,
  targetCategoryId?: string | null
): Promise<ShoppingList> {
  const localId = generateClientUUID();
  const localList: ShoppingList = {
    id: localId,
    name: name.trim(),
    status: "active",
    targetAccountId: targetAccountId || null,
    targetCategoryId: targetCategoryId || null,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Actualización optimista de la caché local
  const currentCached = getStoredShoppingLists();
  saveStoredShoppingLists([localList, ...currentCached]);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const insertPayload: Database["public"]["Tables"]["shopping_lists"]["Insert"] = {
      user_id: user.id,
      name: name.trim(),
      status: "active",
      target_account_id: targetAccountId || null,
      target_category_id: targetCategoryId || null,
    };

    const { data, error } = await supabase
      .from("shopping_lists")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    const remoteList: ShoppingList = {
      id: data.id,
      name: data.name,
      status: data.status as ShoppingListStatus,
      targetAccountId: data.target_account_id,
      targetCategoryId: data.target_category_id,
      items: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    // Actualizar con datos remotos confirmados
    const updated = getStoredShoppingLists().map((l) => (l.id === localId ? remoteList : l));
    saveStoredShoppingLists(updated);
    return remoteList;
  } catch (err) {
    console.warn("createShoppingList failed remotely, queued for sync:", err);
    enqueueSyncOp({
      type: "create_list",
      payload: {
        id: localId,
        name: name.trim(),
        targetAccountId,
        targetCategoryId,
      },
    });
    return localList;
  }
}

export async function updateShoppingListRemote(
  id: string,
  updates: Partial<{
    name: string;
    status: ShoppingListStatus;
    targetAccountId: string | null;
    targetCategoryId: string | null;
  }>
): Promise<void> {
  // Actualizar caché local inmediatamente
  const currentCached = getStoredShoppingLists();
  const updated = currentCached.map((l) =>
    l.id === id
      ? {
          ...l,
          ...updates,
          updatedAt: new Date(),
        }
      : l
  );
  saveStoredShoppingLists(updated);

  try {
    const payload: Partial<Database["public"]["Tables"]["shopping_lists"]["Update"]> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.targetAccountId !== undefined) payload.target_account_id = updates.targetAccountId;
    if (updates.targetCategoryId !== undefined) payload.target_category_id = updates.targetCategoryId;

    const { error } = await supabase
      .from("shopping_lists")
      .update(payload)
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    console.warn("updateShoppingListRemote failed remotely, queued for sync:", err);
    enqueueSyncOp({ type: "update_list", id, payload: updates });
  }
}

export async function deleteShoppingListRemote(id: string): Promise<void> {
  // Actualizar caché local inmediatamente
  const currentCached = getStoredShoppingLists();
  saveStoredShoppingLists(currentCached.filter((l) => l.id !== id));

  try {
    const { error } = await supabase.from("shopping_lists").delete().eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.warn("deleteShoppingListRemote failed remotely, queued for sync:", err);
    enqueueSyncOp({ type: "delete_list", id });
  }
}

export async function createShoppingListItemRemote(
  item: Omit<ShoppingListItem, "id"> & { id?: string }
): Promise<ShoppingListItem> {
  const localItemId = item.id || generateClientUUID();
  const localItem: ShoppingListItem = {
    id: localItemId,
    listId: item.listId,
    name: item.name.trim(),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    isChecked: item.isChecked,
    sortOrder: item.sortOrder,
  };

  // Actualizar caché local
  const currentCached = getStoredShoppingLists();
  const updated = currentCached.map((l) => {
    if (l.id === item.listId) {
      return {
        ...l,
        items: [...l.items.filter((i) => i.id !== localItemId), localItem],
        updatedAt: new Date(),
      };
    }
    return l;
  });
  saveStoredShoppingLists(updated);

  try {
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({
        list_id: item.listId,
        name: item.name.trim(),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        is_checked: item.isChecked,
        sort_order: item.sortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    const remoteItem: ShoppingListItem = {
      id: data.id,
      listId: data.list_id,
      name: data.name,
      quantity: Number(data.quantity) || 1,
      unitPrice: Number(data.unit_price) || 0,
      isChecked: data.is_checked,
      sortOrder: data.sort_order,
    };

    return remoteItem;
  } catch (err) {
    console.warn("createShoppingListItemRemote failed remotely, queued for sync:", err);
    enqueueSyncOp({ type: "create_item", payload: localItem });
    return localItem;
  }
}

export async function updateShoppingListItemRemote(
  id: string,
  updates: Partial<{
    name: string;
    quantity: number;
    unitPrice: number;
    isChecked: boolean;
    sortOrder: number;
  }>
): Promise<void> {
  // Actualizar caché local
  const currentCached = getStoredShoppingLists();
  const updated = currentCached.map((l) => ({
    ...l,
    items: l.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
  }));
  saveStoredShoppingLists(updated);

  try {
    const payload: Partial<Database["public"]["Tables"]["shopping_list_items"]["Update"]> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
    if (updates.isChecked !== undefined) payload.is_checked = updates.isChecked;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

    const { error } = await supabase
      .from("shopping_list_items")
      .update(payload)
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    console.warn("updateShoppingListItemRemote failed remotely, queued for sync:", err);
    enqueueSyncOp({ type: "update_item", id, payload: updates });
  }
}

export async function deleteShoppingListItemRemote(id: string): Promise<void> {
  // Actualizar caché local
  const currentCached = getStoredShoppingLists();
  const updated = currentCached.map((l) => ({
    ...l,
    items: l.items.filter((i) => i.id !== id),
  }));
  saveStoredShoppingLists(updated);

  try {
    const { error } = await supabase.from("shopping_list_items").delete().eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.warn("deleteShoppingListItemRemote failed remotely, queued for sync:", err);
    enqueueSyncOp({ type: "delete_item", id });
  }
}
