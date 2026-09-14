import React, { useState } from "react";
import { Post } from "../types";
import { Sparkles, Heart, Share2, ZoomIn, Check, Crown } from "lucide-react";

interface PostCardProps {
  post: Post;
  onBless: (postId: string) => void;
  onOpenLightbox: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onBless, onOpenLightbox }) => {
  const [copied, setCopied] = useState(false);
  const [blessingAnim, setBlessingAnim] = useState(false);

  const handleBless = () => {
    setBlessingAnim(true);
    onBless(post.id);
    setTimeout(() => setBlessingAnim(false), 800);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set("post", post.id);
    url.hash = `post-${post.id}`;
    const shareUrl = url.toString();

    let shareSuccess = false;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `HolyFans - ${post.title}`,
          text: post.subtitle || `${post.authorName} szent pillanata a HolyFans-en!`,
          url: shareUrl,
        });
        shareSuccess = true;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    if (!shareSuccess) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          throw new Error("Clipboard unavailable");
        }
      } catch {
        window.prompt("Másold ki a szent megosztási linket:", shareUrl);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Format date in Hungarian
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("hu-HU", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Nemrég";
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="w-full bg-neutral-900/90 border border-amber-500/20 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] group"
    >
      {/* Post Header: Who uploaded it (Feltöltő) */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/50">
        <div className="flex items-center gap-3">
          {/* Avatar with Glory Halo */}
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-amber-400 p-[1px] shadow-[0_0_12px_rgba(251,191,36,0.4)]">
              <img
                src={
                  post.authorAvatar ||
                  `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(post.authorName)}`
                }
                alt={post.authorName}
                className="w-full h-full object-cover rounded-full bg-neutral-950"
              />
            </div>
            {/* Halo emblem */}
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-neutral-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow">
              <Crown className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-neutral-100 text-base group-hover:text-amber-300 transition-colors">
                {post.authorName}
              </span>
              {post.authorHalo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  {post.authorHalo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span>{post.authorEmail}</span>
              <span>•</span>
              <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </div>
          </div>
        </div>
      </div>

      {/* Post Text: Title & Subtitle (Cím és Alcím) */}
      <div className="px-5 pt-4 pb-3">
        {/* Title */}
        <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-neutral-100 tracking-wide text-balance leading-snug">
          {post.title}
        </h2>

        {/* Subtitle / Alcím */}
        {post.subtitle && (
          <p className="mt-1.5 text-neutral-300 text-sm sm:text-base leading-relaxed italic font-serif">
            "{post.subtitle}"
          </p>
        )}
      </div>

      {/* Post Image: Served from pics folder */}
      <div
        className="relative bg-neutral-950 cursor-pointer overflow-hidden max-h-[640px] flex items-center justify-center"
        onClick={() => onOpenLightbox(post)}
      >
        <img
          src={post.imageUrl}
          alt={post.title}
          loading="lazy"
          className="w-full h-auto max-h-[600px] object-contain transition-transform duration-500 hover:scale-[1.02]"
        />

        {/* Hover zoom overlay */}
        <div className="absolute inset-0 bg-neutral-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-neutral-950/80 text-amber-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm border border-amber-500/30">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Nagyítás</span>
          </div>
        </div>
      </div>

      {/* Post Footer Actions */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-t border-neutral-800/80 bg-neutral-900/40">
        <div className="flex items-center gap-3">
          {/* Blessing Button (Amen / Like) */}
          <button
            id={`bless-btn-${post.id}`}
            onClick={handleBless}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              blessingAnim
                ? "bg-amber-400 text-neutral-950 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                : "bg-neutral-800 hover:bg-neutral-700/80 text-amber-300 border border-amber-500/30 hover:border-amber-400"
            }`}
          >
            <Heart
              className={`w-4 h-4 fill-current ${
                blessingAnim ? "animate-ping text-neutral-950" : "text-amber-400"
              }`}
            />
            <span>Áldás / Amen</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-neutral-950 text-amber-300 text-xs font-bold">
              {post.blessings || 0}
            </span>
          </button>
        </div>

        {/* Share & Link */}
        <div className="flex items-center gap-2">
          <button
            id={`share-btn-${post.id}`}
            onClick={handleShare}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 border border-transparent hover:border-neutral-700"
            }`}
            title="Megosztás és link másolása"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Másolva! ✨</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Megosztás</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
