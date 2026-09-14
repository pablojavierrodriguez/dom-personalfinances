import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  GripVertical, RotateCcw, SlidersHorizontal, Search,
  Wallet, Zap, Target, Bell, Shield, TrendingUp, Clock,
  PiggyBank, LayoutGrid, ChevronUp, ChevronDown, Sparkles
} from "lucide-react";
import { useSettings, type HomeSection, type CardCategory } from "@/lib/settings-store";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DashboardCardPickerProps {
  open: boolean;
  onClose: () => void;
}

interface CardMeta {
  id: string;
  icon: React.ElementType;
  badgeColor: string;
  previewType: "velocity" | "balance" | "accounts" | "net_worth" | "breakdown" | "monthly_comparison" | "budgets" | "goals" | "bills" | "health_score" | "recent";
  descriptionEs: string;
  descriptionEn: string;
}

const CARD_METAS: Record<string, CardMeta> = {
  velocity: {
    id: "velocity",
    icon: Zap,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    previewType: "velocity",
    descriptionEs: "Barra de consumo y ritmo del presupuesto diario en tiempo real",
    descriptionEn: "Daily budget spending speed and real-time pace progress bar",
  },
  balance: {
    id: "balance",
    icon: Wallet,
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    previewType: "balance",
    descriptionEs: "Saldo total consolidado multimoneda con selector y desglose de mes",
    descriptionEn: "Consolidated multi-currency total balance with monthly breakdown",
  },
  accounts: {
    id: "accounts",
    icon: LayoutGrid,
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    previewType: "accounts",
    descriptionEs: "Cuentas bancarias, billeteras virtuales y tarjetas de crédito",
    descriptionEn: "Bank accounts, crypto/wallets and credit cards",
  },
  net_worth: {
    id: "net_worth",
    icon: TrendingUp,
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    previewType: "net_worth",
    descriptionEs: "Curva histórica de patrimonio neto a 30 o 90 días con variación neta",
    descriptionEn: "Historical net worth progression curve (30D/90D) with delta",
  },
  breakdown: {
    id: "breakdown",
    icon: LayoutGrid,
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    previewType: "breakdown",
    descriptionEs: "Gráfico de torta/dona interactivo y ranking de gastos por categoría",
    descriptionEn: "Interactive donut/pie chart and category spending distribution",
  },
  monthly_comparison: {
    id: "monthly_comparison",
    icon: Sparkles,
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    previewType: "monthly_comparison",
    descriptionEs: "Comparativa de gasto contra el mes anterior con delta porcentual",
    descriptionEn: "Spending comparison vs previous month with percentage delta",
  },
  budgets: {
    id: "budgets",
    icon: PiggyBank,
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    previewType: "budgets",
    descriptionEs: "Resumen de presupuestos activos con barras de consumo mensual",
    descriptionEn: "Active budget summaries with monthly consumption progress bars",
  },
  goals: {
    id: "goals",
    icon: Target,
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    previewType: "goals",
    descriptionEs: "Metas de ahorro en curso con porcentaje de cumplimiento hacia el objetivo",
    descriptionEn: "Ongoing savings goals progress tracking towards your target",
  },
  bills: {
    id: "bills",
    icon: Bell,
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    previewType: "bills",
    descriptionEs: "Próximos vencimientos de servicios, suscripciones y tarjetas",
    descriptionEn: "Upcoming due dates for services, subscriptions and card statements",
  },
  health_score: {
    id: "health_score",
    icon: Shield,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    previewType: "health_score",
    descriptionEs: "Score integral de salud financiera (0-100) según ahorro y deudas",
    descriptionEn: "Comprehensive financial health score (0-100) based on savings and debts",
  },
  recent: {
    id: "recent",
    icon: Clock,
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    previewType: "recent",
    descriptionEs: "Últimas 5 transacciones registradas con acceso a edición rápida",
    descriptionEn: "Last 5 recorded transactions with quick edit and swipe gestures",
  },
};

