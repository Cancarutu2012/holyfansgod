import React, { useState, useEffect, useId } from "react";
import { User, Post } from "../types";
import { api } from "../services/apiClient";
import {
  X,
  ShieldCheck,
  Users,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  Crown,
  Heart,
  Calendar,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

interface AdminPanelModalProps {
  isOpen: boolean;
  currentUser: User | null;
  posts: Post[];
  onClose: () => void;
  onOpenEditPost: (post: Post) => void;
  onPostDeleted: (postId: string) => void;
  onPostsRefreshed: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  currentUser,
  posts,
  onClose,
  onOpenEditPost,
  onPostDeleted,
  onPostsRefreshed,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "posts" | "stats">("users");
  const [adminUsers, setAdminUsers] = useState<Array<User & { postCount?: number }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Deletion modals
  const [userToDelete, setUserToDelete] = useState<(User & { postCount?: number }) | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userSearchInputId = useId();
  const postSearchInputId = useId();

  const fetchUsers = async () => {
    const token = api.getToken();
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers(token);
      if (res.success && Array.isArray(res.users)) {
        setAdminUsers(res.users);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setNotification(null);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const isAdmin = currentUser.role === "admin" || currentUser.email === "admin@holyfans.com";
  if (!isAdmin) return null;

  // Notification helper
  const notify = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle Role
  const handleToggleRole = async (targetUser: User & { postCount?: number }) => {
    const token = api.getToken();
    if (!token) return;

    if (targetUser.id === currentUser.id) {
      notify("A saját adminisztrátori rangodat nem vonhatod vissza!", "error");
      return;
    }

    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      const res = await api.setAdminRole(token, targetUser.id, nextRole);
      if (res.success) {
        notify(`Szerepkör sikeresen módosítva: ${targetUser.displayName} -> ${nextRole.toUpperCase()}`);
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
        );
      } else {
        notify(res.message || "Nem sikerült módosítani a szerepkört.", "error");
      }
    } catch {
      notify("Hiba történt a szerepkör módosításakor.", "error");
    }
  };

  // Confirm Delete User
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const token = api.getToken();
    if (!token) return;

    if (userToDelete.id === currentUser.id) {
      notify("A saját fiókodat nem törölheted!", "error");
      setUserToDelete(null);
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.deleteAdminUser(token, userToDelete.id);
      if (res.success) {
        notify(res.message || "Felhasználó sikeresen eltávolítva.");
        setAdminUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        onPostsRefreshed();
        setUserToDelete(null);
      } else {
        notify(res.message || "Nem sikerült a felhasználó törlése.", "error");
      }
    } catch {
      notify("Hiba a felhasználó törlése során.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Delete Post
  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    const token = api.getToken();
    if (!token) return;

    setActionLoading(true);
    try {
      const res = await api.deletePost(token, postToDelete.id);
      if (res.success) {
        notify("Bejegyzés sikeresen törölve.");
        onPostDeleted(postToDelete.id);
        setPostToDelete(null);
        fetchUsers(); // Refresh post counts
      } else {
        notify(res.message || "A bejegyzés törlése nem sikerült.", "error");
      }
    } catch {
      notify("Hiba történt a törlés során.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredUsers = adminUsers.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.haloBadge && u.haloBadge.toLowerCase().includes(q))
    );
  });

  const filteredPosts = posts.filter((p) => {
    if (!postSearch.trim()) return true;
    const q = postSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
      p.authorName.toLowerCase().includes(q) ||
      (p.authorEmail && p.authorEmail.toLowerCase().includes(q))
    );
  });

  const totalBlessings = posts.reduce((sum, p) => sum + (p.blessings || 0), 0);

  return (
    <div
      id="admin-panel-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="admin-panel-modal"
        className="relative w-full max-w-4xl rounded-3xl bg-neutral-900 border-2 border-amber-500/50 p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)] my-8 flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          id="close-admin-panel-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-neutral-100">
                  HolyFans Admin Panel
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-neutral-950 uppercase tracking-widest">
                  Főpap Hozzáférés
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Minden regisztrált felhasználó és szent kép moderálása ({currentUser.email})
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800 self-start sm:self-auto">
            <button
              id="admin-tab-users"
              type="button"
              onClick={() => setActiveTab("users")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "users"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Felhasználók ({adminUsers.length})</span>
            </button>

            <button
              id="admin-tab-posts"
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "posts"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Posztok ({posts.length})</span>
            </button>

            <button
              id="admin-tab-stats"
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "stats"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Áttekintés</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
              notification.type === "success"
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                : "bg-red-950/60 border-red-500/50 text-red-300"
            }`}
          >
            <span>{notification.text}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: USERS */}
        {activeTab === "users" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search and Refresh Bar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="relative flex-1">
                <label htmlFor={userSearchInputId} className="sr-only">
                  Felhasználó keresése név vagy e-mail alapján
                </label>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                <input
                  id={userSearchInputId}
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Keresés felhasználó neve vagy e-mail címe alapján..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-xs outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                title="Felhasználók frissítése"
                className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin text-amber-400" : ""}`} />
              </button>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[300px]">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  Nem található a feltételeknek megfelelő felhasználó.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isUserAdmin = user.role === "admin" || user.email === "admin@holyfans.com";

                  return (
                    <div
                      key={user.id}
                      className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={
                              user.avatarUrl ||
                              `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(user.displayName)}`
                            }
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-neutral-700 bg-neutral-900"
                          />
                          {isUserAdmin && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-neutral-950 shadow">
                              <Crown className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-neutral-100 truncate">
                              {user.displayName}
                            </span>
                            {isUserAdmin ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                ADMIN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-800 text-neutral-400">
                                HÍVŐ
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[10px] text-neutral-400 italic">
                                (te)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400 mt-0.5">
                            <span className="text-neutral-300 font-mono text-[11px]">{user.email}</span>
                            <span>•</span>
                            <span className="text-amber-400/90">{user.haloBadge || "Dicsfény Hordozó"}</span>
                            <span>•</span>
                            <span>{user.postCount ?? 0} poszt</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Role switch button */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleToggleRole(user)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                              isUserAdmin
                                ? "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isUserAdmin ? "Rang visszavonása" : "Adminná tétel"}</span>
                          </button>
                        )}

                        {/* Delete User Button */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Törlés</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POSTS */}
        {activeTab === "posts" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Posts */}
            <div className="relative mb-4">
              <label htmlFor={postSearchInputId} className="sr-only">
                Keresés a bejegyzések és szerzők között
              </label>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                id={postSearchInputId}
                type="search"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="Keresés cím, leírás, vagy szerző szerint..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-amber-400 text-neutral-100 text-xs outline-none transition-colors"
              />
            </div>

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
              {filteredPosts.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  Nem található a feltételeknek megfelelő bejegyzés.
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-sm font-bold text-neutral-100 truncate">
                          {post.title}
                        </h4>
                        {post.subtitle && (
                          <p className="text-xs text-neutral-400 line-clamp-1">
                            {post.subtitle}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                          <span className="text-amber-300 font-medium">Szerző: {post.authorName}</span>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold">{post.blessings || 0} áldás</span>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString("hu-HU")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenEditPost(post)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Szerkesztés</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPostToDelete(post)}
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
          </div>
        )}

        {/* TAB 3: OVERVIEW STATS */}
        {activeTab === "stats" && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 flex flex-col items-center text-center">
                <Users className="w-6 h-6 text-amber-400 mb-2" />
                <span className="font-cinzel text-2xl font-bold text-neutral-100">
                  {adminUsers.length}
                </span>
                <span className="text-xs text-neutral-400">Regisztrált Felhasználó</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 flex flex-col items-center text-center">
                <ImageIcon className="w-6 h-6 text-amber-400 mb-2" />
                <span className="font-cinzel text-2xl font-bold text-neutral-100">
                  {posts.length}
                </span>
                <span className="text-xs text-neutral-400">Közzétett Szent Kép</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 flex flex-col items-center text-center">
                <Heart className="w-6 h-6 text-rose-400 mb-2 fill-rose-400" />
                <span className="font-cinzel text-2xl font-bold text-neutral-100">
                  {totalBlessings}
                </span>
                <span className="text-xs text-neutral-400">Kiosztott Áldás & Amen</span>
              </div>
            </div>

            {/* Admin Profile Details */}
            <div className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-cinzel font-bold text-sm">
                <Crown className="w-4 h-4" />
                <span>Aktív Adminisztrátori Hozzáférés</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Jelenleg mint <span className="text-amber-300 font-semibold">{currentUser.displayName}</span> ({currentUser.email}) vagy bejelentkezve, korlátlan moderátori és adminisztrátori jogosultságokkal.
              </p>
              <div className="text-[11px] text-neutral-400 bg-neutral-900 p-3 rounded-xl border border-neutral-800 space-y-1">
                <div>• Bármelyik hívő felhasználó szerepköre módosítható Adminisztrátorrá.</div>
                <div>• Nem odaillő tartalmak és szabálysértő fiókok azonnal eltávolíthatók.</div>
                <div>• A rendszer valós idejű szinkronizációval azonnal frissíti a HolyFans közösségi hírfolyamot.</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            Bezárás
          </button>
        </div>

        {/* Confirm Delete User Modal */}
        {userToDelete && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-black/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-neutral-100">
              Biztosan törlöd ezt a felhasználót?
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              <strong className="text-neutral-200">{userToDelete.displayName}</strong> ({userToDelete.email}) és az összes hozzá tartozó bejegyzés ({userToDelete.postCount ?? 0} db) véglegesen törlődik.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800 border border-neutral-700 transition-colors"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeleteUser}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Törlés..." : "Igen, felhasználó törlése"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Confirm Delete Post Modal */}
        {postToDelete && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-black/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel text-lg font-bold text-neutral-100">
              Biztosan törlöd ezt a bejegyzést?
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              &quot;{postToDelete.title}&quot; (Szerző: {postToDelete.authorName}) moderátori törlésre kerül.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800 border border-neutral-700 transition-colors"
              >
                Mégse
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDeletePost}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Törlés..." : "Igen, bejegyzés törlése"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
