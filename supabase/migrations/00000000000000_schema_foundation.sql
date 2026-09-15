-- =============================================================================
-- DOM - Finanzas Personales Soberanas — Schema Foundation
-- Version: current (consolidates all migrations up to 2026-09-15)
-- =============================================================================
-- Este archivo es la ÚNICA fuente de verdad del esquema para inicialización local.
-- Para producción/cloud, aplicar el delta correspondiente en migrations/delta/.
-- Uso: supabase db reset (local) - aplica este archivo desde cero.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- UTILITY FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------------------------------------------------------------------------
-- TABLE: profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name       TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN public.profiles.name = '' OR public.profiles.name IS NULL THEN EXCLUDED.name ELSE public.profiles.name END,
    avatar_url = CASE WHEN public.profiles.avatar_url = '' OR public.profiles.avatar_url IS NULL THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar cambios de perfil hacia auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.name IS NOT DISTINCT FROM NEW.name AND OLD.avatar_url IS NOT DISTINCT FROM NEW.avatar_url THEN
    RETURN NEW;
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'full_name', NEW.name,
    'name', NEW.name,
    'avatar_url', NEW.avatar_url
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_profile_updated_sync_auth ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_auth
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth_user();

-- ---------------------------------------------------------------------------
-- TABLE: categories
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'bg-zinc-500',
  type       TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon       TEXT DEFAULT 'circle-dot',
  parent_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  archived   BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own categories" ON public.categories;
CREATE POLICY "Users manage own categories" ON public.categories
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- TABLE: accounts
-- Includes: currency (from migration 20260905)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name             TEXT NOT NULL,
  balance          NUMERIC NOT NULL DEFAULT 0,
  type             TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash')),
  color            TEXT NOT NULL DEFAULT 'bg-sky-500',
  icon             TEXT DEFAULT 'wallet',
  archived         BOOLEAN NOT NULL DEFAULT false,
  credit_limit     NUMERIC,
  closing_day      INT,
  payment_day      INT,
  brand            TEXT,
  custom_brand_name TEXT,
  currency         TEXT NOT NULL DEFAULT 'ARS',
  credit_card_view_mode TEXT NOT NULL DEFAULT 'statement_cycles',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.accounts.currency IS 'Currency code for the account (e.g. ARS, USD, EUR, USDT)';

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own accounts" ON public.accounts;
CREATE POLICY "Users manage own accounts" ON public.accounts
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- TABLE: tags
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'bg-zinc-500',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tags" ON public.tags;
CREATE POLICY "Users manage own tags" ON public.tags
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- TABLE: transactions
-- Includes: currency (20260907), origin + external_reference (20260904),
--           tag_ids text[] (base, confirmed type)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount               NUMERIC NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  category_id          UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  type                 TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  account_id           UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  is_card_payment      BOOLEAN DEFAULT false,
  is_transfer          BOOLEAN DEFAULT false,
  tag_ids              TEXT[] DEFAULT '{}',
  note                 TEXT,
  receipt_url          TEXT,
  recurring_id         UUID,
  installment_current  INT,
  installment_total    INT,
  installment_group_id TEXT,
  currency             TEXT NOT NULL DEFAULT 'ARS',
  origin               TEXT DEFAULT 'manual' CHECK (origin IN ('manual', 'csv_import', 'whatsapp_bot', 'recurring')),
  external_reference   TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.transactions.currency IS 'Currency code for the transaction (e.g. ARS, USD, EUR)';

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions" ON public.transactions
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account   ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_origin    ON public.transactions(user_id, origin);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date ON public.transactions(user_id, account_id, date DESC);

-- ---------------------------------------------------------------------------
-- TABLE: budgets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  amount      NUMERIC NOT NULL,
  month       INT NOT NULL CHECK (month BETWEEN 0 AND 11),
  year        INT NOT NULL,
  enable_rollover      BOOLEAN NOT NULL DEFAULT false,
  accumulated_rollover NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budgets" ON public.budgets;
CREATE POLICY "Users manage own budgets" ON public.budgets
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_budgets_category_month_year
  ON public.budgets(user_id, category_id, month, year);

-- ---------------------------------------------------------------------------
-- TABLE: goals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  target_amount  NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline       TIMESTAMPTZ,
  color          TEXT NOT NULL DEFAULT 'bg-emerald-500',
  icon           TEXT NOT NULL DEFAULT 'target',
  completed      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goals" ON public.goals;
