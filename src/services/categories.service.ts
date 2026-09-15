import { supabase } from "@/integrations/supabase/client";
import { Category, TransactionType } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";
import { isValidUuid } from "@/services/transactions.service";

type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    type: row.type as TransactionType,
    icon: row.icon || undefined,
    parentId: row.parent_id,
    archived: row.archived,
    order: row.sort_order,
  }));
}

export async function insertCategory(cat: Omit<Category, "id"> & { id?: string }): Promise<Category> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user");

  const insertPayload: any = {
    user_id: user.id,
    name: cat.name,
    color: cat.color,
    type: cat.type,
    icon: cat.icon || null,
    parent_id: cat.parentId || null,
    archived: cat.archived || false,
    sort_order: cat.order || 0,
  };
  if (cat.id && isValidUuid(cat.id)) insertPayload.id = cat.id;

  const { data, error } = await supabase
    .from("categories")
    .upsert(insertPayload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    type: data.type as TransactionType,
    icon: data.icon || undefined,
    parentId: data.parent_id,
    archived: data.archived,
    order: data.sort_order,
  };
}

export async function updateCategoryRemote(id: string, updates: Partial<Category>): Promise<void> {
  const payload: CategoryUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.parentId !== undefined) payload.parent_id = updates.parentId;
  if (updates.archived !== undefined) payload.archived = updates.archived;
  if (updates.order !== undefined) payload.sort_order = updates.order;

  const { error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCategoryRemote(id: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export const DEFAULT_PRESET_CATEGORIES: Omit<Category, "id">[] = [
  // Gastos
  { name: "Alimentación", color: "bg-orange-500", type: "expense", icon: "utensils", order: 10, archived: false, parentId: null },
  { name: "Transporte", color: "bg-sky-500", type: "expense", icon: "car", order: 20, archived: false, parentId: null },
  { name: "Vivienda", color: "bg-violet-500", type: "expense", icon: "home", order: 30, archived: false, parentId: null },
  { name: "Servicios", color: "bg-yellow-500", type: "expense", icon: "zap", order: 40, archived: false, parentId: null },
  { name: "Ocio y Salidas", color: "bg-pink-500", type: "expense", icon: "film", order: 50, archived: false, parentId: null },
  { name: "Salud", color: "bg-red-400", type: "expense", icon: "heart-pulse", order: 60, archived: false, parentId: null },
  { name: "Compras", color: "bg-emerald-500", type: "expense", icon: "shopping-bag", order: 70, archived: false, parentId: null },
  { name: "Educación", color: "bg-indigo-500", type: "expense", icon: "graduation-cap", order: 80, archived: false, parentId: null },
  // Ingresos
  { name: "Salario", color: "bg-emerald-500", type: "income", icon: "briefcase", order: 1, archived: false, parentId: null },
  { name: "Freelance", color: "bg-teal-500", type: "income", icon: "laptop", order: 2, archived: false, parentId: null },
  { name: "Inversiones", color: "bg-cyan-500", type: "income", icon: "trending-up", order: 3, archived: false, parentId: null },
  { name: "Otros Ingresos", color: "bg-zinc-500", type: "income", icon: "wallet", order: 4, archived: false, parentId: null },
];

export async function seedDefaultCategoriesRemote(): Promise<Category[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user");

  const rowsToInsert = DEFAULT_PRESET_CATEGORIES.map(cat => ({
    user_id: user.id,
    name: cat.name,
    color: cat.color,
    type: cat.type,
    icon: cat.icon || null,
    parent_id: cat.parentId || null,
    archived: cat.archived || false,
    sort_order: cat.order || 0,
  }));

  const { data, error } = await supabase
    .from("categories")
    .insert(rowsToInsert)
    .select();

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
    type: row.type as TransactionType,
    icon: row.icon || undefined,
    parentId: row.parent_id,
    archived: row.archived,
    order: row.sort_order,
  }));
}

