-- ==========================================================================
-- RELEASE CONSOLIDADA v1.1.0: AI WhatsApp Bot & Multi-Currency Support
-- ==========================================================================

-- Migration: WhatsApp Bot Integration & Message Logging (SPEC-008)
-- Tables: public.whatsapp_integrations, public.whatsapp_messages
-- Alterations: public.transactions (origin, external_reference)

-- 1. WhatsApp Integrations (1 per user)
CREATE TABLE IF NOT EXISTS public.whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone_number TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_otp TEXT,
  otp_expires_at TIMESTAMPTZ,
  default_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  default_currency TEXT NOT NULL DEFAULT 'ARS' CHECK (default_currency IN ('ARS', 'USD', 'EUR')),
  auto_confirm_threshold NUMERIC NOT NULL DEFAULT 0.85,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own whatsapp integration" ON public.whatsapp_integrations;
CREATE POLICY "Users manage own whatsapp integration"
  ON public.whatsapp_integrations
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

-- 2. Alter transactions table to support source tracking
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual' CHECK (origin IN ('manual', 'csv_import', 'whatsapp_bot', 'recurring')),
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_origin
  ON public.transactions(user_id, origin);

-- 3. WhatsApp Messages Audit & Processing History
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  whatsapp_message_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'audio', 'image', 'document', 'interactive')),
  raw_payload JSONB,
  text_content TEXT,
  media_url TEXT,
  parsed_data JSONB,
  confidence_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'needs_confirmation', 'failed', 'ignored')),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users view own whatsapp messages"
  ON public.whatsapp_messages
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users insert own whatsapp messages"
  ON public.whatsapp_messages
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_created
  ON public.whatsapp_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id
  ON public.whatsapp_messages(whatsapp_message_id);


-- Migration: Add currency column to public.accounts
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ARS';

COMMENT ON COLUMN public.accounts.currency IS 'Currency code for the account (e.g. ARS, USD, EUR, USDT)';