CREATE POLICY "Users manage own goals" ON public.goals
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_goals_user_completed
  ON public.goals(user_id, completed);

-- ---------------------------------------------------------------------------
-- TABLE: recurring_transactions
-- Includes: currency (20260907), tag_ids text[] (confirmed type)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount      NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  account_id  UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  frequency   TEXT NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused      BOOLEAN NOT NULL DEFAULT false,
  tag_ids     TEXT[] DEFAULT '{}',
  currency    TEXT NOT NULL DEFAULT 'ARS',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.recurring_transactions.currency IS 'Currency code for the recurring transaction (e.g. ARS, USD, EUR)';

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recurring" ON public.recurring_transactions;
CREATE POLICY "Users manage own recurring" ON public.recurring_transactions
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_recurring_updated_at ON public.recurring_transactions;
CREATE TRIGGER update_recurring_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_recurring_user_active_next
  ON public.recurring_transactions(user_id, paused, next_date);

-- ---------------------------------------------------------------------------
-- TABLE: bill_reminders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bill_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  due_date    TIMESTAMPTZ NOT NULL,
  frequency   TEXT NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id  UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  auto_pay    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bills" ON public.bill_reminders;
CREATE POLICY "Users manage own bills" ON public.bill_reminders
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_bills_updated_at ON public.bill_reminders;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bill_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bills_user_status_due
  ON public.bill_reminders(user_id, status, due_date);

-- ---------------------------------------------------------------------------
-- TABLE: user_settings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  currency             TEXT NOT NULL DEFAULT 'ARS',
  language             TEXT NOT NULL DEFAULT 'es',
  chart_type           TEXT NOT NULL DEFAULT 'bar',
  daily_budget         NUMERIC NOT NULL DEFAULT 150,
  show_decimals        BOOLEAN NOT NULL DEFAULT true,
  theme                TEXT NOT NULL DEFAULT 'dark',
  home_sections        JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_exchange_rates JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- TABLE: whatsapp_integrations (from migration 20260904)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_integrations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone_number            TEXT NOT NULL UNIQUE,
  is_verified             BOOLEAN NOT NULL DEFAULT false,
  verification_otp        TEXT,
  otp_expires_at          TIMESTAMPTZ,
  default_account_id      UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  default_currency        TEXT NOT NULL DEFAULT 'ARS' CHECK (default_currency IN ('ARS', 'USD', 'EUR')),
  auto_confirm_threshold  NUMERIC NOT NULL DEFAULT 0.85,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own whatsapp integration" ON public.whatsapp_integrations;
CREATE POLICY "Users manage own whatsapp integration" ON public.whatsapp_integrations
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_whatsapp_integrations_updated_at ON public.whatsapp_integrations;
CREATE TRIGGER update_whatsapp_integrations_updated_at
  BEFORE UPDATE ON public.whatsapp_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_phone
  ON public.whatsapp_integrations(phone_number)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- TABLE: whatsapp_messages (from migration 20260904)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  whatsapp_message_id TEXT NOT NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type        TEXT NOT NULL CHECK (message_type IN ('text', 'audio', 'image', 'document', 'interactive')),
  raw_payload         JSONB,
  text_content        TEXT,
  media_url           TEXT,
  parsed_data         JSONB,
  confidence_score    NUMERIC,
  status              TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'needs_confirmation', 'failed', 'ignored')),
  transaction_id      UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own whatsapp messages"   ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users insert own whatsapp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users update own whatsapp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users delete own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users view own whatsapp messages" ON public.whatsapp_messages
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert own whatsapp messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users update own whatsapp messages" ON public.whatsapp_messages
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users delete own whatsapp messages" ON public.whatsapp_messages
  FOR DELETE USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_created
  ON public.whatsapp_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id
  ON public.whatsapp_messages(whatsapp_message_id);

-- ---------------------------------------------------------------------------
-- TABLE: shopping_lists (from migration 20260906)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  target_account_id  UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  target_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own shopping lists" ON public.shopping_lists;
CREATE POLICY "Users manage own shopping lists" ON public.shopping_lists
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON public.shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON public.shopping_lists(user_id);

