import React from "react";
import { DOMSymbol, DOMSymbolProps } from "./DOMSymbol";

export interface DOMLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "symbol" | "wordmark";
  symbolVariant?: DOMSymbolProps["variant"];
  showTagline?: boolean;
  taglineText?: string;
  taglinePosition?: "bottom" | "inline";
  className?: string;
  textClassName?: string;
}

const SIZE_CONFIG = {
  sm: {
    symbolSize: 22,
    textSize: "text-sm",
    taglineSize: "text-[10.5px]",
    gap: "gap-2",
  },
  md: {
    symbolSize: 28,
    textSize: "text-base",
    taglineSize: "text-xs",
    gap: "gap-2.5",
  },
  lg: {
    symbolSize: 36,
    textSize: "text-xl",
    taglineSize: "text-sm",
    gap: "gap-3",
  },
  xl: {
    symbolSize: 44,
    textSize: "text-2xl",
    taglineSize: "text-sm",
    gap: "gap-3.5",
  },
};

export function DOMLogo({
  size = "md",
  variant = "full",
  symbolVariant = "default",
  showTagline = false,
  taglineText = "El dominio no se conquista. Se administra.",
  taglinePosition = "bottom",
  className = "",
  textClassName = "",
}: DOMLogoProps) {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  if (variant === "symbol") {
    return (
      <div role="img" aria-label="DOM" className={`inline-flex items-center ${className}`}>
        <DOMSymbol
          size={config.symbolSize}
          variant={symbolVariant}
        />
      </div>
    );
  }

  if (variant === "wordmark") {
    if (taglinePosition === "inline") {
      return (
        <div className={`flex items-baseline min-w-0 ${className}`}>
          <span
            className={`font-brand font-bold text-foreground uppercase leading-none tracking-[0.14em] select-none shrink-0 ${config.textSize} ${textClassName}`}
          >
            DOM
          </span>
          {showTagline && (
            <>
              <span className="mx-1.5 text-muted-foreground/40 select-none text-[11px] font-brand leading-none shrink-0 -translate-y-[1px]">
                ·
              </span>
              <span
                className={`font-brand text-muted-foreground/75 select-none font-medium leading-none tracking-[0.01em] truncate ${config.taglineSize}`}
              >
                {taglineText}
              </span>
            </>
          )}
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${className}`}>
        <span
          className={`font-brand font-bold text-foreground uppercase tracking-[0.14em] select-none ${config.textSize} ${textClassName}`}
        >
          DOM
        </span>
        {showTagline && (
          <span
            className={`font-brand text-muted-foreground/75 uppercase tracking-wider select-none font-medium mt-0.5 ${config.taglineSize}`}
          >
            {taglineText}
          </span>
        )}
      </div>
    );
  }

  // Variant === "full"
  if (taglinePosition === "inline") {
    return (
      <div className={`inline-flex items-center min-w-0 ${config.gap} ${className}`}>
        <DOMSymbol
          size={config.symbolSize}
          variant={symbolVariant}
        />
        <div className="flex items-baseline min-w-0">
          <span
            className={`font-brand font-bold text-foreground uppercase leading-none select-none tracking-[0.14em] shrink-0 ${config.textSize} ${textClassName}`}
          >
            DOM
          </span>
          {showTagline && (
            <>
              <span className="mx-1.5 text-muted-foreground/40 select-none text-[11px] font-brand leading-none shrink-0 -translate-y-[1px]">
                ·
              </span>
              <span
                className={`font-brand text-muted-foreground/75 select-none font-medium leading-none tracking-[0.01em] truncate ${config.taglineSize}`}
              >
                {taglineText}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <DOMSymbol
        size={config.symbolSize}
        variant={symbolVariant}
      />
      <div className="flex flex-col justify-center">
        <span
          className={`font-brand font-bold text-foreground uppercase leading-none select-none tracking-[0.14em] ${config.textSize} ${textClassName}`}
        >
          DOM
        </span>
        {showTagline && (
          <span
            className={`text-muted-foreground/75 uppercase tracking-wider select-none font-medium mt-1 ${config.taglineSize}`}
          >
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
}
