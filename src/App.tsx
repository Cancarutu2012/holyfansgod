/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from "react";
import { User, Post } from "./types";
import { api } from "./services/apiClient";
import { Navbar } from "./components/Navbar";
import { PostCard } from "./components/PostCard";
import { UploadModal } from "./components/UploadModal";
import { AuthModal } from "./components/AuthModal";
import { ImageLightboxModal } from "./components/ImageLightboxModal";
import { ProfileModal } from "./components/ProfileModal";
import { MyPostsModal } from "./components/MyPostsModal";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { EditPostModal } from "./components/EditPostModal";
import {
  Sparkles,
  Upload,
  Search,
  RefreshCw,
  Crown,
  ScrollText,
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyPostsOpen, setIsMyPostsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [editPostTarget, setEditPostTarget] = useState<Post | null>(null);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    tab: "login" | "register";
  }>({ isOpen: false, tab: "login" });
  const [lightboxPost, setLightboxPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalBelievers: 0,
    totalBlessings: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputId = useId();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Restore current user session
  useEffect(() => {
    const savedUser = localStorage.getItem("holyfans_user");
    const token = localStorage.getItem("holyfans_token");
    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        // Verify with server or local storage
        api.getMe(token).then((data) => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem("holyfans_user", JSON.stringify(data.user));
          }
        });
      } catch {
        localStorage.removeItem("holyfans_user");
        localStorage.removeItem("holyfans_token");
      }
    }
  }, []);

  // Fetch posts and stats
  const fetchPostsAndStats = async (): Promise<Post[] | null> => {
    setLoading(true);
    try {
      const [postsData, statsData] = await Promise.all([
        api.getPosts(),
        api.getStats(),
      ]);

      let loaded: Post[] = [];
      if (postsData.success && Array.isArray(postsData.posts)) {
        setPosts(postsData.posts);
        loaded = postsData.posts;
      }
      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
      return loaded;
    } catch (err) {
      console.error("Failed to load feed", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle deep link / share link (?post=id or #post-id)
  const handleDeepLinkPost = async (loadedPosts: Post[]) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let targetId = urlParams.get("post");
      if (!targetId && window.location.hash) {
        const hash = window.location.hash.replace(/^#(post-)?/, "");
        if (hash) targetId = hash;
      }

      if (!targetId) return;

      let found = loadedPosts.find((p) => p.id === targetId);

      // If not present in current list, fetch directly from central database
      if (!found) {
        const singleRes = await api.getPostById(targetId);
        if (singleRes.success && singleRes.post) {
          found = singleRes.post;
          setPosts((prev) => [singleRes.post!, ...prev.filter((p) => p.id !== singleRes.post!.id)]);
        }
      }

      if (found) {
        setLightboxPost(found);
        showToast(`Szent megosztás megnyitva: ${found.title} ✨`);
        setTimeout(() => {
          const el = document.getElementById(`post-${found!.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-amber-400", "shadow-[0_0_50px_rgba(245,158,11,0.5)]");
            setTimeout(() => {
              el.classList.remove("ring-2", "ring-amber-400", "shadow-[0_0_50px_rgba(245,158,11,0.5)]");
            }, 4000);
          }
        }, 400);
      }
    } catch (err) {
      console.warn("Deep link processing caught error:", err);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      await api.syncLocalDataToServer();
      const loaded = await fetchPostsAndStats();
      if (loaded) {
        await handleDeepLinkPost(loaded);
      }
    };
    initApp();

    // Also listen to hashchange for in-page navigation
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#(post-)?/, "");
      if (hash) {
        setPosts((currentPosts) => {
          const found = currentPosts.find((p) => p.id === hash);
          if (found) {
            setLightboxPost(found);
            const el = document.getElementById(`post-${found.id}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return currentPosts;
        });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Handle Bless
  const handleBless = async (postId: string) => {
    try {
      const data = await api.blessPost(postId);
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, blessings: data.blessings } : p
          )
        );
        if (lightboxPost && lightboxPost.id === postId) {
          setLightboxPost((prev) =>
            prev ? { ...prev, blessings: data.blessings } : null
          );
        }
        showToast("Áldás elküldve! Amen! ✨");
        // Update stats
        setStats((prev) => ({
          ...prev,
          totalBlessings: prev.totalBlessings + 1,
        }));
      }
    } catch (err) {
      console.error("Failed to bless post", err);
    }
  };

  // Handle user profile update
  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("holyfans_user", JSON.stringify(updatedUser));
    // Synchronize loaded posts with new author name and avatar
    setPosts((prev) =>
      prev.map((p) =>
        p.authorId === updatedUser.id || p.authorEmail === updatedUser.email
          ? {
              ...p,
              authorName: updatedUser.displayName,
              authorHalo: updatedUser.haloBadge,
              authorAvatar: updatedUser.avatarUrl,
            }
          : p
      )
    );
    showToast("Profil adatok sikeresen elmentve! ✨");
  };

  // Handle post update (title, subtitle)
  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
    if (lightboxPost && lightboxPost.id === updatedPost.id) {
      setLightboxPost(updatedPost);
    }
    showToast("A bejegyzés sikeresen módosítva lett!");
  };

  // Handle post delete
  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setStats((prev) => ({
      ...prev,
      totalPosts: Math.max(0, prev.totalPosts - 1),
    }));
    if (lightboxPost && lightboxPost.id === postId) {
      setLightboxPost(null);
    }
    showToast("A bejegyzés törölve lett.");
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("holyfans_user");
    localStorage.removeItem("holyfans_token");
    setCurrentUser(null);
    showToast("Sikeres kijelentkezés. Békesség veled!");
  };

  // Handle new post created
  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    setStats((prev) => ({
      ...prev,
      totalPosts: prev.totalPosts + 1,
      totalBlessings: prev.totalBlessings + (newPost.blessings || 1),
    }));
    showToast("Új szent kép sikeresen hozzáadva a hírfolyamhoz!");
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(q) ||
      (post.subtitle && post.subtitle.toLowerCase().includes(q)) ||
      post.authorName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden max-w-full w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-bounce max-w-[calc(100vw-32px)]">
          <Sparkles className="w-4 h-4 fill-current text-neutral-950 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAuth={(tab = "login") => setAuthModal({ isOpen: true, tab })}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenMyPosts={() => setIsMyPostsOpen(true)}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        postCount={posts.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col items-center min-w-0">
        {/* Glorious Hero Banner */}
        <section
          id="holy-hero-banner"
          className="relative w-full rounded-2xl sm:rounded-3xl p-5 sm:p-10 mb-8 sm:mb-10 overflow-hidden border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-neutral-900 to-neutral-950 shadow-[0_0_50px_rgba(245,158,11,0.12)] text-center"
        >
          {/* Subtle background glow circle */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
            {/* Top Crown / Glory Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Dicsőség Közösségi Hálózat</span>
              <Sparkles className="w-3 h-3 text-amber-300" />
            </div>

            {/* Sacred Title */}
            <h1 className="font-cinzel text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-100 text-balance">
              Oszd meg a <span className="text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">Dicsőség</span> Fényét
            </h1>

            {/* Subtitle */}
            <p className="mt-3 text-neutral-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Csatlakozz a közösséghez névvel és e-maillel, tölts fel szent és inspiráló képeket címmel és leírással, és oszd meg a dicsőség felemelő pillanatait!
            </p>

            {/* Stat Counters */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-6 w-full max-w-md">
              <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center">
                <span className="font-cinzel text-xl sm:text-2xl font-bold text-amber-300">
                  {stats.totalPosts}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">Szent Kép</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center">
                <span className="font-cinzel text-xl sm:text-2xl font-bold text-amber-300">
                  {stats.totalBelievers}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">Hívő Tag</span>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center">
                <span className="font-cinzel text-xl sm:text-2xl font-bold text-amber-300">
                  {stats.totalBlessings}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">Áldás / Amen</span>
              </div>
            </div>

            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              <button
                id="hero-upload-cta"
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all transform active:scale-95"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Kép Feltöltése</span>
              </button>

              {!currentUser && (
                <button
                  id="hero-register-cta"
                  onClick={() => setAuthModal({ isOpen: true, tab: "register" })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/40 transition-colors"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Regisztráció</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Feed Controls: Search & Refresh */}
        <div className="w-full max-w-2xl mb-6 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <label htmlFor={searchInputId} className="sr-only">
              Keresés cím, alcím vagy feltöltő szerint
            </label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              id={searchInputId}
              type="search"
              placeholder="Keresés cím, alcím vagy feltöltő szerint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-sm placeholder-neutral-500 outline-none transition-colors"
            />
          </div>

          <button
            id="refresh-feed-btn"
            onClick={fetchPostsAndStats}
            title="Hírfolyam frissítése"
            className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-300 transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>

        {/* Scrolling Wall / Feed of Holy Pictures */}
        <div id="holy-scrolling-feed" className="w-full max-w-2xl flex flex-col gap-8">
          {loading && posts.length === 0 ? (
            // Skeleton Loader with Golden Shimmer
            <div className="space-y-6">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-neutral-800 rounded w-1/3" />
                      <div className="h-3 bg-neutral-800 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-6 bg-neutral-800 rounded w-3/4" />
                  <div className="h-64 bg-neutral-950 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            // Empty State
            <div className="py-16 px-6 text-center rounded-2xl border border-neutral-800 bg-neutral-900/40">
              <ScrollText className="w-12 h-12 text-amber-400/50 mx-auto mb-3" />
              <h3 className="font-cinzel text-lg font-bold text-neutral-200">
                Nem található bejegyzés
              </h3>
              <p className="text-sm text-neutral-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `Nincs találat a(z) "${searchQuery}" kifejezésre.`
                  : "Még nem töltöttek fel képet. Légy te az első, aki megosztja a szent fényt!"}
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Kép feltöltése most</span>
              </button>
            </div>
          ) : (
            // Scrolling Posts
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onBless={handleBless}
                onOpenLightbox={(p) => setLightboxPost(p)}
              />
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/90 py-8 px-4 text-center text-xs text-neutral-500">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-amber-400/80 font-cinzel font-semibold tracking-wider">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>HOLYFANS • A DICSŐSÉG KÖZÖSSÉGE</span>
          </div>
          <p className="text-neutral-500">
            A dicsőséges és szent pillanatok közösségi képtára.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentUser={currentUser}
        onPostCreated={handlePostCreated}
        onOpenAuth={() => setAuthModal({ isOpen: true, tab: "register" })}
      />

      <AuthModal
        isOpen={authModal.isOpen}
        initialTab={authModal.tab}
        onClose={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Üdvözlünk a HolyFans-en, ${user.displayName}! ✨`);
        }}
      />

      <ImageLightboxModal
        post={lightboxPost}
        onClose={() => setLightboxPost(null)}
        onBless={handleBless}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileOpen(false)}
        onUserUpdated={handleUserUpdated}
      />

      <MyPostsModal
        isOpen={isMyPostsOpen}
        currentUser={currentUser}
        posts={posts}
        onClose={() => setIsMyPostsOpen(false)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenEditPost={(post) => setEditPostTarget(post)}
        onPostDeleted={handlePostDeleted}
        onOpenLightbox={(post) => setLightboxPost(post)}
      />

      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        currentUser={currentUser}
        posts={posts}
        onClose={() => setIsAdminPanelOpen(false)}
        onOpenEditPost={(post) => setEditPostTarget(post)}
        onPostDeleted={handlePostDeleted}
        onPostsRefreshed={fetchPostsAndStats}
      />

      <EditPostModal
        isOpen={Boolean(editPostTarget)}
        post={editPostTarget}
        onClose={() => setEditPostTarget(null)}
        onPostUpdated={handlePostUpdated}
      />
    </div>
  );
}
