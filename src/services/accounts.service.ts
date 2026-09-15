import { supabase } from "@/integrations/supabase/client";
import { Account, AccountType, CreditCardBrand } from "@/lib/types";
import { Database } from "@/integrations/supabase/types";
import { isValidUuid } from "@/services/transactions.service";

type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    // Para tarjetas de crédito, garantizar que el balance sea siempre <= 0
    balance: row.type === "credit" ? -Math.abs(Number(row.balance)) : Number(row.balance),
    type: row.type as AccountType,
    color: row.color,
    icon: row.icon || undefined,
    archived: row.archived,
    creditLimit: row.credit_limit ? Number(row.credit_limit) : undefined,
    closingDay: row.closing_day || undefined,
    paymentDay: row.payment_day || undefined,
    brand: (row.brand as CreditCardBrand) || undefined,
    customBrandName: row.custom_brand_name || undefined,
    currency: (row.currency as any) || "ARS",
    creditCardViewMode: (row.credit_card_view_mode as "statement_cycles" | "negative_balance") || "statement_cycles",
  }));
}

export async function insertAccount(acc: Omit<Account, "id"> & { id?: string }): Promise<Account> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user");

  // Para tarjetas de crédito, garantizar balance <= 0 (la deuda es negativa)
  const safeBalance = acc.type === "credit" ? -Math.abs(acc.balance) : acc.balance;

  const insertPayload: any = {
    user_id: user.id,
    name: acc.name,
    balance: safeBalance,
    type: acc.type,
    color: acc.color,
    icon: acc.icon || null,
    archived: acc.archived || false,
    credit_limit: acc.creditLimit || null,
    closing_day: acc.closingDay || null,
    payment_day: acc.paymentDay || null,
    brand: acc.brand || null,
    custom_brand_name: acc.customBrandName || null,
    currency: acc.currency || "ARS",
    credit_card_view_mode: acc.creditCardViewMode || "statement_cycles",
  };
  if (acc.id && isValidUuid(acc.id)) insertPayload.id = acc.id;

  const { data, error } = await supabase
    .from("accounts")
    .upsert(insertPayload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    // Re-aplicar la garantía de signo correcto al retornar
    balance: data.type === "credit" ? -Math.abs(Number(data.balance)) : Number(data.balance),
    type: data.type as AccountType,
    color: data.color,
    icon: data.icon || undefined,
    archived: data.archived,
    creditLimit: data.credit_limit ? Number(data.credit_limit) : undefined,
    closingDay: data.closing_day || undefined,
    paymentDay: data.payment_day || undefined,
    brand: (data.brand as CreditCardBrand) || undefined,
    customBrandName: data.custom_brand_name || undefined,
    currency: (data.currency as any) || "ARS",
    creditCardViewMode: (data.credit_card_view_mode as "statement_cycles" | "negative_balance") || "statement_cycles",
  };
}

export async function updateAccountRemote(id: string, updates: Partial<Account>): Promise<void> {
  const payload: AccountUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.balance !== undefined) payload.balance = updates.balance;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.archived !== undefined) payload.archived = updates.archived;
  if (updates.creditLimit !== undefined) payload.credit_limit = updates.creditLimit;
  if (updates.closingDay !== undefined) payload.closing_day = updates.closingDay;
  if (updates.paymentDay !== undefined) payload.payment_day = updates.paymentDay;
  if (updates.brand !== undefined) payload.brand = updates.brand;
  if (updates.customBrandName !== undefined) payload.custom_brand_name = updates.customBrandName;
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.creditCardViewMode !== undefined) payload.credit_card_view_mode = updates.creditCardViewMode;

  const { error } = await supabase
    .from("accounts")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteAccountRemote(id: string): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
