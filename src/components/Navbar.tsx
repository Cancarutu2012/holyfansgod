import React from "react";
import { HolyLogo } from "./HolyLogo";
import { User } from "../types";
import { PlusCircle, LogIn, LogOut, Crown, Sparkles } from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  onOpenUpload: () => void;
  onOpenAuth: (initialTab?: "login" | "register") => void;
  onLogout: () => void;
  postCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenUpload,
  onOpenAuth,
  onLogout,
  postCount: _postCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-500/20 bg-neutral-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <HolyLogo size="md" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Post Upload CTA */}
          <button
            id="nav-upload-btn"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Kép feltöltése</span>
            <span className="sm:hidden">Feltöltés</span>
          </button>

          {/* User Auth Section */}
          {currentUser ? (
            <div className="flex items-center gap-3 pl-2 border-l border-neutral-800">
              <div className="flex items-center gap-2">
                {/* User Avatar with Glory Halo */}
                <div className="relative">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                    <img
                      src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(currentUser.displayName)}`}
                      alt={currentUser.displayName}
                      className="w-full h-full object-cover bg-neutral-900"
                    />
                  </div>
                  {/* Halo crown on avatar */}
                  <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-neutral-950 shadow-sm">
                    <Crown className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-sm font-semibold text-neutral-100 truncate max-w-[130px]">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    {currentUser.haloBadge || "Arany Dicsfény"}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                id="logout-btn"
                onClick={onLogout}
                title="Kijelentkezés"
                className="p-2 rounded-lg text-neutral-400 hover:text-red-300 hover:bg-neutral-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="login-modal-open-btn"
                onClick={() => onOpenAuth("login")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-neutral-200 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-colors"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Belépés</span>
              </button>

              <button
                id="register-modal-open-btn"
                onClick={() => onOpenAuth("register")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-neutral-900 text-amber-300 border border-amber-500/40 hover:bg-neutral-800 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Regisztráció</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
