"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, Play, Pause, RotateCw, Flame } from "lucide-react";

export function RotatingCoffeeCup() {
  const [speed, setSpeed] = useState<"normal" | "fast" | "paused">("normal");
  const [isHovered, setIsHovered] = useState(false);

  // Rotation duration based on state
  const getRotationClass = () => {
    if (speed === "paused") return "";
    if (speed === "fast") return "animate-spin-whirlpool";
    return isHovered ? "animate-spin-whirlpool" : "animate-spin-slow";
  };

  const toggleSpinMode = () => {
    if (speed === "normal") setSpeed("fast");
    else if (speed === "fast") setSpeed("paused");
    else setSpeed("normal");
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">

      {/* Ambient Warm Backlight Glow */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-[#C9AE8B]/30 via-[#315640]/35 to-[#173D2B]/60 blur-3xl pointer-events-none animate-ambient-glow" />

      {/* Floating Badge: Top Left */}
      <div className="hidden sm:flex absolute -top-4 -left-6 z-30 items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#173D2B]/90 backdrop-blur-md border border-[#C9AE8B]/40 text-[#FFFCF7] text-[11px] font-medium shadow-lg">
        <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
        <span>Freshly Pulled Heart Latte Art</span>
      </div>

      {/* Floating Badge: Bottom Right */}
      <div className="hidden sm:flex absolute -bottom-5 -right-4 z-30 items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#173D2B]/90 backdrop-blur-md border border-[#C9AE8B]/40 text-[#FFFCF7] text-[11px] font-medium shadow-lg">
        <Flame className="w-3.5 h-3.5 text-[#C9AE8B]" />
        <span>9-Bar Extraction · 65°C Micro-Foam</span>
      </div>

      {/* Main Coffee Stage */}
      <div
        className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={toggleSpinMode}
        title="Click to change coffee spin speed!"
      >

        {/* Outer Circular Seal Frame with Curved Letters on the Rim */}
        <div className="absolute inset-0 z-20 pointer-events-none animate-spin-reverse-slow">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <path
                id="coffeeLetterRing"
                d="M 200, 200 m -176, 0 a 176,176 0 1,1 352,0 a 176,176 0 1,1 -352,0"
                fill="none"
              />
            </defs>

            {/* Outer Dotted Gold Ring */}
            <circle
              cx="200"
              cy="200"
              r="192"
              stroke="#C9AE8B"
              strokeWidth="1.8"
              strokeDasharray="4 6"
              opacity="0.8"
              fill="none"
            />

            {/* Inner Fine Gold Ring */}
            <circle
              cx="200"
              cy="200"
              r="162"
              stroke="#C9AE8B"
              strokeWidth="1.2"
              opacity="0.6"
              fill="none"
            />

            {/* The Curved Lettering on the Rim */}
            <text
              fill="#FFFCF7"
              fontSize="10.5"
              fontFamily="var(--font-montserrat), system-ui, sans-serif"
              fontWeight="700"
              letterSpacing="3.4"
              opacity="0.95"
            >
              <textPath href="#coffeeLetterRing" startOffset="0%">
                ★ BREW &amp; CO. ★ ARTISAN SPECIALTY COFFEE ★ MODERN ROASTERY &amp; LOUNGE ★ SLOW ROASTED ★
              </textPath>
            </text>
          </svg>
        </div>

        {/* Realistic Steam Effects rising from the coffee */}
        <div className="absolute -top-10 z-25 pointer-events-none flex gap-4 opacity-75">
          <div className="w-3 h-14 bg-gradient-to-t from-[#F5F0E7]/40 to-transparent rounded-full blur-xs animate-steam" />
          <div className="w-2.5 h-16 bg-gradient-to-t from-[#F5F0E7]/50 to-transparent rounded-full blur-xs animate-steam [animation-delay:1s]" />
          <div className="w-3.5 h-12 bg-gradient-to-t from-[#F5F0E7]/30 to-transparent rounded-full blur-xs animate-steam [animation-delay:1.8s]" />
        </div>

        {/* 
          THE SINGLE UNIFIED ROTATING CUP OF COFFEE
          The entire coffee cup, saucer, heart latte art, and rich roasted beans 
          spin as ONE singular cohesive element!
        */}
        <div
          className={`relative z-10 w-52 h-52 sm:w-64 sm:h-64 md:w-76 md:h-76 rounded-full overflow-hidden shadow-2xl border-2 border-[#C9AE8B]/70 transition-transform duration-300 group-hover:scale-105 ${getRotationClass()}`}
          style={{
            boxShadow:
              "0 20px 45px rgba(0, 0, 0, 0.5), 0 0 35px rgba(201, 174, 139, 0.4)",
          }}
        >
          <Image
            src="/images/single-coffee-cup-rotating.png"
            alt="Rotating Cup of Coffee with Heart Latte Art"
            fill
            sizes="(max-width: 768px) 300px, 450px"
            className="object-cover"
            priority
          />
          {/* Subtle Glass Reflection Sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>

      </div>

      {/* Interactive Control Pill (Allows changing or pausing the spin) */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSpinMode}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#173D2B]/90 hover:bg-[#315640] border border-[#C9AE8B]/50 text-[#F5F0E7] text-[11px] font-medium transition-all shadow-md active:scale-95 cursor-pointer"
        >
          {speed === "paused" ? (
            <>
              <Play className="w-3 h-3 text-[#C9AE8B]" />
              <span>Resume Coffee Spin</span>
            </>
          ) : speed === "fast" ? (
            <>
              <RotateCw className="w-3 h-3 text-[#C9AE8B] animate-spin" />
              <span>Fast Barista Swirl</span>
            </>
          ) : (
            <>
              <RotateCw className="w-3 h-3 text-[#C9AE8B]" />
              <span>Slow Brewing Spin</span>
            </>
          )}
        </button>

        <span className="text-[10px] text-[#F5F0E7]/70 font-sans">
          Click cup to pause / stir
        </span>
      </div>

    </div>
  );
}
