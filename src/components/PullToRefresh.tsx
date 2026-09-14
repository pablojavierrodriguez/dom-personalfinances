import React, { useState, useRef, useCallback } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";
import { useSettings } from "@/lib/settings-store";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  maxPull?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = "w-full",
  threshold = 52,
  maxPull = 72,
}) => {
  const { t } = useSettings();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const hasVibratedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const currentDistanceRef = useRef(0);

  // Limpiar rAF pendiente al desmontar
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const isAtTop = useCallback(() => {
    if (typeof window === "undefined") return true;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const containerScrollTop = containerRef.current?.scrollTop || 0;
    return scrollY <= 0 && containerScrollTop <= 0;
  }, []);

  const triggerHapticFeedback = useCallback(() => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(15);
      }
    } catch {
      // Ignorar de forma segura si no está soportado o bloqueado por política del navegador
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (isAtTop()) {
      startYRef.current = e.touches[0].clientY;
      hasVibratedRef.current = false;
    } else {
      startYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;

    if (delta > 0 && isAtTop()) {
      // Resistencia elástica logarítmica progresiva throttled por rAF para el re-render
      const elasticDistance = Math.min(maxPull, Math.pow(delta, 0.85) * 1.8);
      currentDistanceRef.current = elasticDistance;

      if (elasticDistance >= threshold) {
        if (!hasVibratedRef.current) {
          triggerHapticFeedback();
          hasVibratedRef.current = true;
        }
      } else {
        hasVibratedRef.current = false;
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        setPullDistance(elasticDistance);
      });
    } else {
      if (currentDistanceRef.current > 0) {
        currentDistanceRef.current = 0;
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          setPullDistance(0);
        });
      }
    }
  };

  const handleTouchEnd = async () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (startYRef.current === null || isRefreshing) return;

    if (currentDistanceRef.current >= threshold) {
      setIsRefreshing(true);
      currentDistanceRef.current = threshold;
      setPullDistance(threshold);

      try {
        await onRefresh();
      } catch (err) {
        console.error("Error refreshing data:", err);
      } finally {
        setIsRefreshing(false);
        currentDistanceRef.current = 0;
        setPullDistance(0);
        startYRef.current = null;
        hasVibratedRef.current = false;
      }
    } else {
      currentDistanceRef.current = 0;
      setPullDistance(0);
      startYRef.current = null;
      hasVibratedRef.current = false;
    }
  };

  const isReadyToRelease = pullDistance >= threshold && !isRefreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        if (!isRefreshing) {
          setPullDistance(0);
          startYRef.current = null;
        }
      }}
      className={`relative ${className}`}
    >
      {/* Indicador visual de arrastre / refresco */}
      <div
        aria-hidden={pullDistance === 0 && !isRefreshing}
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
        }}
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-150 ease-out pointer-events-none"
      >
        <div className="py-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/95 border border-border shadow-md backdrop-blur text-[12px] font-medium text-foreground">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>{t("common.refreshing")}</span>
              </>
            ) : isReadyToRelease ? (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-primary rotate-180 transition-transform duration-200" />
                <span>{t("common.releaseToRefresh")}</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200" />
                <span>{t("common.pullToRefresh")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};