-- ---------------------------------------------------------------------------
-- TABLE: shopping_list_items (from migration 20260906)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  quantity   NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own shopping list items" ON public.shopping_list_items;
CREATE POLICY "Users manage own shopping list items" ON public.shopping_list_items
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.shopping_lists sl WHERE sl.id = list_id AND sl.user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shopping_lists sl WHERE sl.id = list_id AND sl.user_id = (select auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON public.shopping_list_items(list_id);

-- ---------------------------------------------------------------------------
-- TABLE: transaction_rules (from migration 20260908)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transaction_rules (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE NOT NULL,
  priority   INTEGER DEFAULT 0 NOT NULL,
  conditions JSONB DEFAULT '[]'::jsonb NOT NULL,
  actions    JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transaction rules"   ON public.transaction_rules;
DROP POLICY IF EXISTS "Users can insert their own transaction rules" ON public.transaction_rules;
DROP POLICY IF EXISTS "Users can update their own transaction rules" ON public.transaction_rules;
DROP POLICY IF EXISTS "Users can delete their own transaction rules" ON public.transaction_rules;
CREATE POLICY "Users can view their own transaction rules"   ON public.transaction_rules FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert their own transaction rules" ON public.transaction_rules FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own transaction rules" ON public.transaction_rules FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own transaction rules" ON public.transaction_rules FOR DELETE USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- STORAGE: receipts bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own receipts"   ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public receipts"       ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts"     ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts"   ON storage.objects;

CREATE POLICY "Users can upload their own receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- Restrict SELECT to owner's own folder only (avoids broad listing warned by DB Advisor lint 0025)
CREATE POLICY "Users can view their own receipts" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users can delete their own receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- STORAGE: avatars bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars"            ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar"   ON storage.objects;

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- SEED FUNCTION: default categories, accounts and settings per new user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_user_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id     UUID := NEW.id;
  v_salary_id   UUID;
  v_food_id     UUID;
  v_trans_id    UUID;
  v_housing_id  UUID;
  v_services_id UUID;
  v_leisure_id  UUID;
  v_health_id   UUID;
BEGIN
  -- 1. Default Categories (income)
  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Salario', 'bg-emerald-500', 'income', 'briefcase', 1)
  RETURNING id INTO v_salary_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Otros Ingresos', 'bg-teal-500', 'income', 'wallet', 2);

  -- Default Categories (expense)
  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Alimentación', 'bg-orange-500', 'expense', 'utensils', 10)
  RETURNING id INTO v_food_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Transporte', 'bg-sky-500', 'expense', 'car', 20)
  RETURNING id INTO v_trans_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Vivienda', 'bg-violet-500', 'expense', 'home', 30)
  RETURNING id INTO v_housing_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Servicios', 'bg-yellow-500', 'expense', 'zap', 40)
  RETURNING id INTO v_services_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Ocio y Salidas', 'bg-pink-500', 'expense', 'film', 50)
  RETURNING id INTO v_leisure_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Salud', 'bg-red-400', 'expense', 'heart-pulse', 60)
  RETURNING id INTO v_health_id;

  -- 2. Default Accounts
  INSERT INTO public.accounts (user_id, name, balance, type, color, icon)
  VALUES
    (v_user_id, 'Efectivo',          0, 'cash',     'bg-emerald-500', 'banknote'),
    (v_user_id, 'Caja de Ahorro',    0, 'savings',  'bg-sky-500',     'landmark'),
    (v_user_id, 'Billetera Virtual', 0, 'checking', 'bg-violet-500',  'wallet');

  -- 3. Default User Settings
  INSERT INTO public.user_settings (user_id, currency, language, daily_budget, theme)
  VALUES (v_user_id, 'ARS', 'es', 15000, 'dark')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_seed_defaults ON auth.users;
CREATE TRIGGER on_auth_user_seed_defaults
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_user_defaults();

-- ---------------------------------------------------------------------------
-- FUNCTION: purge_user_data
-- Purges all user business records atomically and optionally restores default starter data.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_user_data(p_reseed boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_salary_id   UUID;
  v_food_id     UUID;
  v_trans_id    UUID;
  v_housing_id  UUID;
  v_services_id UUID;
  v_leisure_id  UUID;
  v_health_id   UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Listas de compras y sus artículos
  DELETE FROM public.shopping_list_items
  WHERE list_id IN (SELECT id FROM public.shopping_lists WHERE user_id = v_user_id);
  DELETE FROM public.shopping_lists WHERE user_id = v_user_id;

  -- 2. Reglas de categorización
  DELETE FROM public.transaction_rules WHERE user_id = v_user_id;

  -- 3. Vencimientos y transacciones recurrentes
  DELETE FROM public.bill_reminders WHERE user_id = v_user_id;
  DELETE FROM public.recurring_transactions WHERE user_id = v_user_id;

  -- 4. Presupuestos y metas
  DELETE FROM public.budgets WHERE user_id = v_user_id;
  DELETE FROM public.goals WHERE user_id = v_user_id;

  -- 5. WhatsApp integraciones y mensajes
  DELETE FROM public.whatsapp_messages WHERE user_id = v_user_id;
  DELETE FROM public.whatsapp_integrations WHERE user_id = v_user_id;

  -- 6. Transacciones históricas
  DELETE FROM public.transactions WHERE user_id = v_user_id;

  -- 7. Etiquetas
  DELETE FROM public.tags WHERE user_id = v_user_id;

  -- 8. Cuentas y Categorías
  DELETE FROM public.accounts WHERE user_id = v_user_id;
  DELETE FROM public.categories WHERE user_id = v_user_id AND parent_id IS NOT NULL;
  DELETE FROM public.categories WHERE user_id = v_user_id;

  -- 9. Comprobantes en Storage (bucket receipts)
  BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'receipts' 
      AND (owner = v_user_id OR (storage.foldername(name))[1] = v_user_id::text);
  EXCEPTION WHEN OTHERS THEN
    -- Silencioso si storage no está disponible o difiere en configuración
  END;

  -- 10. Re-seed de valores predeterminados de día 1 (si p_reseed es true)
  IF p_reseed THEN
    -- Categorías estándar (ingresos)
    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Salario', 'bg-emerald-500', 'income', 'briefcase', 1)
    RETURNING id INTO v_salary_id;

    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Otros Ingresos', 'bg-teal-500', 'income', 'wallet', 2);

    -- Categorías estándar (gastos)
    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Alimentación', 'bg-orange-500', 'expense', 'utensils', 10)
    RETURNING id INTO v_food_id;

    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Transporte', 'bg-sky-500', 'expense', 'car', 20)
    RETURNING id INTO v_trans_id;

    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Vivienda', 'bg-violet-500', 'expense', 'home', 30)
    RETURNING id INTO v_housing_id;

    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Servicios', 'bg-yellow-500', 'expense', 'zap', 40)
    RETURNING id INTO v_services_id;

    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Ocio y Salidas', 'bg-pink-500', 'expense', 'film', 50)
    RETURNING id INTO v_leisure_id;

    INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
    VALUES (v_user_id, 'Salud', 'bg-red-400', 'expense', 'heart-pulse', 60)
    RETURNING id INTO v_health_id;

    -- Cuentas predeterminadas (saldo 0)
    INSERT INTO public.accounts (user_id, name, balance, type, color, icon)
    VALUES
      (v_user_id, 'Efectivo',          0, 'cash',     'bg-emerald-500', 'banknote'),
      (v_user_id, 'Caja de Ahorro',    0, 'savings',  'bg-sky-500',     'landmark'),
      (v_user_id, 'Billetera Virtual', 0, 'checking', 'bg-violet-500',  'wallet');

    -- Asegurar configuración predeterminada de usuario
    INSERT INTO public.user_settings (user_id, currency, language, daily_budget, theme)
    VALUES (v_user_id, 'ARS', 'es', 15000, 'dark')
    ON CONFLICT (user_id) DO UPDATE SET
      daily_budget = 15000;
  END IF;

  RETURN jsonb_build_object('success', true, 'reseeded', p_reseed);
END;
$$;

-- ---------------------------------------------------------------------------
-- PERMISSIONS: anon and authenticated roles
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- SECURITY: Revoke direct RPC access to trigger-only functions
-- These functions are invoked exclusively by database triggers and must not
-- be callable via /rest/v1/rpc/ by anon or authenticated clients.
-- (Fixes DB Advisor lint 0028 / 0029: anon/authenticated_security_definer_function_executable)
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.handle_new_user()   FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_user_defaults() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_user_data(boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_user_data(boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- SCHEMA RELOAD (PostgREST)
-- ---------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
