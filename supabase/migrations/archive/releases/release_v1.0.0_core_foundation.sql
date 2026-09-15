-- ==========================================================================
-- RELEASE CONSOLIDADA v1.0.0: Core Foundation (Auth, Tables, RLS, Storage)
-- ==========================================================================


-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-zinc-500',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT 'circle-dot',
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash')),
  color TEXT NOT NULL DEFAULT 'bg-sky-500',
  icon TEXT DEFAULT 'wallet',
  archived BOOLEAN NOT NULL DEFAULT false,
  credit_limit NUMERIC,
  closing_day INT,
  payment_day INT,
  brand TEXT,
  custom_brand_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-zinc-500',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tags" ON public.tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  is_card_payment BOOLEAN DEFAULT false,
  is_transfer BOOLEAN DEFAULT false,
  tag_ids UUID[] DEFAULT '{}',
  note TEXT,
  receipt_url TEXT,
  recurring_id UUID,
  installment_current INT,
  installment_total INT,
  installment_group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);

-- Budgets
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 0 AND 11),
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  color TEXT NOT NULL DEFAULT 'bg-emerald-500',
  icon TEXT NOT NULL DEFAULT 'target',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recurring Transactions
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused BOOLEAN NOT NULL DEFAULT false,
  tag_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bill Reminders
CREATE TABLE public.bill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  auto_pay BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bills" ON public.bill_reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bill_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'ARS',
  language TEXT NOT NULL DEFAULT 'es',
  chart_type TEXT NOT NULL DEFAULT 'bar',
  daily_budget NUMERIC NOT NULL DEFAULT 150,
  show_decimals BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'dark',
  home_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_exchange_rates JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Enable storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects on 'receipts'
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view public receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to seed default categories and accounts on user creation
CREATE OR REPLACE FUNCTION public.seed_user_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID := NEW.id;
  v_salary_id UUID;
  v_food_id UUID;
  v_trans_id UUID;
  v_housing_id UUID;
  v_services_id UUID;
  v_leisure_id UUID;
  v_health_id UUID;
  v_other_exp_id UUID;
BEGIN
  -- 1. Default Categories
  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Salario', 'bg-emerald-500', 'income', 'briefcase', 1)
  RETURNING id INTO v_salary_id;

  INSERT INTO public.categories (user_id, name, color, type, icon, sort_order)
  VALUES (v_user_id, 'Otros Ingresos', 'bg-teal-500', 'income', 'wallet', 2);

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
    (v_user_id, 'Efectivo', 0, 'cash', 'bg-emerald-500', 'banknote'),
    (v_user_id, 'Caja de Ahorro', 0, 'savings', 'bg-sky-500', 'landmark'),
    (v_user_id, 'Billetera Virtual', 0, 'checking', 'bg-violet-500', 'wallet');

  -- 3. Default User Settings
  INSERT INTO public.user_settings (user_id, currency, language, daily_budget, theme)
  VALUES (v_user_id, 'ARS', 'es', 15000, 'dark')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger to execute seed on user creation
DROP TRIGGER IF EXISTS on_auth_user_seed_defaults ON auth.users;
CREATE TRIGGER on_auth_user_seed_defaults
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_user_defaults();


-- Otorgar permisos al esquema public para roles de PostgREST (authenticated y anon)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Permisos por defecto para futuras tablas y objetos
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

