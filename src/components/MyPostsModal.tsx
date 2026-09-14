import React, { useState } from "react";
import { Post, User } from "../types";
import { api } from "../services/apiClient";
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Heart,
  Calendar,
  Sparkles,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface MyPostsModalProps {
  isOpen: boolean;
  currentUser: User | null;
  posts: Post[];
  onClose: () => void;
  onOpenUpload: () => void;
  onOpenEditPost: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
  onOpenLightbox: (post: Post) => void;
}

export const MyPostsModal: React.FC<MyPostsModalProps> = ({
  isOpen,
  currentUser,
  posts,
  onClose,
  onOpenUpload,
  onOpenEditPost,
  onPostDeleted,
  onOpenLightbox,
}) => {
  const [deleteCandidate, setDeleteCandidate] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  // Filter posts belonging to currentUser
  const myPosts = posts.filter(
    (p) => p.authorId === currentUser.id || p.authorEmail === currentUser.email
  );

  const totalBlessings = myPosts.reduce((acc, p) => acc + (p.blessings || 0), 0);

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    const token = api.getToken();
    if (!token) {
      setErrorMessage("Bejelentkezés szükséges a törléshez.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await api.deletePost(token, deleteCandidate.id);
      if (res.success) {
        onPostDeleted(deleteCandidate.id);
        setDeleteCandidate(null);
      } else {
        setErrorMessage(res.message || "A bejegyzés törlése nem sikerült.");
      }
    } catch {
      setErrorMessage("Hiba történt a törlés során.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="my-posts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto w-full max-w-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="my-posts-modal"
        className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-neutral-900 border border-amber-500/30 p-4 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)] my-auto sm:my-8 flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          id="close-my-posts-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-xl font-bold text-neutral-100">
                Saját Bejegyzéseim
              </h2>
              <p className="text-xs text-neutral-400">
                Kezeld, szerkeszd vagy töröld a feltöltött szent képeidet
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-neutral-400">Posztok:</span>
              <span className="font-bold text-neutral-100">{myPosts.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2 text-xs">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span className="text-neutral-400">Áldások:</span>
              <span className="font-bold text-neutral-100">{totalBlessings}</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Post List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[250px]">
          {myPosts.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-neutral-800/80 bg-neutral-950/50 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-cinzel text-base font-semibold text-neutral-300">
                Még nincsenek feltöltött szent képeid
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Oszd meg az első dicsőséges pillanatodat a közösséggel!
              </p>
              <button
                id="my-posts-empty-upload-btn"
                onClick={() => {
                  onClose();
                  onOpenUpload();
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Kép feltöltése most</span>
              </button>
            </div>
          ) : (
            myPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Thumbnail and Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(post)}
                    className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                      Megnyitás
                    </div>
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-sm font-bold text-neutral-100 truncate">
                      {post.title}
                    </h4>
                    {post.subtitle && (
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {post.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1 text-amber-300 font-medium">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        {post.blessings || 0} áldás
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        {new Date(post.createdAt).toLocaleDateString("hu-HU")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    id={`edit-my-post-${post.id}`}
                    type="button"
                    onClick={() => onOpenEditPost(post)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Szerkesztés</span>
                  </button>

                  <button
                    id={`delete-my-post-${post.id}`}
                    type="button"
                    onClick={() => setDeleteCandidate(post)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Törlés</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Bezárás
          </button>
          <button
            id="my-posts-new-post-btn"
            type="button"
            onClick={() => {
              onClose();
              onOpenUpload();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Új Kép Feltöltése</span>
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteCandidate && (
          <div className="absolute inset-0 z-20 rounded-3xl bg-black/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-neutral-100">
              Biztosan törölni szeretnéd ezt a bejegyzést?
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              &quot;{deleteCandidate.title}&quot; véglegesen el lesz távolítva a HolyFans hírfolyamból.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800 border border-neutral-700 transition-colors"
              >
                Mégse
              </button>
              <button
                id="confirm-delete-my-post-btn"
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Törlés..." : "Igen, végleges törlés"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
