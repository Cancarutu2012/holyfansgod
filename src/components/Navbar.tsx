import React, { useState } from "react";
import { HolyLogo } from "./HolyLogo";
import { User } from "../types";
import {
  PlusCircle,
  LogIn,
  LogOut,
  Crown,
  Sparkles,
  ShieldCheck,
  Layers,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  onOpenUpload: () => void;
  onOpenAuth: (initialTab?: "login" | "register") => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenMyPosts: () => void;
  onOpenAdminPanel: () => void;
  postCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenUpload,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenMyPosts,
  onOpenAdminPanel,
  postCount: _postCount,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "admin@holyfans.com";

  return (
    <header className="sticky top-0 z-40 w-full max-w-full border-b border-amber-500/20 bg-neutral-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        {/* Logo and Brand */}
        <div className="flex items-center min-w-0 shrink">
          <HolyLogo size="md" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Admin Panel Quick Access Button */}
          {isAdmin && (
            <button
              id="nav-admin-panel-btn"
              onClick={onOpenAdminPanel}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all transform active:scale-95 shrink-0"
              title="Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 stroke-[2.5] shrink-0" />
              <span className="hidden xs:inline sm:inline">Admin</span>
              <span className="hidden sm:inline"> Panel</span>
            </button>
          )}

          {/* Post Upload CTA */}
          <button
            id="nav-upload-btn"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all transform active:scale-95 shrink-0"
            title="Új szent kép feltöltése"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="hidden sm:inline">Kép feltöltése</span>
            <span className="hidden xs:inline sm:hidden">Feltöltés</span>
          </button>

          {/* User Auth Section */}
          {currentUser ? (
            <div className="relative flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-neutral-800 shrink-0">
              {/* User Dropdown Trigger */}
              <button
                id="user-profile-menu-btn"
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all text-left"
              >
                {/* User Avatar with Glory Halo */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                    <img
                      src={
                        currentUser.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(currentUser.displayName)}`
                      }
                      alt={currentUser.displayName}
                      className="w-full h-full object-cover bg-neutral-900"
                    />
                  </div>
                  <span className="absolute -top-1.5 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-neutral-950 shadow-sm">
                    <Crown className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="hidden md:flex flex-col leading-tight max-w-[120px]">
                  <span className="text-xs font-semibold text-neutral-100 truncate">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-medium truncate">
                    {currentUser.haloBadge || "Dicsfény Hordozó"}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div
                    id="user-profile-dropdown"
                    className="absolute right-0 top-12 z-40 w-52 sm:w-56 max-w-[calc(100vw-20px)] rounded-2xl bg-neutral-900 border border-amber-500/30 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-fade-in text-xs space-y-1"
                  >
                    {/* Header info in menu */}
                    <div className="px-3 py-2 border-b border-neutral-800 mb-1">
                      <div className="font-bold text-neutral-100 truncate">
                        {currentUser.displayName}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {currentUser.email}
                      </div>
                      {isAdmin && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Adminisztrátor</span>
                        </div>
                      )}
                    </div>

                    {/* Profile Edit Option */}
                    <button
                      id="menu-edit-profile-btn"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-amber-400" />
                      <span>Profil szerkesztése</span>
                    </button>

                    {/* My Posts Option */}
                    <button
                      id="menu-my-posts-btn"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenMyPosts();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Saját bejegyzéseim</span>
                    </button>

                    {/* Admin Panel Option */}
                    {isAdmin && (
                      <button
                        id="menu-admin-panel-btn"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenAdminPanel();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-300 font-semibold hover:bg-amber-500/20 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Admin Panel</span>
                      </button>
                    )}

                    <div className="border-t border-neutral-800 pt-1 mt-1">
                      {/* Logout */}
                      <button
                        id="menu-logout-btn"
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Kijelentkezés</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                id="login-modal-open-btn"
                onClick={() => onOpenAuth("login")}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-neutral-200 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-colors shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>Belépés</span>
              </button>

              <button
                id="register-modal-open-btn"
                onClick={() => onOpenAuth("register")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-neutral-900 text-amber-300 border border-amber-500/40 hover:bg-neutral-800 transition-colors shrink-0"
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