/** Mini ilustración vectorial para previsualizar el widget */
function WidgetPreviewGraphic({
  type,
  t,
}: {
  type: CardMeta["previewType"];
  t: (key: any) => string;
}) {
  switch (type) {
    case "velocity":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 p-2 flex flex-col justify-center gap-1">
          <div className="flex justify-between items-center text-[8px] text-muted-foreground">
            <span>{t("picker.preview.spentToday")}</span>
            <span className="font-mono-data">$4.500 / $15.000</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="w-1/3 h-full bg-primary rounded-full" />
          </div>
        </div>
      );
    case "balance":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 px-2 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[7px] text-muted-foreground">{t("picker.preview.totalBalance")}</span>
            <span className="text-[11px] font-mono-data font-bold text-foreground">$1.840.500</span>
          </div>
          <div className="flex gap-1">
            <span className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary font-mono">ARS</span>
            <span className="text-[8px] px-1 py-0.5 rounded bg-secondary text-muted-foreground font-mono">USD</span>
          </div>
        </div>
      );
    case "net_worth":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 p-1.5 flex items-end justify-between gap-1 overflow-hidden relative">
          <svg className="w-full h-full text-cyan-400/30" viewBox="0 0 100 25" preserveAspectRatio="none">
            <path d="M0,20 Q20,18 40,12 T80,8 T100,2 L100,25 L0,25 Z" fill="currentColor" />
            <path d="M0,20 Q20,18 40,12 T80,8 T100,2" fill="none" stroke="#22d3ee" strokeWidth="2" />
          </svg>
          <span className="absolute top-1 right-2 text-[8px] font-mono text-cyan-400 font-semibold">+8.4%</span>
        </div>
      );
    case "monthly_comparison":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 px-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Sparkles className="w-2.5 h-2.5 text-primary" />
            <span>{t("picker.preview.vsLastMonth")}</span>
          </div>
          <span className="text-[9px] font-mono-data font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">
            -12%
          </span>
        </div>
      );
    case "breakdown":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 p-1 flex items-center justify-between px-3">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="0" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-30" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="-55" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-75" />
            </svg>
            <div className="absolute w-2.5 h-2.5 rounded-full bg-card" />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] text-muted-foreground">{t("picker.preview.distribution")}</span>
            <span className="text-[10px] font-mono-data font-semibold text-foreground">{t("picker.preview.topExpenses")}</span>
          </div>
        </div>
      );
    case "budgets":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 p-1.5 flex flex-col justify-center gap-1">
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>{t("picker.preview.grocery")}</span>
            <span className="font-mono-data text-emerald-400">62%</span>
          </div>
          <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div className="w-[62%] h-full bg-emerald-500 rounded-full" />
          </div>
        </div>
      );
    case "goals":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 p-1.5 flex flex-col justify-center gap-1">
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>{t("picker.preview.emergencyFund")}</span>
            <span className="font-mono-data text-teal-400">85%</span>
          </div>
          <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div className="w-[85%] h-full bg-teal-500 rounded-full" />
          </div>
        </div>
      );
    case "bills":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 px-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[9px] text-foreground truncate">{t("picker.preview.utilities")}</span>
          </div>
          <span className="text-[8px] font-mono text-muted-foreground">{t("picker.preview.in3d")}</span>
        </div>
      );
    case "health_score":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 px-2 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground">{t("picker.preview.financialHealth")}</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-primary font-mono">82</span>
            <span className="text-[9px]">💪</span>
          </div>
        </div>
      );
    case "accounts":
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 px-2 flex items-center gap-1.5">
          <div className="w-5 h-4 rounded bg-primary/20 border border-primary/30" />
          <div className="w-5 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
          <div className="w-5 h-4 rounded bg-secondary border border-border" />
          <span className="text-[8px] text-muted-foreground font-mono ml-auto">{t("picker.preview.accountsCount")}</span>
        </div>
      );
    case "recent":
    default:
      return (
        <div className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 px-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[9px] text-foreground truncate">{t("picker.preview.coffeeSnacks")}</span>
          </div>
          <span className="text-[8px] font-mono text-muted-foreground">-$3.200</span>
        </div>
      );
  }
}

