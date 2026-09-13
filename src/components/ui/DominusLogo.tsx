import React from "react";
import { DominusSymbol, DominusSymbolProps } from "./DominusSymbol";

export interface DominusLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "symbol" | "wordmark";
  symbolVariant?: DominusSymbolProps["variant"];
  showTagline?: boolean;
  taglineText?: string;
  className?: string;
  textClassName?: string;
}

const SIZE_CONFIG = {
  sm: {
    symbolSize: 22,
    textSize: "text-sm",
    taglineSize: "text-[9px]",
    gap: "gap-2",
  },
  md: {
    symbolSize: 28,
    textSize: "text-base",
    taglineSize: "text-[10px]",
    gap: "gap-2.5",
  },
  lg: {
    symbolSize: 36,
    textSize: "text-xl",
    taglineSize: "text-xs",
    gap: "gap-3",
  },
  xl: {
    symbolSize: 44,
    textSize: "text-2xl",
    taglineSize: "text-xs",
    gap: "gap-3.5",
  },
};

export function DominusLogo({
  size = "md",
  variant = "full",
  symbolVariant = "default",
  showTagline = false,
  taglineText = "El dominio no se conquista. Se administra.",
  className = "",
  textClassName = "",
}: DominusLogoProps) {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  if (variant === "symbol") {
    return (
      <div role="img" aria-label="DOM" className={`inline-flex items-center ${className}`}>
        <DominusSymbol
          size={config.symbolSize}
          variant={symbolVariant}
        />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`flex flex-col ${className}`}>
        <span
          className={`font-brand font-bold text-foreground uppercase select-none ${config.textSize} ${textClassName}`}
        >
          DOM
        </span>
        {showTagline && (
          <span
            className={`text-muted-foreground tracking-tight select-none mt-0.5 ${config.taglineSize}`}
          >
            {taglineText}
          </span>
        )}
      </div>
    );
  }

  // Variant === "full"
  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <DominusSymbol
        size={config.symbolSize}
        variant={symbolVariant}
      />
      <div className="flex flex-col justify-center">
        <span
          className={`font-brand font-bold text-foreground uppercase leading-none select-none ${config.textSize} ${textClassName}`}
        >
          DOM
        </span>
        {showTagline && (
          <span
            className={`text-muted-foreground tracking-tight select-none mt-1 ${config.taglineSize}`}
          >
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
}
