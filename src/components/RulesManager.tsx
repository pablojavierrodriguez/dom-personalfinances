import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Zap, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Category, TransactionRule, RuleField, RuleOperator } from "@/lib/types";
import { createTranslator } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-store";

interface RulesManagerProps {
  rules: TransactionRule[];
  categories: Category[];
  onAddRule: (rule: TransactionRule) => void;
  onUpdateRule: (id: string, updates: Partial<TransactionRule>) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onApplyRetroactively: () => void;
  onProvisionDefaults?: () => Promise<any>;
}

export function RulesManager({
  rules,
  categories,
  onAddRule,
  onDeleteRule,
  onToggleRule,
  onApplyRetroactively,
  onProvisionDefaults,
}: RulesManagerProps) {
  const { t } = useSettings();

  const [openCreate, setOpenCreate] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [conditionField, setConditionField] = useState<RuleField>("description");
  const [conditionOperator, setConditionOperator] = useState<RuleOperator>("contains");
  const [conditionValue, setConditionValue] = useState("");
  const [actionCategory, setActionCategory] = useState("");
  const [actionTags, setActionTags] = useState("");
  const [actionCleanDesc, setActionCleanDesc] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleCreate = () => {
    if (!ruleName.trim() || !conditionValue.trim()) {
      toast.error(t("rules.toastValidation"));
      return;
    }

    const newRule: TransactionRule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      isActive: true,
      priority: rules.length + 1,
      conditions: [
        {
          field: conditionField,
          operator: conditionOperator,
          value: conditionField === "amount" ? Number(conditionValue) : conditionValue.trim(),
        },
      ],
      actions: {
        setCategoryId: actionCategory || undefined,
        addTags: actionTags
          ? actionTags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        cleanDescription: actionCleanDesc.trim() || undefined,
      },
      createdAt: new Date(),
    };

    onAddRule(newRule);
    toast.success(t("rules.toastCreated"));
    setRuleName("");
    setConditionValue("");
    setActionCategory("");
    setActionTags("");
    setActionCleanDesc("");
    setOpenCreate(false);
  };

  const handleRunRetroactive = () => {
    onApplyRetroactively();
    toast.success(t("rules.toastApplied"));
  };

  const hasDuplicates = rules.some(
    (rule, idx) =>
      rules.findIndex(
        (r) => r.name.trim().toLowerCase() === rule.name.trim().toLowerCase()
      ) !== idx
  );

  const handleProvisionDefaults = async () => {
    if (!onProvisionDefaults) return;
    try {
      setIsProvisioning(true);
      const res = await onProvisionDefaults();
      const createdCount = Array.isArray(res) ? res.length : (res?.created?.length ?? 0);
      const deletedCount = res?.deletedCount ?? 0;

      if (deletedCount > 0 && createdCount > 0) {
        toast.success(t("rules.toastAddedCleaned").replace("{created}", String(createdCount)).replace("{deleted}", String(deletedCount)));
      } else if (deletedCount > 0) {
        toast.success(t("rules.toastCleaned").replace("{count}", String(deletedCount)));
      } else if (createdCount > 0) {
        toast.success(t("rules.toastLoaded").replace("{count}", String(createdCount)));
      } else {
        toast.info(t("rules.toastAllConfigured"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("rules.toastLoadError"));
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="pt-4 pb-28 px-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div>
          <h1 className="text-[20px] font-display font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {t("rules.title")}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("rules.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {rules.length > 0 && (
            <button
              onClick={handleRunRetroactive}
              className="h-8 px-2.5 sm:px-3 rounded-xl bg-secondary text-[12px] font-medium text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title={t("rules.runHistoryTitle") || "Ejecutar reglas"}
              aria-label={t("rules.runHistoryTitle") || "Ejecutar reglas"}
            >
              <Play className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />
              <span className="hidden sm:inline">{t("rules.runHistory")}</span>
              <span className="sm:hidden text-[11px]">Ejecutar</span>
            </button>
          )}

          {hasDuplicates && onProvisionDefaults && (
            <button
              onClick={handleProvisionDefaults}
              disabled={isProvisioning}
              className="h-8 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[12px] font-medium text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
              title={t("rules.cleanDuplicatesTitle") || "Limpiar duplicados"}
              aria-label={t("rules.cleanDuplicatesTitle") || "Limpiar duplicados"}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">{t("rules.cleanDuplicates")}</span>
              <span className="sm:hidden text-xs">{t("rules.cleanShort")}</span>
            </button>
          )}

          {onProvisionDefaults && rules.length > 0 && !hasDuplicates && (
            <button
              onClick={handleProvisionDefaults}
              disabled={isProvisioning}
              className="h-8 px-2.5 sm:px-3 rounded-xl bg-secondary text-[12px] font-medium text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
              title={t("rules.defaultRulesTitle") || "Reglas base"}
              aria-label={t("rules.defaultRulesTitle") || "Reglas base"}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">{t("rules.defaultRules")}</span>
              <span className="sm:hidden text-[11px]">Base</span>
            </button>
          )}

          <button
            onClick={() => setOpenCreate(true)}
            className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-xs shrink-0"
            title={t("rules.newRuleTitle")}
            aria-label={t("rules.newRuleAriaLabel")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-2 mt-2">
        {rules.length === 0 && (
          <div className="p-8 text-center bg-secondary/30 rounded-2xl border border-dashed border-border/60 flex flex-col items-center">
            <Zap className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-[14px] font-medium text-foreground">{t("rules.noRules")}</p>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
              {t("rules.noRulesHint")}
            </p>
            {onProvisionDefaults && (
              <button
                type="button"
                onClick={handleProvisionDefaults}
                disabled={isProvisioning}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isProvisioning ? t("rules.loading") : t("rules.loadRecommended")}</span>
              </button>
            )}
          </div>
        )}

        {rules.map((rule) => {
          const cat = categories.find((c) => c.id === rule.actions.setCategoryId);
          return (
            <div
              key={rule.id}
              className={`p-3.5 rounded-xl border transition-all ${
                rule.isActive
                  ? "bg-card border-border/70 shadow-xs"
                  : "bg-secondary/20 border-border/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-foreground truncate">{rule.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        rule.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {rule.isActive ? t("rules.statusActive") : t("rules.statusPaused")}
                    </span>
                  </div>

                  {rule.conditions.map((cond, i) => {
                    const isKeywordList = typeof cond.value === "string" && cond.value.includes(",");
                    const keywords = isKeywordList
                      ? (cond.value as string).split(",").map((k) => k.trim()).filter(Boolean)
                      : [];

                    return (
                      <div key={i} className="text-[12px] text-muted-foreground flex items-baseline gap-1.5 flex-wrap mt-1">
                        <span className="font-semibold text-foreground/90">{t("rules.conditionIf")}</span>
                        <span className="text-muted-foreground font-medium">{cond.field}</span>
                        <span className="font-mono-data text-primary text-[11px] px-1 py-0.2 rounded bg-primary/10">
                          {cond.operator}
                        </span>
                        {isKeywordList ? (
                          <div className="flex flex-wrap gap-1 mt-0.5 max-w-full">
                            {keywords.map((kw, kwIdx) => (
                              <span
                                key={kwIdx}
                                className="px-1.5 py-0.5 rounded-md bg-secondary/80 border border-border/50 text-foreground font-mono-data text-[11px]"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">"{String(cond.value)}"</span>
                        )}
                      </div>
                    );
                  })}

                  <div className="text-[12px] text-muted-foreground flex flex-wrap items-center gap-2 pt-1">
                    <span className="font-semibold text-foreground">{t("rules.conditionThen")}</span>
                    {cat && (
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px]">
                        {t("rules.categoryOf").replace("{name}", cat.name)}
                      </span>
                    )}
                    {rule.actions.addTags?.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px]">
                        #{tag}
                      </span>
                    ))}
                    {rule.actions.cleanDescription && (
                      <span className="text-[11px] text-muted-foreground">
                        {t("rules.cleanedTo").replace("{name}", rule.actions.cleanDescription)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className="p-1.5 text-muted-foreground hover:text-foreground text-xs"
                    title={rule.isActive ? t("rules.actionPauseTitle") : t("rules.actionActivateTitle")}
                  >
                    {rule.isActive ? t("rules.actionPause") : t("rules.actionActivate")}
                  </button>
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Dialog / Modal */}
      <AnimatePresence>
        {openCreate && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border p-5 rounded-2xl shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <h2 className="text-[16px] font-display font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  {t("rules.newTitle")}
                </h2>
                <button onClick={() => setOpenCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                  {t("rules.nameLabel")}
                </label>
                <input
                  type="text"
                  placeholder={t("rules.namePlaceholder")}
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full h-10 px-3 bg-secondary rounded-xl text-[14px] text-foreground border border-border/50 outline-none focus:border-primary"
                />
              </div>

              {/* Condition Builder */}
              <div className="p-3 bg-secondary/40 rounded-xl space-y-2 border border-border/40">
                <label className="text-[11px] uppercase tracking-wider text-primary font-bold block">
                  {t("rules.conditionSection")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value as RuleField)}
                    className="bg-secondary rounded-lg px-2.5 py-2 text-[13px] text-foreground border border-border outline-none"
                  >
                    <option value="description">{t("rules.fieldDescription")}</option>
                    <option value="amount">{t("rules.fieldAmount")}</option>
                    <option value="type">{t("rules.fieldType")}</option>
                  </select>

                  <select
                    value={conditionOperator}
                    onChange={(e) => setConditionOperator(e.target.value as RuleOperator)}
                    className="bg-secondary rounded-lg px-2.5 py-2 text-[13px] text-foreground border border-border outline-none"
                  >
                    <option value="contains">{t("rules.opContains")}</option>
                    <option value="contains_any">{t("rules.opContainsAny")}</option>
                    <option value="starts_with">{t("rules.opStartsWith")}</option>
                    <option value="equals">{t("rules.opEquals")}</option>
                    {conditionField === "amount" && <option value="greater_than">{t("rules.opGreaterThan")}</option>}
                    {conditionField === "amount" && <option value="less_than">{t("rules.opLessThan")}</option>}
                  </select>

                  <input
                    type="text"
                    placeholder={conditionOperator === "contains_any" ? t("rules.conditionPlaceholderMulti") : t("rules.conditionPlaceholder")}
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    className="bg-secondary rounded-lg px-2.5 py-2 text-[13px] text-foreground border border-border outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Action Builder */}
              <div className="p-3 bg-secondary/40 rounded-xl space-y-2.5 border border-border/40">
                <label className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold block">
                  {t("rules.actionSection")}
                </label>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">{t("rules.assignCategory")}</label>
                  <select
                    value={actionCategory}
                    onChange={(e) => setActionCategory(e.target.value)}
                    className="w-full bg-secondary rounded-lg px-2.5 py-2 text-[13px] text-foreground border border-border outline-none"
                  >
                    <option value="">{t("rules.noCategoryChange")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    {t("rules.addTags")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("rules.tagsPlaceholder")}
                    value={actionTags}
                    onChange={(e) => setActionTags(e.target.value)}
                    className="w-full bg-secondary rounded-lg px-2.5 py-2 text-[13px] text-foreground border border-border outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    {t("rules.cleanName")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("rules.cleanNamePlaceholder")}
                    value={actionCleanDesc}
                    onChange={(e) => setActionCleanDesc(e.target.value)}
                    className="w-full bg-secondary rounded-lg px-2.5 py-2 text-[13px] text-foreground border border-border outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-[13px] font-medium"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold"
                >
                  {t("rules.createRule")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
