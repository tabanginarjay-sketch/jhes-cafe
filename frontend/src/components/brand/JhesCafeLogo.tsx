"use client";

import React from "react";

interface JhesCafeLogoProps {
  variant?: "horizontal" | "vertical" | "emblem" | "footer";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showSubtitle?: boolean;
}

export function JhesCafeLogo({
  variant = "horizontal",
  size = "md",
  className = "",
  showSubtitle = true,
}: JhesCafeLogoProps) {
  // Dimension mappings
  const emblemSizes = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl sm:text-5xl",
  };

  const subtitleSizes = {
    sm: "text-[8px] tracking-[0.2em]",
    md: "text-[9px] tracking-[0.25em]",
    lg: "text-[11px] tracking-[0.28em]",
    xl: "text-xs tracking-[0.3em]",
  };

  const isDarkBg = variant === "footer";

  return (
    <div
      className={`inline-flex items-center transition-transform duration-300 ${
        variant === "vertical" ? "flex-col text-center gap-3" : "flex-row gap-3.5"
      } ${className}`}
    >
      {/* Aesthetic Circular Emblem Seal */}
      <div
        className={`relative shrink-0 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
          emblemSizes[size]
        } ${
          isDarkBg
            ? "bg-[#315640] text-[#C9AE8B] shadow-inner"
            : "bg-[#173D2B] text-[#C9AE8B] shadow-md shadow-[#173D2B]/10"
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Outer Concentric Ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#C9AE8B"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            opacity="0.8"
          />
          {/* Solid Inner Ring */}
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="#C9AE8B"
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* Botanical Coffee Branch Accents */}
          {/* Left Branch */}
          <path
            d="M26 50C26 43 32 38 38 41M27 48C29 44 34 44 36 47"
            stroke="#C9AE8B"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Right Branch */}
          <path
            d="M74 50C74 43 68 38 62 41M73 48C71 44 66 44 64 47"
            stroke="#C9AE8B"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Minimalist Ceramic Coffee Cup Silhouette */}
          <path
            d="M37 54C37 63 43 68 50 68C57 68 63 63 63 54H37Z"
            fill={isDarkBg ? "#F5F0E7" : "#FFFCF7"}
          />
          {/* Cup Handle */}
          <path
            d="M62 56C65 56 67 58 67 60C67 62 65 64 62 64"
            stroke={isDarkBg ? "#F5F0E7" : "#FFFCF7"}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Cup Saucer Base */}
          <path
            d="M33 71C44 71 56 71 67 71"
            stroke="#C9AE8B"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Stylized Artisan Steam / Monogram 'J' Flourish */}
          <path
            d="M51 32C53 36 47 40 49 46M44 35C46 38 43 41 44 46M58 35C60 38 57 41 58 46"
            stroke="#C9AE8B"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Little Star Accents */}
          <circle cx="50" cy="18" r="1.5" fill="#C9AE8B" />
          <circle cx="34" cy="24" r="1" fill="#C9AE8B" opacity="0.8" />
          <circle cx="66" cy="24" r="1" fill="#C9AE8B" opacity="0.8" />
        </svg>
      </div>

      {/* Brand Typography (Hidden if emblem only) */}
      {variant !== "emblem" && (
        <div
          className={`flex flex-col ${
            variant === "vertical" ? "items-center" : "items-start"
          }`}
        >
          {/* Main Title */}
          <span
            className={`font-serif font-bold tracking-tight leading-none ${
              titleSizes[size]
            } ${isDarkBg ? "text-[#FFFCF7]" : "text-[#173D2B]"}`}
          >
            BREW &amp; CO.
          </span>

          {/* Subtitle / Tagline */}
          {showSubtitle && (
            <span
              className={`font-sans uppercase font-semibold mt-1.5 ${
                subtitleSizes[size]
              } ${isDarkBg ? "text-[#C9AE8B]" : "text-[#573B2C]"}`}
            >
              Artisan Roastery &amp; Coffee Lounge
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const BrewAndCoLogo = JhesCafeLogo;