/**
 * Encuentra el ancestro con scroll más cercano para compensar offsets y auto-scroll
 */
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function DashboardCardPicker({ open, onClose }: DashboardCardPickerProps) {
  const {
    settings,
    reorderHomeSections,
    toggleHomeSection,
    resetHomeSections,
    t,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<"organize" | "catalog">("organize");
  const [selectedCategory, setSelectedCategory] = useState<CardCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sectionsFromSettings = settings.homeSections || [];
  const [localSections, setLocalSections] = useState<HomeSection[]>(sectionsFromSettings);
  const localSectionsRef = useRef<HomeSection[]>(localSections);

  useEffect(() => {
    setLocalSections(sectionsFromSettings);
    localSectionsRef.current = sectionsFromSettings;
  }, [settings.homeSections]);

  const enabledCount = useMemo(() => localSections.filter(s => s.enabled).length, [localSections]);

  // =========================================================================
  // SISTEMA DE DRAG & DROP NATIVO DE ALTA PRECISIÓN (120 FPS / CERO JANK)
  // =========================================================================
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startIndex: number;
    currentOverIndex: number;
    activeId: string | null;
    offsetY: number;
    itemHeight: number;
  }>({
    isDragging: false,
    startIndex: -1,
    currentOverIndex: -1,
    activeId: null,
    offsetY: 0,
    itemHeight: 68,
  });

  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number>(0);
  const initialScrollTopRef = useRef<number>(0);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const lastClientYRef = useRef<number>(0);

  // Auto-scroll fluido al arrastrar cerca de los bordes
  const checkAutoScroll = useCallback(() => {
    const scrollEl = scrollParentRef.current;
    if (!scrollEl || dragPointerIdRef.current === null) return;

    const rect = scrollEl.getBoundingClientRect();
    const clientY = lastClientYRef.current;
    const topZone = rect.top + 60;
    const bottomZone = rect.bottom - 60;

    let scrollSpeed = 0;
    if (clientY < topZone && scrollEl.scrollTop > 0) {
      const factor = Math.max(0, (topZone - clientY) / 60);
      scrollSpeed = -Math.round(factor * 12);
    } else if (clientY > bottomZone && scrollEl.scrollTop < scrollEl.scrollHeight - scrollEl.clientHeight) {
      const factor = Math.max(0, (clientY - bottomZone) / 60);
      scrollSpeed = Math.round(factor * 12);
    }

    if (scrollSpeed !== 0) {
      scrollEl.scrollTop += scrollSpeed;
      // Actualizar offset compensando el delta de scroll
      const currentScrollDiff = scrollEl.scrollTop - initialScrollTopRef.current;
      const totalDelta = (clientY - dragStartYRef.current) + currentScrollDiff;

      setDragState(prev => {
        if (!prev.isDragging) return prev;
        const targetOffset = Math.round(totalDelta / prev.itemHeight);
        const newOverIndex = Math.max(0, Math.min(localSectionsRef.current.length - 1, prev.startIndex + targetOffset));
        return {
          ...prev,
          offsetY: totalDelta,
          currentOverIndex: newOverIndex,
        };
      });
    }

    autoScrollRafRef.current = requestAnimationFrame(checkAutoScroll);
  }, []);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
    sectionId: string
  ) => {
    // Solo botón principal / toque
    if (e.button !== 0) return;

    const currentTarget = e.currentTarget;
    const itemEl = itemRefs.current[index];
    const itemHeight = itemEl ? itemEl.getBoundingClientRect().height + 8 : 68; // 8px de gap-2

    const scrollEl = getScrollParent(currentTarget);
    scrollParentRef.current = scrollEl;
    initialScrollTopRef.current = scrollEl ? scrollEl.scrollTop : 0;
    dragStartYRef.current = e.clientY;
    lastClientYRef.current = e.clientY;
    dragPointerIdRef.current = e.pointerId;

    try {
      currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    // Háptico inicial al tomar la tarjeta
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch {}

    // Prevenir selección de texto accidental
    document.body.style.userSelect = "none";
    (document.body.style as any).webkitUserSelect = "none";

    setDragState({
      isDragging: true,
      startIndex: index,
      currentOverIndex: index,
      activeId: sectionId,
      offsetY: 0,
      itemHeight,
    });

    autoScrollRafRef.current = requestAnimationFrame(checkAutoScroll);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== e.pointerId) return;

    lastClientYRef.current = e.clientY;
    const scrollEl = scrollParentRef.current;
    const currentScrollDiff = scrollEl ? (scrollEl.scrollTop - initialScrollTopRef.current) : 0;
    const totalDelta = (e.clientY - dragStartYRef.current) + currentScrollDiff;

    setDragState(prev => {
      if (!prev.isDragging) return prev;
      const targetOffset = Math.round(totalDelta / prev.itemHeight);
      const newOverIndex = Math.max(0, Math.min(localSectionsRef.current.length - 1, prev.startIndex + targetOffset));

      // Si cambió de posición relativa, micro-háptico sutil
      if (newOverIndex !== prev.currentOverIndex) {
        try {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(6);
          }
        } catch {}
      }

      return {
        ...prev,
        offsetY: totalDelta,
        currentOverIndex: newOverIndex,
      };
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== e.pointerId) return;

    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    dragPointerIdRef.current = null;
    document.body.style.userSelect = "";
    (document.body.style as any).webkitUserSelect = "";

    // Aplicar el reordenamiento definitivo si cambió de posición
    const { startIndex, currentOverIndex, isDragging } = dragState;

    if (isDragging && startIndex !== -1 && currentOverIndex !== -1 && startIndex !== currentOverIndex) {
      const updated = [...localSectionsRef.current];
      const [movedItem] = updated.splice(startIndex, 1);
      updated.splice(currentOverIndex, 0, movedItem);

      setLocalSections(updated);
      localSectionsRef.current = updated;
      reorderHomeSections(updated);

      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
      } catch {}
    }

    setDragState({
      isDragging: false,
      startIndex: -1,
      currentOverIndex: -1,
      activeId: null,
      offsetY: 0,
      itemHeight: 68,
    });
  };

  // Movimiento directo y accesible por botones (Subir / Bajar)
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localSections.length) return;

    const updated = [...localSections];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setLocalSections(updated);
    localSectionsRef.current = updated;
    reorderHomeSections(updated);

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {}
  };

  const handleDone = () => {
    reorderHomeSections(localSectionsRef.current);
    onClose();
  };

  // Filtrado de catálogo
  const filteredCatalog = useMemo(() => {
    return localSections.filter(section => {
      const meta = CARD_METAS[section.id];
      const matchesCat = selectedCategory === "all" || section.category === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const label = t(section.labelKey).toLowerCase();
      const desc = settings.language === "es" ? meta?.descriptionEs : meta?.descriptionEn;
      return label.includes(q) || (desc && desc.toLowerCase().includes(q));
    });
  }, [localSections, selectedCategory, searchQuery, t, settings.language]);

  const categories: { id: CardCategory | "all"; label: string }[] = [
    { id: "all", label: t("picker.catAll") || "Todas" },
    { id: "finances", label: t("picker.catFinances") || "Finanzas" },
    { id: "analytics", label: t("picker.catAnalytics") || "Análisis" },
    { id: "planning", label: t("picker.catPlanning") || "Planificación" },
    { id: "operations", label: t("picker.catOperations") || "Operaciones" },
  ];

  return (
    <ResponsiveSheet
      open={open}
      onClose={handleDone}
      title={
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span>{t("picker.title") || "Personalizar Dashboard"}</span>
        </div>
      }
      titleRight={
        <button
          onClick={handleDone}
          className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95"
        >
          {t("picker.done") || "Listo"}
        </button>
      }
    >
      <div className="px-4 sm:px-5 pt-3 pb-6 space-y-4">
        {/* Subtítulo descriptivo y contador de widgets activos */}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground pb-1">
          <span className="truncate">{t("picker.subtitle") || "Organizá tus widgets, gráficos y métricas favoritas"}</span>
          <span className="font-mono px-2.5 py-1 rounded-full bg-secondary/80 text-foreground font-semibold text-[11px] whitespace-nowrap shrink-0">
            {enabledCount}/{localSections.length} {t("picker.activeCount") || "activas"}
          </span>
        </div>

        {/* Tab switcher: Organizar vs Explorar Catálogo */}
        <div className="flex rounded-xl bg-secondary/50 p-1 border border-border/30">
          <button
            type="button"
            onClick={() => setActiveTab("organize")}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 active:scale-98",
              activeTab === "organize"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GripVertical className="w-3.5 h-3.5 text-primary" />
            {t("picker.tabOrganize") || "Organizar"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 active:scale-98",
              activeTab === "catalog"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-primary" />
            {t("picker.tabExplore") || "Catálogo"}
          </button>
        </div>

        {/* ======================= PESTAÑA: ORGANIZAR ======================= */}
        {activeTab === "organize" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>{t("picker.dragHint") || "Arrastrá desde la manija para ordenar o usá las flechas"}</span>
              <button
                type="button"
                onClick={resetHomeSections}
                className="flex items-center gap-1 text-primary hover:underline transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                {t("picker.resetDefault") || "Restablecer sugerido"}
              </button>
            </div>

            {/* Lista ultra-optimizada sin jank ni bloqueos de scroll */}
            <div
              ref={listContainerRef}
              className="space-y-2 relative touch-pan-y"
              style={{ touchAction: "pan-y" }}
            >
              {localSections.map((section, index) => {
                const meta = CARD_METAS[section.id];
                const IconComponent = meta?.icon || LayoutGrid;
                const isItemDragging = dragState.isDragging && dragState.activeId === section.id;

                // Cálculo de desplazamiento visual para las tarjetas que no se arrastran
                let visualTranslateY = 0;
                if (dragState.isDragging && !isItemDragging) {
                  const { startIndex, currentOverIndex, itemHeight } = dragState;
                  if (startIndex < currentOverIndex) {
                    // Arrastrando hacia abajo: los ítems intermedios se mueven hacia arriba
                    if (index > startIndex && index <= currentOverIndex) {
                      visualTranslateY = -itemHeight;
                    }
                  } else if (startIndex > currentOverIndex) {
                    // Arrastrando hacia arriba: los ítems intermedios se mueven hacia abajo
                    if (index < startIndex && index >= currentOverIndex) {
                      visualTranslateY = itemHeight;
                    }
                  }
                }

                return (
                  <div
                    key={section.id}
                    ref={el => (itemRefs.current[index] = el)}
                    style={{
                      transform: isItemDragging
                        ? `translate3d(0, ${dragState.offsetY}px, 0) scale(1.025)`
                        : visualTranslateY !== 0
                        ? `translate3d(0, ${visualTranslateY}px, 0)`
                        : "translate3d(0, 0, 0)",
                      transition: isItemDragging
                        ? "box-shadow 150ms ease, border-color 150ms ease"
                        : "transform 220ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms ease",
                      zIndex: isItemDragging ? 40 : 1,
                      position: "relative",
                      touchAction: "pan-y",
                    }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border select-none bg-card/95 backdrop-blur-sm",
                      isItemDragging
                        ? "shadow-2xl border-primary/80 ring-2 ring-primary/20 bg-card cursor-grabbing"
                        : section.enabled
                        ? "border-border/60 hover:border-primary/40 shadow-xs"
                        : "border-border/30 opacity-50 bg-secondary/20"
                    )}
                  >
                    {/* Drag Handle & Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Manija con touchAction: none para captura exclusiva y setPointerCapture */}
                      <div
                        onPointerDown={e => handlePointerDown(e, index, section.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        style={{ touchAction: "none" }}
                        className={cn(
                          "cursor-grab active:cursor-grabbing p-2.5 -ml-1 text-muted-foreground/60 hover:text-primary active:text-primary transition-colors touch-none select-none shrink-0 rounded-lg hover:bg-secondary/50",
                          isItemDragging && "text-primary cursor-grabbing"
                        )}
                        title={t("picker.dragToMove") || "Arrastrar para mover"}
                        aria-label={t("picker.dragToMove") || "Arrastrar para mover"}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center shrink-0", meta?.badgeColor)}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-semibold text-foreground truncate font-display">
                          {t(section.labelKey)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {settings.language === "es" ? meta?.descriptionEs : meta?.descriptionEn}
                        </span>
                      </div>
                    </div>

                    {/* Controles: Flechas de mover arriba/abajo accesibles + Switch */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0 || dragState.isDragging}
                          aria-label={t("picker.moveUp") || "Subir"}
                          className="w-5 h-5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-20 transition-all active:scale-90"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, "down")}
                          disabled={index === localSections.length - 1 || dragState.isDragging}
                          aria-label={t("picker.moveDown") || "Bajar"}
                          className="w-5 h-5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-20 transition-all active:scale-90"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Switch
                        checked={section.enabled}
                        onCheckedChange={() => toggleHomeSection(section.id)}
                        aria-label={t(section.labelKey)}
                        disabled={dragState.isDragging}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================= PESTAÑA: CATÁLOGO ======================= */}
        {activeTab === "catalog" && (
          <div className="space-y-3.5">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("picker.search") || "Buscar tarjetas o widgets..."}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary/40 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Categorías (Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 border",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid de Cards con mini-previews visuales */}
            {filteredCatalog.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                {t("picker.noResults") || "No se encontraron widgets para esta búsqueda"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {filteredCatalog.map(section => {
                  const meta = CARD_METAS[section.id];
                  const IconComponent = meta?.icon || LayoutGrid;

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all relative overflow-hidden",
                        section.enabled
                          ? "bg-card/90 border-border/70 shadow-xs"
                          : "bg-secondary/20 border-border/30 opacity-75"
                      )}
                    >
                      {/* Cabecera de la card del catálogo */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center shrink-0", meta?.badgeColor)}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-foreground block truncate font-display">
                              {t(section.labelKey)}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {section.category}
                            </span>
                          </div>
                        </div>

                        <Switch
                          checked={section.enabled}
                          onCheckedChange={() => toggleHomeSection(section.id)}
                        />
                      </div>

                      {/* Mini preview gráfica del contenido del widget */}
                      <div className="w-full">
                        {meta && <WidgetPreviewGraphic type={meta.previewType} t={t} />}
                      </div>

                      {/* Descripción y badge de layout */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px]">
                        <span className="text-muted-foreground/80 line-clamp-1 flex-1 pr-2">
                          {settings.language === "es" ? meta?.descriptionEs : meta?.descriptionEn}
                        </span>
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground font-mono text-[9px]">
                          {section.column === "left" ? (t("picker.sizeFull") || "Col 1") : (t("picker.sizeCompact") || "Col 2")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
