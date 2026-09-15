import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Archive, ChevronRight, Pencil, Trash2, ArchiveRestore, X, ChevronDown, FolderInput, Sparkles, Loader2, MoreVertical } from "lucide-react";
import { Category, CATEGORY_COLORS, CATEGORY_ICONS, TransactionType } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateUUID } from "@/services/sync-queue.service";

interface CategoryManagerProps {
  categories: Category[];
  getRootCategories: (type?: TransactionType) => Category[];
  getSubcategories: (parentId: string) => Category[];
  getArchivedCategories: () => Category[];
  getTransactionCountByCategory: (id: string) => number;
  getAllActiveCategories: (type?: TransactionType) => Category[];
  onAdd: (cat: Category) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReassign: (fromId: string, toId: string) => void;
  onSeedDefaults?: () => Promise<void>;
}

type ViewMode = "list" | "edit" | "create" | "archived" | "reassign";

export function CategoryManager({
  categories, getRootCategories, getSubcategories, getArchivedCategories,
  getTransactionCountByCategory, getAllActiveCategories,
  onAdd, onUpdate, onArchive, onUnarchive, onDelete, onReassign, onSeedDefaults,
}: CategoryManagerProps) {
  const { t } = useSettings();
  const [typeFilter, setTypeFilter] = useState<TransactionType>("expense");
  const [view, setView] = useState<ViewMode>("list");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSeeding, setIsSeeding] = useState(false);

  // Create/edit form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(CATEGORY_COLORS[0]);
  const [formIcon, setFormIcon] = useState(CATEGORY_ICONS[0]);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formType, setFormType] = useState<TransactionType>("expense");

  // Reassign state
  const [reassignAction, setReassignAction] = useState<"delete" | "archive">("delete");
  const [reassignTargetId, setReassignTargetId] = useState<string>("");
  const [reassignCat, setReassignCat] = useState<Category | null>(null);
  const [skipReassign, setSkipReassign] = useState(false);

  const handleSeed = async () => {
    if (!onSeedDefaults || isSeeding) return;
    try {
      setIsSeeding(true);
      await onSeedDefaults();
    } finally {
      setIsSeeding(false);
    }
  };

  const rootCats = getRootCategories(typeFilter);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreate = (parentId?: string) => {
    setFormName("");
    setFormColor(CATEGORY_COLORS[0]);
    setFormIcon(CATEGORY_ICONS[0]);
    setFormParentId(parentId ?? null);
    setFormType(typeFilter);
    setEditingCat(null);
    setView("create");
  };

  const openEdit = (cat: Category) => {
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormIcon(cat.icon || CATEGORY_ICONS[0]);
    setFormParentId(cat.parentId ?? null);
    setFormType(cat.type);
    setEditingCat(cat);
    setView("edit");
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingCat) {
      onUpdate(editingCat.id, {
        name: formName.trim(),
        color: formColor,
        icon: formIcon,
        parentId: formParentId,
        type: formType,
      });
    } else {
      onAdd({
        id: generateUUID(),
        name: formName.trim(),
        color: formColor,
        type: formType,
        icon: formIcon,
        parentId: formParentId,
        archived: false,
      });
    }
    setView("list");
  };

  const handleDeleteOrArchive = (cat: Category, action: "delete" | "archive") => {
    const count = getTransactionCountByCategory(cat.id);
    if (count > 0) {
      setReassignCat(cat);
      setReassignAction(action);
      setReassignTargetId("");
      setSkipReassign(false);
      setView("reassign");
    } else {
      if (action === "delete") {
        onDelete(cat.id);
      } else {
        onArchive(cat.id);
      }
    }
  };

  const handleReassignConfirm = () => {
    if (!reassignCat) return;
    if (!skipReassign && reassignTargetId) {
      onReassign(reassignCat.id, reassignTargetId);
    }
    if (reassignAction === "delete") {
      onDelete(reassignCat.id);
    } else {
      onArchive(reassignCat.id);
    }
    setView("list");
    setReassignCat(null);
  };

  const archivedCats = getArchivedCategories();
  const availableParents = getRootCategories(formType).filter(c => c.id !== editingCat?.id);
  const reassignOptions = getAllActiveCategories(reassignCat?.type).filter(c => c.id !== reassignCat?.id);

  return (
    <div className="pt-4 pb-28">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <h1 className="text-[20px] font-display font-semibold text-foreground">{t("cat.title")}</h1>
        <div className="flex items-center gap-1.5">
          {onSeedDefaults && categories.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={isSeeding}
              className="h-8 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/10"
            >
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t("cat.loadDefaults")}
            </Button>
          )}
          {archivedCats.length > 0 && (
            <button
              onClick={() => setView("archived")}
              className="h-8 w-8 rounded-xl bg-secondary/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center active:scale-95 transition-all shrink-0"
              title={t("cat.viewArchived")}
              aria-label={t("cat.viewArchived")}
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => openCreate()}
            className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-xs shrink-0"
            title={t("cat.new")}
            aria-label={t("cat.new")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Type toggle */}
      <div className="px-4 mb-4">
        <div className="flex bg-secondary rounded-full p-0.5 w-fit">
          {(["expense", "income"] as TransactionType[]).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                typeFilter === type ? "bg-card text-foreground" : "text-muted-foreground"
              }`}
            >
              {type === "expense" ? t("cat.expenses") : t("cat.income")}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* LIST VIEW */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4">
            {rootCats.length === 0 && (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">
                  {typeFilter === "expense" ? t("cat.emptyExpense") : t("cat.emptyIncome")}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mb-6 leading-relaxed">
                  {categories.length === 0
                    ? t("cat.emptyHintFirst")
                    : t("cat.emptyHint")}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                  {onSeedDefaults && categories.length === 0 && (
                    <Button
                      onClick={handleSeed}
                      disabled={isSeeding}
                      className="w-full gap-2 font-medium"
                    >
                      {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t("cat.loadRecommended")}
                    </Button>
                  )}
                  <Button
                    variant={categories.length === 0 ? "outline" : "default"}
                    onClick={() => openCreate()}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t("cat.createCategory")}
                  </Button>
                </div>
              </div>
            )}
            {rootCats.map(cat => {
              const subs = getSubcategories(cat.id);
              const isExpanded = expandedIds.has(cat.id);
              const txCount = getTransactionCountByCategory(cat.id);
              return (
                <div key={cat.id} className="mb-1">
                  <div className="flex items-center gap-3 py-3 border-b border-border/50">
                    {subs.length > 0 && (
                      <button onClick={() => toggleExpand(cat.id)} className="p-0.5 text-muted-foreground">
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      </button>
                    )}
                    <div className={`w-8 h-8 rounded-[10px] ${cat.color} flex items-center justify-center`}>
                      <CategoryIcon name={cat.icon || "circle-dot"} className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] text-foreground font-medium">{cat.name}</span>
                      {txCount > 0 && (
                        <span className="text-[11px] text-muted-foreground ml-2">{txCount} txns</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openCreate(cat.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all"
                        title={t("cat.newSub")}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all"
                            title={t("cat.optionsCategory")}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(cat)} className="cursor-pointer gap-2">
                            <Pencil className="w-3.5 h-3.5" />
                            <span>{t("common.edit")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteOrArchive(cat, "archive")} className="cursor-pointer gap-2">
                            <Archive className="w-3.5 h-3.5" />
                            <span>{t("common.archive")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteOrArchive(cat, "delete")}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t("common.delete")}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {/* Subcategories */}
                  <AnimatePresence>
                    {isExpanded && subs.map(sub => {
                      const subCount = getTransactionCountByCategory(sub.id);
                      return (
                        <motion.div
                          key={sub.id}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-3 py-2.5 pl-10 border-b border-border/30">
                            <div className={`w-6 h-6 rounded-[8px] ${sub.color} flex items-center justify-center`}>
                              <CategoryIcon name={sub.icon || "circle-dot"} className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] text-foreground font-medium truncate block">{sub.name}</span>
                              {subCount > 0 && (
                                <span className="text-[11px] text-muted-foreground">{subCount} txns</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                                    title={t("cat.optionsSubcategory")}
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => openEdit(sub)} className="cursor-pointer gap-2">
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>{t("common.edit")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteOrArchive(sub, "archive")} className="cursor-pointer gap-2">
                                    <Archive className="w-3.5 h-3.5" />
                                    <span>{t("common.archive")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteOrArchive(sub, "delete")}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{t("common.delete")}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* CREATE / EDIT VIEW */}
        {(view === "create" || view === "edit") && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setView("list")} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-[16px] font-display font-semibold text-foreground">
                {view === "edit" ? t("cat.edit") : t("cat.new")}
              </h2>
            </div>

            {/* Name */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("cat.name")}</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder={t("cat.namePlaceholder")}
              className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:border-muted-foreground outline-none transition-colors mb-4"
            />

            {/* Type */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("cat.typeLabel")}</label>
            <div className="flex bg-secondary rounded-full p-0.5 w-fit mb-4">
              {(["expense", "income"] as TransactionType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setFormType(type)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    formType === type ? "bg-card text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {type === "expense" ? t("cat.expense") : t("cat.incomeType")}
                </button>
              ))}
            </div>

            {/* Parent */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">
              <FolderInput className="w-3 h-3 inline mr-1" />
              {t("cat.parent")}
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFormParentId(null)}
                className={`px-3 py-2 rounded-full text-[13px] transition-colors ${
                  formParentId === null
                    ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {t("cat.noneRoot")}
              </button>
              {availableParents.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFormParentId(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
                    formParentId === p.id
                      ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30"
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <div className={`category-dot ${p.color}`} />
                  {p.name}
                </button>
              ))}
            </div>

            {/* Color */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("cat.color")}</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setFormColor(c)}
                  className={`w-8 h-8 rounded-full ${c} transition-all ${
                    formColor === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : ""
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("cat.icon")}</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORY_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setFormIcon(ic)}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                    formIcon === ic
                      ? `${formColor} text-white ring-1 ring-foreground/30`
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <CategoryIcon name={ic} className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-[12px] bg-secondary/50 mb-5">
              <div className={`w-10 h-10 rounded-[12px] ${formColor} flex items-center justify-center`}>
                <CategoryIcon name={formIcon} className="w-5 h-5 text-white" />
              </div>
              <span className="text-[14px] text-foreground font-medium">{formName || t("common.preview")}</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setView("list")} className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground font-medium text-[14px]">
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={!formName.trim()}
                className="flex-[2] h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40"
              >
                {view === "edit" ? t("common.saveChanges") : t("common.create")}
              </button>
            </div>
          </motion.div>
        )}

        {/* ARCHIVED VIEW */}
        {view === "archived" && (
          <motion.div key="archived" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setView("list")} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-[16px] font-display font-semibold text-foreground">{t("cat.archived")}</h2>
            </div>
            {archivedCats.length === 0 && (
              <p className="text-muted-foreground text-[13px] text-center py-8">{t("cat.noArchived")}</p>
            )}
            {archivedCats.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 py-3 border-b border-border/50">
                <div className={`w-8 h-8 rounded-[10px] ${cat.color} opacity-50 flex items-center justify-center`}>
                  <CategoryIcon name={cat.icon || "circle-dot"} className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[14px] text-muted-foreground">{cat.name}</span>
                  <span className="text-[11px] text-muted-foreground/60 ml-2">{cat.type}</span>
                </div>
                <button
                  onClick={() => onUnarchive(cat.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArchiveRestore className="w-3 h-3" />
                  {t("cat.unarchive")}
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* REASSIGN VIEW */}
        {view === "reassign" && reassignCat && (
          <motion.div key="reassign" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setView("list")} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-[16px] font-display font-semibold text-foreground">
                {reassignAction === "delete" ? t("common.delete") : t("common.archive")} "{reassignCat.name}"
              </h2>
            </div>

            <div className="p-4 rounded-[12px] bg-secondary/50 mb-4">
              <p className="text-[13px] text-foreground mb-1">
                {t("cat.hasTxns").replace("{count}", String(getTransactionCountByCategory(reassignCat.id)))}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {t("cat.moveTxnsPrompt")}
              </p>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSkipReassign(false)}
                className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-medium transition-colors ${
                  !skipReassign ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {t("cat.moveTxns")}
              </button>
              <button
                onClick={() => { setSkipReassign(true); setReassignTargetId(""); }}
                className={`flex-1 py-2.5 rounded-[12px] text-[13px] font-medium transition-colors ${
                  skipReassign ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {t("cat.keepAsIs")}
              </button>
            </div>

            {!skipReassign && (
              <>
                <label className="text-[12px] text-muted-foreground font-medium mb-2 block">{t("cat.moveTo")}</label>
                <div className="flex flex-wrap gap-2 mb-4 max-h-[200px] overflow-auto">
                  {reassignOptions.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setReassignTargetId(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] transition-colors ${
                        reassignTargetId === cat.id
                          ? "bg-secondary text-foreground ring-1 ring-muted-foreground/30"
                          : "bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      <div className={`category-dot ${cat.color}`} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setView("list")} className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground font-medium text-[14px]">
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReassignConfirm}
                disabled={!skipReassign && !reassignTargetId}
                className={`flex-[2] h-11 rounded-[12px] font-medium text-[14px] disabled:opacity-40 ${
                  reassignAction === "delete"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-amber-500 text-background"
                }`}
              >
                {reassignAction === "delete" ? t("common.delete") : t("common.archive")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
