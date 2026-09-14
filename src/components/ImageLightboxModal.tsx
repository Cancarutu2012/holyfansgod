import React, { useState } from "react";
import { Post } from "../types";
import { X, Heart, Sparkles, Crown, Share2, Check } from "lucide-react";

interface ImageLightboxModalProps {
  post: Post | null;
  onClose: () => void;
  onBless: (postId: string) => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  post,
  onClose,
  onBless,
}) => {
  const [copied, setCopied] = useState(false);

  if (!post) return null;

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("post", post.id);
    url.hash = `post-${post.id}`;
    const shareUrl = url.toString();

    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `HolyFans - ${post.title}`,
          text: post.subtitle || `${post.authorName} szent pillanata`,
          url: shareUrl,
        });
        shared = true;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    if (!shared) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          throw new Error();
        }
      } catch {
        window.prompt("Másold ki a szent megosztási linket:", shareUrl);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-lg">
      <div className="relative max-w-5xl w-full max-h-[95vh] flex flex-col bg-neutral-900 border border-amber-500/40 rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.3)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-amber-400 overflow-hidden">
              <img
                src={
                  post.authorAvatar ||
                  `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(post.authorName)}`
                }
                alt={post.authorName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-sm font-bold text-neutral-100">{post.authorName}</span>
              {post.authorHalo && (
                <span className="ml-2 text-xs text-amber-300 font-medium font-serif">
                  ({post.authorHalo})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Image */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-2 min-h-[300px]">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Caption & Actions */}
        <div className="p-5 bg-neutral-950/80 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-cinzel text-lg font-bold text-amber-200">
              {post.title}
            </h3>
            {post.subtitle && (
              <p className="text-sm text-neutral-300 italic font-serif">
                {post.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleShare}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-300 border border-neutral-700 hover:border-amber-500/40"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Link másolva! ✨</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Megosztás</span>
                </>
              )}
            </button>

            <button
              onClick={() => onBless(post.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 transition-all"
            >
              <Heart className="w-4 h-4 fill-current text-amber-400" />
              <span>Áldás osztása</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-xs font-bold text-amber-400">
                {post.blessings || 0}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
