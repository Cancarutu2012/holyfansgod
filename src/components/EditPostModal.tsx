import React, { useState, useEffect, useId } from "react";
import { Post } from "../types";
import { api } from "../services/apiClient";
import { X, Save, Edit3, Image as ImageIcon } from "lucide-react";

interface EditPostModalProps {
  isOpen: boolean;
  post: Post | null;
  onClose: () => void;
  onPostUpdated: (updatedPost: Post) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  post,
  onClose,
  onPostUpdated,
}) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleInputId = useId();
  const subtitleInputId = useId();

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setSubtitle(post.subtitle || "");
      setError(null);
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Kérjük, adj meg egy szent címet a bejegyzésnek!");
      return;
    }

    const token = api.getToken();
    if (!token) {
      setError("A módosításhoz be kell jelentkezned!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.updatePost(token, post.id, {
        title: title.trim(),
        subtitle: subtitle.trim(),
      });

      if (res.success && res.post) {
        onPostUpdated(res.post);
        onClose();
      } else {
        setError(res.message || "A bejegyzés módosítása sikertelen.");
      }
    } catch {
      setError("Hiba történt a mentés során.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="edit-post-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="edit-post-modal"
        className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-amber-500/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
      >
        {/* Close Button */}
        <button
          id="close-edit-post-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-cinzel text-xl font-bold text-neutral-100">
              Bejegyzés Szerkesztése
            </h2>
            <p className="text-xs text-neutral-400">
              Módosítsd a szent kép címét vagy inspiráló leírását
            </p>
          </div>
        </div>

        {/* Thumbnail Preview */}
        <div className="mb-5 flex items-center gap-4 p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-neutral-800">
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="text-xs space-y-1">
            <span className="text-neutral-400">Szerző:</span>{" "}
            <span className="text-amber-300 font-semibold">{post.authorName}</span>
            <div className="text-neutral-500">
              Áldások száma: <span className="text-neutral-300">{post.blessings || 0}</span>
            </div>
            <div className="text-neutral-500">
              Közzétéve:{" "}
              <span className="text-neutral-300">
                {new Date(post.createdAt).toLocaleDateString("hu-HU")}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={titleInputId}
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Szent Cím <span className="text-amber-400">*</span>
            </label>
            <input
              id={titleInputId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-sm outline-none transition-colors"
              placeholder="Pl. A Mennyei Fény Sugárzása"
              required
            />
          </div>

          <div>
            <label
              htmlFor={subtitleInputId}
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Inspiráló Leírás / Gondolat
            </label>
            <textarea
              id={subtitleInputId}
              rows={3}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-sm outline-none transition-colors resize-none"
              placeholder="Oszd meg a képhez kapcsolódó szent üzenetet..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              id="cancel-edit-post-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Mégse
            </button>
            <button
              id="save-edit-post-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Mentés..." : "Módosítások mentése"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
