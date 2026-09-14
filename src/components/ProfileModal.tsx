import React, { useState, useEffect, useId, useRef } from "react";
import { User } from "../types";
import { api } from "../services/apiClient";
import {
  X,
  User as UserIcon,
  Crown,
  Upload,
  Camera,
  KeyRound,
  Check,
  Sparkles,
} from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

const PRESET_HALOS = [
  "Arany Dicsfény",
  "Szeráf Sugárzás",
  "Kerub Fényhozó",
  "Arkangyal Adminisztrátor",
  "Hajnalcsillag Áldott",
  "Mennyei Védelmező",
  "Szent Lélek Kísérő",
  "Dicsfény Hordozó",
];

const PRESET_AVATARS = [
  { name: "Szeráf", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Seraph" },
  { name: "Kerub", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Cherub" },
  { name: "Arkangyal", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Archangel" },
  { name: "Fényhozó", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Luminary" },
  { name: "Áldott", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=BlessedOne" },
  { name: "Gábriel", url: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Gabriel" },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUserUpdated,
}) => {
  const [displayName, setDisplayName] = useState("");
  const [haloBadge, setHaloBadge] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputId = useId();
  const haloInputId = useId();
  const passwordInputId = useId();

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || "");
      setHaloBadge(currentUser.haloBadge || "Arany Dicsfény");
      setAvatarUrl(currentUser.avatarUrl || "");
      setAvatarPreview(
        currentUser.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(currentUser.displayName)}`
      );
      setNewPassword("");
      setSelectedFile(null);
      setError(null);
      setSuccess(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Kérjük, képfájlt (JPG, PNG, WebP) válassz ki!");
        return;
      }
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setError(null);
    }
  };

  const handleSelectPresetAvatar = (url: string) => {
    setSelectedFile(null);
    setAvatarUrl(url);
    setAvatarPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("A megjelenített név nem lehet üres!");
      return;
    }

    const token = api.getToken();
    if (!token) {
      setError("Bejelentkezés szükséges a profil módosításához.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let finalAvatarUrl = avatarUrl;

      // If user uploaded a new avatar file
      if (selectedFile) {
        const uploadRes = await api.uploadAvatar(token, selectedFile);
        if (uploadRes.success && uploadRes.avatarUrl) {
          finalAvatarUrl = uploadRes.avatarUrl;
        }
      }

      const updatePayload: {
        displayName: string;
        haloBadge: string;
        avatarUrl?: string;
        password?: string;
      } = {
        displayName: displayName.trim(),
        haloBadge: haloBadge.trim(),
        avatarUrl: finalAvatarUrl,
      };

      if (newPassword.trim()) {
        if (newPassword.trim().length < 4) {
          setError("Az új jelszónak legalább 4 karakter hosszúnak kell lennie!");
          setLoading(false);
          return;
        }
        updatePayload.password = newPassword.trim();
      }

      const res = await api.updateProfile(token, updatePayload);

      if (res.success && res.user) {
        setSuccess("A profilod adatai és fényessége sikeresen frissültek!");
        onUserUpdated(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.message || "Nem sikerült menteni a profiladatokat.");
      }
    } catch {
      setError("Hiba történt a profil mentése során.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto w-full max-w-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="profile-modal"
        className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-neutral-900 border border-amber-500/30 p-4 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)] my-auto sm:my-8"
      >
        {/* Close Button */}
        <button
          id="close-profile-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-cinzel text-xl font-bold text-neutral-100 flex items-center gap-2">
              <span>Profil Szerkesztése</span>
              {currentUser.role === "admin" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-neutral-950 uppercase tracking-wider">
                  Admin
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400">
              Kezeld a neved, profilképed és a szent dicsfény rangodat
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Section */}
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800">
            <span className="block text-xs font-semibold text-neutral-300 mb-3">
              Profilkép & Dicsfény
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Preview with Halo */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] bg-neutral-900">
                  <img
                    src={avatarPreview}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-neutral-950 shadow">
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    id="choose-avatar-file-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Új kép feltöltése</span>
                  </button>
                  {selectedFile && (
                    <span className="text-[11px] text-amber-400 truncate max-w-[150px]">
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500">
                  Válassz képet a gépedről, vagy kattints az alábbi szent ikonok egyikére!
                </p>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="mt-4 pt-3 border-t border-neutral-850">
              <span className="block text-[11px] text-neutral-400 mb-2 font-medium">
                Gyors szent profilkép sablonok:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(preset.url)}
                    title={preset.name}
                    className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition-transform hover:scale-105 ${
                      avatarPreview === preset.url
                        ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)] ring-2 ring-amber-400/50"
                        : "border-neutral-800 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label
              htmlFor={nameInputId}
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Megjelenített Név <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                id={nameInputId}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Pl. Gábor Testvér"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Halo Badge Selection */}
          <div>
            <label
              htmlFor={haloInputId}
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Dicsfény Rang & Titulus
            </label>
            <div className="relative">
              <Crown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/80 pointer-events-none" />
              <input
                id={haloInputId}
                type="text"
                value={haloBadge}
                onChange={(e) => setHaloBadge(e.target.value)}
                placeholder="Pl. Szeráf Sugárzás"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-sm outline-none transition-colors"
              />
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_HALOS.slice(0, 4).map((badge) => (
                <button
                  key={badge}
                  type="button"
                  onClick={() => setHaloBadge(badge)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    haloBadge === badge
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>
          </div>

          {/* New Password (Optional) */}
          <div>
            <label
              htmlFor={passwordInputId}
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Új Jelszó <span className="text-neutral-500 font-normal">(opcionális)</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                id={passwordInputId}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Hagyd üresen, ha nem akarod megváltoztatni"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-sm outline-none transition-colors"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              id="cancel-profile-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Mégse
            </button>
            <button
              id="save-profile-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{loading ? "Mentés..." : "Profil Mentése"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
