import React, { useState } from "react";
import { User } from "../types";
import { api } from "../services/apiClient";
import { X, Sparkles, LogIn, UserPlus, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
  onLoginSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "login",
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      let data;
      if (tab === "register") {
        data = await api.register({ email, password, displayName });
      } else {
        data = await api.login({ email, password });
      }

      if (!data.success) {
        throw new Error(data.message || "A hitelesítés sikertelen volt.");
      }

      setSuccessMessage(data.message || "Sikeres művelet!");

      // Save user & token
      if (data.user && data.token) {
        localStorage.setItem("holyfans_token", data.token);
        localStorage.setItem("holyfans_user", JSON.stringify(data.user));
        setTimeout(() => {
          onLoginSuccess(data.user!, data.token!);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Hiba történt a szerverrel való kommunikációban.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-cinzel text-lg font-bold text-neutral-100">
              {tab === "register" ? "Csatlakozás a Szent Rendhez" : "Belépés a HolyFans-re"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              tab === "login"
                ? "border-amber-400 text-amber-300 bg-amber-500/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Bejelentkezés</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("register");
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              tab === "register"
                ? "border-amber-400 text-amber-300 bg-amber-500/5"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Regisztráció</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
                Megjelenített Név (Display Name) *
              </label>
              <input
                type="text"
                required
                placeholder="pl. Péter Testvér vagy Serafina"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-neutral-100 placeholder-neutral-500 text-sm outline-none transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
              E-mail cím *
            </label>
            <input
              type="email"
              required
              placeholder="pelda@holyfans.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-neutral-100 placeholder-neutral-500 text-sm outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
              Jelszó *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-neutral-100 placeholder-neutral-500 text-sm outline-none transition-colors"
            />
          </div>

          {/* Error and Success Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 transition-all transform active:scale-98"
          >
            {loading ? "Feldolgozás..." : tab === "register" ? "Szent Regisztráció" : "Belépés a Fénybe"}
          </button>
        </form>
      </div>
    </div>
  );
};
