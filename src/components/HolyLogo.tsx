import React from "react";
import { Sparkles, Sun } from "lucide-react";

interface HolyLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export const HolyLogo: React.FC<HolyLogoProps> = ({ size = "md", showTagline = false }) => {
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const textDimensions = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Glory Icon Emblem */}
      <div className="relative flex items-center justify-center">
        {/* Outer Rotating Sunburst Halo */}
        <div
          className={`absolute inset-0 -m-1 rounded-full border border-dashed border-amber-400/40 animate-spin-slow pointer-events-none`}
        />
        {/* Glowing Aura Ring */}
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-md pointer-events-none" />

        {/* Central Glory Medallion */}
        <div
          className={`${iconDimensions[size]} relative rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 p-[2px] shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center`}
        >
          <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
            {/* Background divine rays pattern */}
            <Sun className="w-3/4 h-3/4 text-amber-400/30 absolute animate-spin-slow" />
            {/* Central Angelic Halo & Cross/Crown */}
            <div className="relative flex flex-col items-center justify-center text-amber-300">
              <span className="w-4 h-1 border border-amber-300 rounded-full mb-[1px] shadow-[0_0_8px_#fde047]" />
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-cinzel font-black tracking-wider text-neutral-100 ${textDimensions[size]}`}>
            HOLY
          </span>
          <span
            className={`font-cinzel font-black tracking-wider text-amber-400 ${textDimensions[size]} drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]`}
          >
            FANS
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1">
            GLORY
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-amber-200/70 tracking-wide mt-1 font-medium">
            Dicsőséges és szent pillanatok tára
          </span>
        )}
      </div>
    </div>
  );
};
