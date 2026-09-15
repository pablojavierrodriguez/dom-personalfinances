import React from "react";

export interface DOMSymbolProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  variant?: "default" | "emerald" | "gold" | "monochrome" | "badge";
  className?: string;
  idSuffix?: string;
}

const SIZE_MAP = { xs: 16, sm: 24, md: 32, lg: 40, xl: 48 };

/**
 * DOMSymbol — "SIGIL"
 *
 * D cuyo contraforme interior es un círculo perfecto centrado en el canvas.
 * Evoca: moneda, sello de poder, esfera de dominio. Muros uniformes 99px.
 *
 * ViewBox 512×512. Geometría:
 *   Outer D : M107,87 → L256,87 → A169 (CW) → L107,425 → Q corners → Z
 *   Circle  : center=(256,256), r=70  → crea el agujero via fill-rule="evenodd"
 *
 * Sincronizado con scripts/generate-brand-assets.cjs y public/icons/*.png
 */
export function DOMSymbol({
  size = "md",
  variant = "default",
  className = "",
  idSuffix = "",
}: DOMSymbolProps) {
  const reactId = React.useId().replace(/[:]/g, "");
  const uid = idSuffix || reactId;
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 32;
  const gradId   = `dg-${uid}`;
  const bgId     = `db-${uid}`;

  const isGold  = variant === "gold";
  const isMono  = variant === "monochrome";
  const isBadge = variant === "badge";

  const gradStops = isGold ? (
    <>
      <stop offset="0%"   stopColor="#dfc7a2" />
      <stop offset="50%"  stopColor="#c4a77d" />
      <stop offset="100%" stopColor="#9e8354" />
    </>
  ) : (
    <>
      <stop offset="0%"   stopColor="#34f5a2" />
      <stop offset="35%"  stopColor="#10b981" />
      <stop offset="75%"  stopColor="#059669" />
      <stop offset="100%" stopColor="#0284c7" />
    </>
  );

  const glyphFill = isMono ? "currentColor" : `url(#${gradId})`;

  // Path del glifo SIGIL (reutilizado en todas las variantes)
  // Outer D + círculo interior (evenodd → agujero automático)
  const sigilPath =
    "M107,87 L256,87 A169,169 0 0,1 256,425 L107,425 Q87,425 87,405 L87,107 Q87,87 107,87 Z " +
    "M326,256 A70,70 0 1,0 186,256 A70,70 0 1,0 326,256 Z";

  // ── "badge": squircle OLED + glifo (réplica del ícono PWA) ──────────────────
  if (isBadge) {
    return (
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0d1017" />
            <stop offset="100%" stopColor="#06070a" />
          </linearGradient>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradStops}
          </linearGradient>
        </defs>
        {/* Fondo squircle carbón OLED */}
        <rect
          width="512" height="512" rx="114"
          fill={`url(#${bgId})`}
          stroke="rgba(16,185,129,0.18)" strokeWidth="2"
        />
        {/* SIGIL */}
        <path fillRule="evenodd" fill={`url(#${gradId})`} d={sigilPath} />
      </svg>
    );
  }

  // ── Variantes "default" / "emerald" / "gold" / "monochrome" ─────────────────
  // Sin fondo: el glifo flota sobre el background de la app
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {gradStops}
        </linearGradient>
      </defs>
      <path fillRule="evenodd" fill={glyphFill} d={sigilPath} />
    </svg>
  );
}
