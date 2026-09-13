import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, ShoppingCart, Trash2, Check, Archive, CheckCircle2,
  Package, ChevronRight, DollarSign, ArrowLeft, Loader2, Cloud, CloudOff, RefreshCw,
  MoreVertical, Pencil, ArchiveRestore, RotateCcw,
} from "lucide-react";
import { ShoppingList, ShoppingListItem, Account, Category } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { useSettings } from "@/lib/settings-store";
import { parseThousandsInput } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchShoppingLists,
  createShoppingList,
  updateShoppingListRemote,
  deleteShoppingListRemote,
  createShoppingListItemRemote,
  updateShoppingListItemRemote,
  deleteShoppingListItemRemote,
  getStoredShoppingLists,
  getPendingShoppingSyncCount,
  syncPendingShoppingQueue,
} from "@/services/shopping.service";
import { toast } from "sonner";

interface ShoppingListManagerProps {
  accounts: Account[];
  categories: Category[];
  onCheckout: (listName: string, totalAmount: number, accountId: string, categoryId: string) => void;
}

type ViewMode = "lists" | "create" | "detail" | "checkout" | "archived";

export function ShoppingListManager({ accounts, categories, onCheckout }: ShoppingListManagerProps) {
  const { formatAmount, t } = useSettings();
  const [view, setView] = useState<ViewMode>("lists");
  const [lists, setLists] = useState<ShoppingList[]>(() => getStoredShoppingLists());
  const [loading, setLoading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingShoppingSyncCount());
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");

  // Detail state
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");

  // Modals state
  const [confirmDeleteListId, setConfirmDeleteListId] = useState<string | null>(null);
  const [renamingList, setRenamingList] = useState<{ id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; quantity: string; price: string } | null>(null);

  // Checkout state
  const [checkoutAccountId, setCheckoutAccountId] = useState("");
  const [checkoutCategoryId, setCheckoutCategoryId] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchShoppingLists();
      setLists(data);
      setPendingSyncCount(getPendingShoppingSyncCount());
    } catch (err) {
      console.warn("Could not fetch remote shopping lists, using local cache:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      await syncPendingShoppingQueue();
      const fresh = await fetchShoppingLists();
      setLists(fresh);
      setPendingSyncCount(getPendingShoppingSyncCount());
      toast.success(t("shopping.toastSynced"));
    } catch (err) {
      console.warn("Manual sync failed:", err);
      toast.error(t("shopping.toastSyncError"));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleOnline = () => {
      syncPendingShoppingQueue().then(() => {
        setPendingSyncCount(getPendingShoppingSyncCount());
        loadData();
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [loadData]);

  const sourceAccounts = useMemo(
    () => accounts.filter(a => a.type !== "credit" && !a.archived),
    [accounts]
  );
  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === "expense" && !c.archived),
    [categories]
  );

  const activeLists = useMemo(() => lists.filter(l => l.status === "active"), [lists]);
  const completedLists = useMemo(() => lists.filter(l => l.status === "completed"), [lists]);
  const archivedLists = useMemo(() => lists.filter(l => l.status === "archived"), [lists]);

  // - Handlers -
  const handleCreateList = async () => {
    if (!formName.trim()) return;
    try {
      const created = await createShoppingList(formName.trim());
      setLists(prev => [created, ...prev.filter(l => l.id !== created.id)]);
      setActiveList(created);
      setFormName("");
      setView("detail");
      setPendingSyncCount(getPendingShoppingSyncCount());
    } catch (err) {
      console.error("Error creating shopping list:", err);
      toast.error(t("shopping.toastCreateError"));
    }
  };

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return;
    const qty = parseFloat(newItemQty) || 1;
    const price = parseThousandsInput(newItemPrice) || 0;
    try {
      const createdItem = await createShoppingListItemRemote({
        listId: activeList.id,
        name: newItemName.trim(),
        quantity: qty,
        unitPrice: price,
        isChecked: false,
        sortOrder: activeList.items.length,
      });

      const updated = {
        ...activeList,
        items: [...activeList.items.filter(i => i.id !== createdItem.id), createdItem],
        updatedAt: new Date(),
      };
      setActiveList(updated);
      setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
      setNewItemName("");
      setNewItemQty("1");
      setNewItemPrice("");
      setPendingSyncCount(getPendingShoppingSyncCount());
    } catch (err) {
      console.error("Error adding item to shopping list:", err);
      toast.error(t("shopping.toastAddItemError"));
    }
  };

  const toggleItem = useCallback(async (itemId: string) => {
    if (!activeList) return;
    const currentItem = activeList.items.find(i => i.id === itemId);
    if (!currentItem) return;

    const nextChecked = !currentItem.isChecked;
    const updatedItems = activeList.items.map(i =>
      i.id === itemId ? { ...i, isChecked: nextChecked } : i
    );
    const updated = { ...activeList, items: updatedItems, updatedAt: new Date() };
    setActiveList(updated);
    setLists(prev => prev.map(l => l.id === updated.id ? updated : l));

    await updateShoppingListItemRemote(itemId, { isChecked: nextChecked });
    setPendingSyncCount(getPendingShoppingSyncCount());
  }, [activeList]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!activeList) return;
    const updatedItems = activeList.items.filter(i => i.id !== itemId);
    const updated = { ...activeList, items: updatedItems, updatedAt: new Date() };
    setActiveList(updated);
    setLists(prev => prev.map(l => l.id === updated.id ? updated : l));

    await deleteShoppingListItemRemote(itemId);
    setPendingSyncCount(getPendingShoppingSyncCount());
  }, [activeList]);

  const handleUpdateItem = async () => {
    if (!activeList || !editingItem || !editingItem.name.trim()) return;
    const qty = parseFloat(editingItem.quantity) || 1;
    const price = parseThousandsInput(editingItem.price) || 0;
    const itemId = editingItem.id;
    const updatedName = editingItem.name.trim();

    const updatedItems = activeList.items.map(i =>
      i.id === itemId ? { ...i, name: updatedName, quantity: qty, unitPrice: price } : i
    );
    const updated = { ...activeList, items: updatedItems, updatedAt: new Date() };
    setActiveList(updated);
    setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
    setEditingItem(null);

    await updateShoppingListItemRemote(itemId, {
      name: updatedName,
      quantity: qty,
      unitPrice: price,
    });
    setPendingSyncCount(getPendingShoppingSyncCount());
    toast.success(t("shopping.toastItemUpdated"));
  };

  const archiveList = useCallback(async (listId: string) => {
    const target = lists.find(l => l.id === listId);
    if (!target) return;
    const updated = { ...target, status: "archived" as const, updatedAt: new Date() };
    setLists(prev => prev.map(l => l.id === listId ? updated : l));
    if (activeList?.id === listId) {
      setActiveList(updated);
      setView("lists");
    }
    await updateShoppingListRemote(listId, { status: "archived" });
    setPendingSyncCount(getPendingShoppingSyncCount());
    toast.success(t("shopping.toastArchived"));
  }, [lists, activeList]);

  const unarchiveList = useCallback(async (listId: string) => {
    const target = lists.find(l => l.id === listId);
    if (!target) return;
    const updated = { ...target, status: "active" as const, updatedAt: new Date() };
    setLists(prev => prev.map(l => l.id === listId ? updated : l));
    if (activeList?.id === listId) {
      setActiveList(updated);
    }
    await updateShoppingListRemote(listId, { status: "active" });
    setPendingSyncCount(getPendingShoppingSyncCount());
    toast.success(t("shopping.toastRestored"));
  }, [lists, activeList]);

  const reactivateList = useCallback(async (listId: string) => {
    const target = lists.find(l => l.id === listId);
    if (!target) return;
    const updated = { ...target, status: "active" as const, updatedAt: new Date() };
    setLists(prev => prev.map(l => l.id === listId ? updated : l));
    if (activeList?.id === listId) {
      setActiveList(updated);
    }
    await updateShoppingListRemote(listId, { status: "active" });
    setPendingSyncCount(getPendingShoppingSyncCount());
    toast.success(t("shopping.toastReactivated"));
  }, [lists, activeList]);

  const handleRenameList = async () => {
    if (!renamingList || !renamingList.name.trim()) return;
    const { id, name } = renamingList;
    const trimmed = name.trim();
    const target = lists.find(l => l.id === id);
    if (!target) return;
    const updated = { ...target, name: trimmed, updatedAt: new Date() };
    setLists(prev => prev.map(l => l.id === id ? updated : l));
    if (activeList?.id === id) {
      setActiveList(updated);
    }
    setRenamingList(null);
    await updateShoppingListRemote(id, { name: trimmed });
    setPendingSyncCount(getPendingShoppingSyncCount());
    toast.success(t("shopping.toastRenamed"));
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteListId) return;
    const idToDelete = confirmDeleteListId;
    setConfirmDeleteListId(null);
    setLists(prev => prev.filter(l => l.id !== idToDelete));
    if (activeList?.id === idToDelete) {
      setActiveList(null);
      setView("lists");
    }
    await deleteShoppingListRemote(idToDelete);
    setPendingSyncCount(getPendingShoppingSyncCount());
    toast.success(t("shopping.toastDeleted"));
  };

  const openCheckout = () => {
    if (!activeList || activeList.items.length === 0) return;
    setCheckoutAccountId(sourceAccounts[0]?.id || "");
    const groceryCat = expenseCategories.find(c => c.name.toLowerCase().includes("super") || c.id === "groceries");
    setCheckoutCategoryId(groceryCat?.id || expenseCategories[0]?.id || "");
    setView("checkout");
  };

  const handleConfirmCheckout = async () => {
    if (!activeList || !checkoutAccountId || !checkoutCategoryId) return;
    const checkedItems = activeList.items.filter(i => i.isChecked);
    const total = checkedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    if (total <= 0) return;

    onCheckout(activeList.name, total, checkoutAccountId, checkoutCategoryId);

    const updated = { ...activeList, status: "completed" as const, updatedAt: new Date() };
    setActiveList(updated);
    setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
    setView("lists");

    await updateShoppingListRemote(activeList.id, { status: "completed" });
    setPendingSyncCount(getPendingShoppingSyncCount());
  };

  const getListTotal = (list: ShoppingList) =>
    list.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const getCheckedTotal = (list: ShoppingList) =>
    list.items.filter(i => i.isChecked).reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const listPendingDelete = useMemo(
    () => lists.find(l => l.id === confirmDeleteListId),
    [lists, confirmDeleteListId]
  );

  if (loading && lists.length === 0) {
    return (
      <div className="pt-16 pb-28 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{t("shopping.loading")}</p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-28">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {view === "lists" ? (
          <>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-display font-semibold text-foreground">{t("shopping.title")}</h1>
              {pendingSyncCount > 0 ? (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer font-medium"
                  title={t("shopping.syncPendingTooltip")}
                >
                  <CloudOff className="w-3 h-3" />
                  <span>{t("shopping.syncPending").replace("{count}", String(pendingSyncCount))}</span>
                  {isSyncing && <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5" />}
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20"
                  title={t("shopping.syncedTooltip")}
                >
                  <Cloud className="w-3 h-3 text-primary" />
                  <span>{t("shopping.synced")}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Ícono sutil que sólo aparece si hay archivadas (patrón uniforme DOM) */}
              {archivedLists.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView("archived")}
                  className="h-8 w-8 rounded-xl bg-secondary/80 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center active:scale-95 transition-all shrink-0 relative"
                  title={t("shopping.viewArchived")}
                  aria-label={t("shopping.viewArchived")}
                >
                  <Archive className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-mono-data flex items-center justify-center font-bold">
                    {archivedLists.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setFormName(""); setView("create"); }}
                className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-xs shrink-0"
                title={t("shopping.newList")}
                aria-label={t("shopping.newList")}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => view === "checkout" ? setView("detail") : setView("lists")}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                title={t("shopping.back")}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <h2 className="text-[16px] font-display font-semibold text-foreground truncate">
                  {view === "create" && t("shopping.viewTitleNew")}
                  {view === "detail" && activeList?.name}
                  {view === "checkout" && t("shopping.viewTitleCheckout")}
                  {view === "archived" && t("shopping.viewTitleArchived")}
                </h2>
                {view === "detail" && activeList && (
                  <button
                    type="button"
                    onClick={() => setRenamingList({ id: activeList.id, name: activeList.name })}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                    title={t("shopping.renameList")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {view === "detail" && activeList && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 flex items-center justify-center transition-all active:scale-95 shrink-0"
                    title={t("shopping.optionsTitle")}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setRenamingList({ id: activeList.id, name: activeList.name })} className="cursor-pointer gap-2">
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{t("shopping.rename")}</span>
                  </DropdownMenuItem>
                  {activeList.status === "active" && (
                    <DropdownMenuItem onClick={() => archiveList(activeList.id)} className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500">
                      <Archive className="w-3.5 h-3.5" />
                      <span>{t("shopping.archive")}</span>
                    </DropdownMenuItem>
                  )}
                  {activeList.status === "completed" && (
                    <>
                      <DropdownMenuItem onClick={() => reactivateList(activeList.id)} className="cursor-pointer gap-2 text-primary focus:text-primary">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t("shopping.reopenActive")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveList(activeList.id)} className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500">
                        <Archive className="w-3.5 h-3.5" />
                        <span>{t("shopping.archive")}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  {activeList.status === "archived" && (
                    <DropdownMenuItem onClick={() => unarchiveList(activeList.id)} className="cursor-pointer gap-2 text-primary focus:text-primary">
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      <span>{t("shopping.restoreActive")}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setConfirmDeleteListId(activeList.id)} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("shopping.delete")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* LISTS VIEW */}
        {view === "lists" && (
          <motion.div key="lists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4">
            {activeLists.length === 0 && completedLists.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-[13px]">{t("shopping.emptyState")}</p>
                <p className="text-muted-foreground text-[12px] mt-1">
                  {t("shopping.emptyStateHint")}
                </p>
              </div>
            )}

            {/* Listas Activas */}
            {activeLists.length > 0 && (
              <div className="mb-4">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 block">{t("shopping.sectionActive")}</label>
                {activeLists.map((list, i) => {
                  const total = getListTotal(list);
                  const checkedCount = list.items.filter(item => item.isChecked).length;
                  return (
                    <motion.div
                      key={list.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="mb-2"
                    >
                      <div className="w-full card-surface hover:border-border/80 transition-colors">
                        <div className="card-inner flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => { setActiveList(list); setView("detail"); }}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left py-1"
                          >
                            <div className="w-10 h-10 rounded-[12px] bg-primary/15 flex items-center justify-center shrink-0">
                              <ShoppingCart className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[14px] text-foreground font-medium block truncate">
                                {list.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground block">
                                {t("shopping.itemsChecked").replace("{items}", String(list.items.length)).replace("{checked}", String(checkedCount))}
                              </span>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono-data text-[14px] text-foreground mr-1">
                              {formatAmount(total)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 flex items-center justify-center transition-all active:scale-95"
                                  title={t("shopping.optionsTitle")}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => setRenamingList({ id: list.id, name: list.name })}
                                  className="cursor-pointer gap-2"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>{t("shopping.rename")}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => archiveList(list.id)}
                                  className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>{t("shopping.archive")}</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setConfirmDeleteListId(list.id)}
                                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{t("shopping.delete")}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Listas Completadas */}
            {completedLists.length > 0 && (
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 block">{t("shopping.sectionCompleted")}</label>
                {completedLists.map(list => {
                  const total = getListTotal(list);
                  return (
                    <div key={list.id} className="flex items-center justify-between py-3 border-b border-border/50">
                      <button
                        type="button"
                        onClick={() => { setActiveList(list); setView("detail"); }}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] text-muted-foreground block truncate">{list.name}</span>
                          <span className="text-[11px] text-muted-foreground/70 font-mono-data">
                            {formatAmount(total)}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 flex items-center justify-center transition-all active:scale-95"
                              title={t("shopping.optionsTitle")}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => reactivateList(list.id)} className="cursor-pointer gap-2 text-primary focus:text-primary">
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{t("shopping.reopenActive")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRenamingList({ id: list.id, name: list.name })} className="cursor-pointer gap-2">
                              <Pencil className="w-3.5 h-3.5" />
                              <span>{t("shopping.rename")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => archiveList(list.id)} className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500">
                              <Archive className="w-3.5 h-3.5" />
                              <span>{t("shopping.archive")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setConfirmDeleteListId(list.id)} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t("shopping.delete")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ARCHIVED VIEW (Idéntica a AccountManager / CategoryManager) */}
        {view === "archived" && (
          <motion.div key="archived" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            {archivedLists.length === 0 ? (
              <p className="text-muted-foreground text-[13px] text-center py-8">{t("shopping.noArchived")}</p>
            ) : (
              <div className="space-y-2">
                {archivedLists.map(list => {
                  const total = getListTotal(list);
                  return (
                    <div key={list.id} className="flex items-center justify-between p-3 rounded-[12px] bg-card border border-border/50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-[10px] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[14px] text-muted-foreground font-medium block truncate">{list.name}</span>
                          <span className="text-[11px] text-muted-foreground block">
                            {list.items.length} {t("shopping.summaryItems").toLowerCase()} · {formatAmount(total)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => unarchiveList(list.id)}
                          className="p-2 text-primary hover:text-primary/80 transition-colors"
                          title={t("shopping.restoreActive")}
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteListId(list.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          title={t("shopping.deletePermanent")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* CREATE VIEW */}
        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("shopping.listNameLabel")}</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder={t("shopping.listNameExample")}
              autoFocus
              className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:border-primary outline-none transition-colors mb-4"
              onKeyDown={e => e.key === "Enter" && handleCreateList()}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView("lists")}
                className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground font-medium text-[14px]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={!formName.trim()}
                className="flex-[2] h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {t("shopping.createList")}
              </button>
            </div>
          </motion.div>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && activeList && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* Summary card */}
            <div className="px-4 mb-4">
              <div className="card-surface">
                <div className="card-inner">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">{t("shopping.summaryItems")}</span>
                      <span className="font-mono-data text-[16px] text-foreground font-semibold">{activeList.items.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">{t("shopping.summaryChecked")}</span>
                      <span className="font-mono-data text-[16px] text-emerald-500 font-semibold">
                        {activeList.items.filter(i => i.isChecked).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">{t("shopping.summaryTotal")}</span>
                      <span className="font-mono-data text-[16px] text-foreground font-semibold">{formatAmount(getListTotal(activeList))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add item form */}
            <div className="px-4 mb-4">
              <div className="flex gap-2">
                <input
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder={t("shopping.itemNamePlaceholder")}
                  className="flex-1 h-10 px-3 rounded-[10px] bg-input border border-border text-foreground text-[13px] placeholder:text-muted-foreground focus:border-primary outline-none transition-colors"
                  onKeyDown={e => e.key === "Enter" && handleAddItem()}
                />
                <input
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("shopping.qty")}
                  className="w-14 h-10 px-2 rounded-[10px] bg-input border border-border text-foreground text-[13px] font-mono-data text-center focus:border-primary outline-none transition-colors"
                />
                <div className="w-24">
                  <MoneyInput
                    value={newItemPrice}
                    onChange={(val) => setNewItemPrice(val)}
                    placeholder={t("shopping.price")}
                    className="h-10 text-[13px] text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="h-10 w-10 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-[0.95] transition-all flex-shrink-0"
                  title={t("shopping.addItemTitle")}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="px-4">
              {activeList.items.length === 0 && (
                <div className="py-8 text-center bg-card/40 rounded-[12px] border border-border/30 mb-4">
                  <p className="text-muted-foreground text-[13px]">
                    {t("shopping.emptyList")}
                  </p>
                  <p className="text-muted-foreground/80 text-[11px] mt-1">
                    {t("shopping.emptyListHint")}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                {activeList.items.map(item => {
                  const itemTotal = item.quantity * item.unitPrice;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-[12px] transition-colors ${
                        item.isChecked ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-secondary/40 border border-border/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          item.isChecked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {item.isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div
                        onClick={() => setEditingItem({
                          id: item.id,
                          name: item.name,
                          quantity: item.quantity.toString(),
                          price: item.unitPrice > 0 ? item.unitPrice.toString() : "",
                        })}
                        className={`flex-1 min-w-0 cursor-pointer ${item.isChecked ? "opacity-50" : ""}`}
                        title={t("shopping.itemEditTitle")}
                      >
                        <span className={`text-[13px] text-foreground font-medium block truncate ${item.isChecked ? "line-through" : ""}`}>
                          {item.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.quantity} × {formatAmount(item.unitPrice)}
                        </span>
                      </div>

                      <span className={`font-mono-data text-[13px] ${item.isChecked ? "text-emerald-500" : "text-foreground"}`}>
                        {formatAmount(itemTotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditingItem({
                          id: item.id,
                          name: item.name,
                          quantity: item.quantity.toString(),
                          price: item.unitPrice > 0 ? item.unitPrice.toString() : "",
                        })}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        title={t("shopping.editItemTitle")}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        title={t("shopping.deleteItemTitle")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar - ALWAYS AVAILABLE (never hidden for empty lists) */}
            <div className="px-4 mt-6 pt-3 border-t border-border/40 flex items-center gap-2">
              {/* Botón Eliminar siempre disponible de forma discreta */}
              <button
                type="button"
                onClick={() => setConfirmDeleteListId(activeList.id)}
                className="h-11 w-11 rounded-[12px] bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-all active:scale-[0.98] shrink-0"
                title={t("shopping.deleteListTitle")}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {activeList.status === "active" && (
                <button
                  type="button"
                  onClick={openCheckout}
                  disabled={activeList.items.filter(i => i.isChecked).length === 0}
                  className="flex-1 h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40 inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="truncate">
                    {t("shopping.completeCheckout").replace("{total}", formatAmount(getCheckedTotal(activeList)))}
                  </span>
                </button>
              )}

              {activeList.status === "completed" && (
                <button
                  type="button"
                  onClick={() => reactivateList(activeList.id)}
                  className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground hover:bg-secondary/80 font-medium text-[14px] inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-primary" />
                  <span>{t("shopping.reactivate")}</span>
                </button>
              )}

              {activeList.status === "archived" && (
                <button
                  type="button"
                  onClick={() => unarchiveList(activeList.id)}
                  className="flex-1 h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  <span>{t("shopping.unarchive")}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* CHECKOUT VIEW */}
        {view === "checkout" && activeList && (
          <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
            {/* Summary */}
            <div className="card-surface mb-4">
              <div className="card-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-emerald-500/15 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] text-foreground font-medium block truncate">{activeList.name}</span>
                    <div className="text-[12px] text-muted-foreground">
                      {t("shopping.checkoutItemsChecked").replace("{count}", String(activeList.items.filter(i => i.isChecked).length))}
                    </div>
                  </div>
                  <span className="font-mono-data text-[18px] text-foreground font-semibold shrink-0">
                    {formatAmount(getCheckedTotal(activeList))}
                  </span>
                </div>
              </div>
            </div>

            {/* Account selector */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("shopping.checkoutAccount")}</label>
            <div className="space-y-1.5 mb-4">
              {sourceAccounts.map(acc => (
                <button
                  type="button"
                  key={acc.id}
                  onClick={() => setCheckoutAccountId(acc.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-[12px] transition-all text-left ${
                    checkoutAccountId === acc.id
                      ? "bg-secondary border border-primary/40 ring-1 ring-primary/20"
                      : "bg-secondary/40 border border-border/50 hover:bg-secondary/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${acc.color}`} />
                    <span className="text-[13px] font-medium text-foreground">{acc.name}</span>
                  </div>
                  <span className="font-mono-data text-[12px] text-muted-foreground">{formatAmount(acc.balance)}</span>
                </button>
              ))}
            </div>

            {/* Category selector */}
            <label className="text-[12px] text-muted-foreground font-medium mb-1.5 block">{t("common.category")}</label>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {expenseCategories.slice(0, 12).map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCheckoutCategoryId(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium transition-all ${
                    checkoutCategoryId === cat.id
                      ? "bg-secondary text-foreground ring-1 ring-primary/30"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <CategoryIcon name={cat.icon || "circle-dot"} className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Confirm */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView("detail")}
                className="flex-1 h-11 rounded-[12px] bg-secondary text-foreground font-medium text-[14px]"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={!checkoutAccountId || !checkoutCategoryId}
                className="flex-[2] h-11 rounded-[12px] bg-primary text-primary-foreground font-medium text-[14px] disabled:opacity-40 inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <DollarSign className="w-4 h-4" />
                {t("shopping.recordExpense")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete List Alert Dialog */}
      <AlertDialog open={!!confirmDeleteListId} onOpenChange={(open) => !open && setConfirmDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("shopping.deleteConfirmTitle").replace("\"{name}\"", listPendingDelete ? `"${listPendingDelete.name}"` : "")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("shopping.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("shopping.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename List Dialog */}
      <Dialog open={!!renamingList} onOpenChange={(open) => !open && setRenamingList(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("shopping.renameTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <input
              value={renamingList?.name || ""}
              onChange={(e) => setRenamingList(prev => prev ? { ...prev, name: e.target.value } : null)}
              placeholder={t("shopping.renameLabel")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRenameList()}
              className="w-full h-11 px-4 rounded-[12px] bg-input border border-border text-foreground text-[14px] focus:border-primary outline-none transition-colors"
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setRenamingList(null)}
              className="h-10 px-4 rounded-[10px] bg-secondary text-foreground text-[13px] font-medium hover:bg-secondary/80 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleRenameList}
              disabled={!renamingList?.name.trim()}
              className="h-10 px-4 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {t("common.save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("shopping.editItemTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <label className="text-[12px] text-muted-foreground font-medium mb-1 block">{t("common.name")}</label>
              <input
                value={editingItem?.name || ""}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder={t("shopping.itemNamePlaceholder")}
                autoFocus
                className="w-full h-10 px-3 rounded-[10px] bg-input border border-border text-foreground text-[13px] focus:border-primary outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-muted-foreground font-medium mb-1 block">{t("shopping.quantity")}</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editingItem?.quantity || "1"}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, quantity: e.target.value } : null)}
                  className="w-full h-10 px-3 rounded-[10px] bg-input border border-border text-foreground text-[13px] font-mono-data text-center focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground font-medium mb-1 block">{t("shopping.unitPrice")}</label>
                <MoneyInput
                  value={editingItem?.price || ""}
                  onChange={(val) => setEditingItem(prev => prev ? { ...prev, price: val } : null)}
                  placeholder={t("shopping.price")}
                  className="h-10 text-[13px] text-center"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="h-10 px-4 rounded-[10px] bg-secondary text-foreground text-[13px] font-medium hover:bg-secondary/80 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleUpdateItem}
              disabled={!editingItem?.name.trim()}
              className="h-10 px-4 rounded-[10px] bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {t("shopping.saveChanges")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
