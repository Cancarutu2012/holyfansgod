import React, { useState, useRef } from "react";
import { User, Post } from "../types";
import { api } from "../services/apiClient";
import { X, Upload, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onPostCreated: (newPost: Post) => void;
  onOpenAuth: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPostCreated,
  onOpenAuth,
}) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Kérlek csak képfájlt válassz (JPG, PNG, WebP, GIF)!");
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Kérlek válassz ki egy képet a feltöltéshez!");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Kérlek adj meg egy szent címet a képnek!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("title", title.trim());
      formData.append("subtitle", subtitle.trim());

      if (currentUser) {
        formData.append("authorId", currentUser.id);
        formData.append("authorName", currentUser.displayName);
        formData.append("authorEmail", currentUser.email);
        if (currentUser.haloBadge) {
          formData.append("authorHalo", currentUser.haloBadge);
        }
      } else {
        formData.append("authorName", "Dicső Látogató");
        formData.append("authorEmail", "latogato@holyfans.com");
        formData.append("authorHalo", "Kezdő Kereső");
      }

      const data = await api.createPost(formData, selectedFile);

      if (!data.success || !data.post) {
        throw new Error(data.message || "Hiba történt a feltöltés során.");
      }

      setSuccessMessage("Dicsőség! A kép sikeresen feltöltve és közzétéve!");
      onPostCreated(data.post);

      setTimeout(() => {
        // Reset and close
        setTitle("");
        setSubtitle("");
        setSelectedFile(null);
        setPreviewUrl(null);
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Hálózati hiba történt a feltöltés során.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-cinzel text-lg font-bold text-neutral-100">
              Szent Kép Feltöltése
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User alert if not logged in */}
        {!currentUser && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <span>Bejelentkezés nélkül látogatóként teszel közzé.</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="font-semibold underline hover:text-white"
            >
              Belépés / Regisztráció
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Picker / Drag & Drop Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-2">
              Kép kiválasztása
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-amber-400 bg-amber-500/10"
                  : previewUrl
                  ? "border-amber-500/50 bg-neutral-950/50"
                  : "border-neutral-700 hover:border-amber-500/40 bg-neutral-950/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-2">
                  <div className="max-h-56 overflow-hidden rounded-lg border border-neutral-800 mx-auto flex items-center justify-center bg-black">
                    <img
                      src={previewUrl}
                      alt="Előnézet"
                      className="max-h-56 object-contain"
                    />
                  </div>
                  <p className="text-xs text-amber-300/80">
                    Kattints a kép megváltoztatásához ({selectedFile?.name})
                  </p>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-200">
                    Húzd ide a képet vagy kattints a tallózáshoz
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    JPG, PNG, WebP vagy GIF formátum (max. 15MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title (Cím) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
              Cím (Title) *
            </label>
            <input
              type="text"
              required
              placeholder="pl. Hajnali Dicsőség az Oltár felett"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-neutral-100 placeholder-neutral-500 text-sm outline-none transition-colors"
            />
          </div>

          {/* Subtitle (Alcím) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
              Alcím / Leírás (Al-title)
            </label>
            <input
              type="text"
              placeholder="pl. A felkelő nap első sugara átvilágítja a szentély ablakát"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-neutral-100 placeholder-neutral-500 text-sm outline-none transition-colors"
            />
          </div>

          {/* Error and Success Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? "Felszentelés folyamatban..." : "Felszentelés & Közzététel"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
