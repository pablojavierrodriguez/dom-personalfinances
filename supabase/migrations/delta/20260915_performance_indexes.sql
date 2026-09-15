-- =============================================================================
-- DOM — Performance Indexes Delta (Cloud & Producción)
-- Fecha: 2026-09-15
-- =============================================================================
-- Índices compuestos para acelerar consultas frecuentes:
-- 1. idx_budgets_category_month_year: Presupuestos por categoría y período
-- 2. idx_transactions_user_account_date: Transacciones por cuenta y fecha desc
-- 3. idx_bills_user_status_due: Vencimientos pendientes por usuario y fecha
-- 4. idx_recurring_user_active_next: Recurrentes activas próximas
-- 5. idx_goals_user_completed: Metas activas vs completadas por usuario
-- =============================================================================

-- 1. Presupuestos por categoría, mes y año
CREATE INDEX IF NOT EXISTS idx_budgets_category_month_year
  ON public.budgets(user_id, category_id, month, year);

-- 2. Transacciones por cuenta ordenadas por fecha (AccountManager, CreditCardManager)
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date
  ON public.transactions(user_id, account_id, date DESC);

-- 3. Vencimientos pendientes por usuario y fecha (ObligationsManager, CashFlowForecast)
CREATE INDEX IF NOT EXISTS idx_bills_user_status_due
  ON public.bill_reminders(user_id, status, due_date);

-- 4. Recurrentes activas próximas (FinanceStore processRecurring, CashFlowForecast)
CREATE INDEX IF NOT EXISTS idx_recurring_user_active_next
  ON public.recurring_transactions(user_id, paused, next_date);

-- 5. Metas por usuario y estado de finalización (GoalsManager)
CREATE INDEX IF NOT EXISTS idx_goals_user_completed
  ON public.goals(user_id, completed);
