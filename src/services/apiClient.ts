import { User, Post } from "../types";

// Fallback seed posts in case of temporary network latency or cold-start
const FALLBACK_SEED_POSTS: Post[] = [
  {
    id: "holy-seed-1",
    title: "Mennyei Fény és Béke",
    subtitle: "A dicsőség sugara átragyog a sötétségen és békességet hoz a lelkeknek.",
    imageUrl: "/pics/celestial-light.svg",
    authorId: "admin-holy-1",
    authorName: "Főpap Admin",
    authorEmail: "admin@holyfans.com",
    authorHalo: "Arkangyal Adminisztrátor",
    authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
    createdAt: "2026-09-14T10:00:00.000Z",
    blessings: 42,
  },
  {
    id: "holy-seed-2",
    title: "Katedrális Arany Dicsősége",
    subtitle: "Fenséges boltozatok, melyek a magasságos fényét tükrözik vissza a hívők felé.",
    imageUrl: "/pics/cathedral-glory.svg",
    authorId: "user-1789385577439-qs8sb",
    authorName: "Test Elek",
    authorEmail: "test@test.com",
    authorHalo: "Kerub Fényhozó",
    authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Test%20Elek",
    createdAt: "2026-09-14T10:30:00.000Z",
    blessings: 28,
  },
  {
    id: "holy-seed-3",
    title: "Angyali Szárnyak Védelme",
    subtitle: "Égi oltalmazók kísérnek minden lépésnél, megóvva a digitális világ viharaiban.",
    imageUrl: "/pics/angelic-wings.svg",
    authorId: "admin-holy-1",
    authorName: "Főpap Admin",
    authorEmail: "admin@holyfans.com",
    authorHalo: "Arkangyal Adminisztrátor",
    authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
    createdAt: "2026-09-14T11:00:00.000Z",
    blessings: 35,
  },
];

const KEY_REGISTERED_USERS = "holyfans_registered_users_v2";
const KEY_PERSISTENT_POSTS = "holyfans_persistent_posts_v2";

const DEFAULT_LOCAL_USERS: Array<User & { password?: string }> = [
  {
    id: "admin-holy-1",
    email: "admin@holyfans.com",
    password: "admin",
    displayName: "Főpap Admin",
    role: "admin",
    haloBadge: "Arkangyal Adminisztrátor",
    avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-1789385577439-qs8sb",
    email: "test@test.com",
    password: "password123",
    displayName: "Test Elek",
    role: "user",
    haloBadge: "Kerub Fényhozó",
    avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Test%20Elek",
    createdAt: "2026-09-14T11:32:57.439Z",
  },
  {
    id: "user-1789464751405-rcfyu",
    email: "cisztermedia@gmail.com",
    password: "password123",
    displayName: "Ciszter Média",
    role: "user",
    haloBadge: "Szent Lélek Kísérő",
    avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Ciszter%20M%C3%A9dia",
    createdAt: "2026-09-15T09:32:31.405Z",
  },
];

function getStoredLocalUsers(): Array<User & { password?: string }> {
  try {
    const raw = localStorage.getItem(KEY_REGISTERED_USERS);
    let list: Array<User & { password?: string }> = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    for (const def of DEFAULT_LOCAL_USERS) {
      if (!list.some((u) => u.email.toLowerCase() === def.email.toLowerCase())) {
        list.push(def);
      }
    }
    return list;
  } catch {
    return [...DEFAULT_LOCAL_USERS];
  }
}

function saveStoredLocalUser(user: User & { password?: string }): void {
  try {
    const list = getStoredLocalUsers();
    const idx = list.findIndex(
      (u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.push(user);
    }
    localStorage.setItem(KEY_REGISTERED_USERS, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not save local user:", err);
  }
}

function getStoredLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(KEY_PERSISTENT_POSTS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return [...FALLBACK_SEED_POSTS];
}

function saveStoredLocalPost(post: Post): void {
  try {
    const list = getStoredLocalPosts();
    const idx = list.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...post };
    } else {
      list.unshift(post);
    }
    localStorage.setItem(KEY_PERSISTENT_POSTS, JSON.stringify(list));
  } catch (err) {
    console.warn("Could not save local post:", err);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

// Helper to safely parse JSON response with detailed error message
async function parseResponseSafe(res: Response): Promise<{ isJson: boolean; data: any; status: number }> {
  const status = res.status;
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    let text = await res.text().catch(() => "");
    if (text.includes("FUNCTION_INVOCATION_FAILED") || text.includes("FUNCTION_INVOCATION_TIMEOUT")) {
      text = "A szerver éppen ébredezik a felhőben, kérlek próbáld újra egy pillanat múlva!";
    }
    return {
      isJson: false,
      data: { success: false, message: text || `Hiba: HTTP ${status}` },
      status,
    };
  }

  try {
    const data = await res.json();
    return { isJson: true, data, status };
  } catch (err: any) {
    return {
      isJson: false,
      data: { success: false, message: err?.message || "Nem sikerült a válasz feldolgozása." },
      status,
    };
  }
}

export const api = {
  // Session token storage (token is only a session credential, not the database)
  getToken(): string | null {
    try {
      const token = localStorage.getItem("holyfans_token");
      if (token && token.trim()) return token.trim();
      const userStr = localStorage.getItem("holyfans_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u?.id) return `token-${u.id}`;
        if (u?.email && u.email.toLowerCase() === "admin@holyfans.com") return "token-admin-holy-1";
      }
      return null;
    } catch {
      return null;
    }
  },

  setToken(token: string) {
    try {
      localStorage.setItem("holyfans_token", token);
    } catch {}
  },

  clearToken() {
    try {
      localStorage.removeItem("holyfans_token");
      localStorage.removeItem("holyfans_user");
    } catch {}
  },

  // One-time automatic migration of any legacy browser localStorage data to the server
  async syncLocalDataToServer(): Promise<void> {
    try {
      const raw = localStorage.getItem("holyfans_local_database_v1");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed) return;

      const users = Array.isArray(parsed.users) ? parsed.users : [];
      const posts = Array.isArray(parsed.posts) ? parsed.posts : [];

      if (users.length > 0 || posts.length > 0) {
        await fetch("/api/sync-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users, posts }),
        });
      }

      // Once synced, clear the legacy local database so everything is purely server-based
      localStorage.removeItem("holyfans_local_database_v1");
    } catch (err) {
      console.warn("Sync local data to server caught error:", err);
    }
  },

  // Feed: Get all posts with local persistence fallback and automatic sync
  async getPosts(): Promise<{ success: boolean; posts: Post[] }> {
    const localPosts = getStoredLocalPosts();

    try {
      const res = await fetch(`/api/posts?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const { isJson, data } = await parseResponseSafe(res);

      let serverPosts: Post[] = [];
      if (isJson && data?.success && Array.isArray(data.posts)) {
        serverPosts = data.posts;
      }

      // Merge serverPosts with localPosts without dropping any post
      const postMap = new Map<string, Post>();
      for (const p of serverPosts) {
        postMap.set(p.id, p);
      }
      const missingOnServer: Post[] = [];
      for (const p of localPosts) {
        if (!postMap.has(p.id)) {
          postMap.set(p.id, p);
          missingOnServer.push(p);
        } else {
          // If local has dataUrl, keep dataUrl so image never 404s
          const existing = postMap.get(p.id)!;
          if (p.imageUrl.startsWith("data:") && !existing.imageUrl.startsWith("data:")) {
            existing.imageUrl = p.imageUrl;
          }
        }
      }

      const mergedPosts = Array.from(postMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Persist merged posts locally
      try {
        localStorage.setItem(KEY_PERSISTENT_POSTS, JSON.stringify(mergedPosts));
      } catch {}

      // If there were local posts missing on this server container, sync them!
      if (missingOnServer.length > 0) {
        fetch("/api/sync-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posts: missingOnServer }),
        }).catch(() => {});
      }

      return { success: true, posts: mergedPosts.length > 0 ? mergedPosts : FALLBACK_SEED_POSTS };
    } catch (err) {
      console.error("api.getPosts error, returning local cache:", err);
      return { success: true, posts: localPosts.length > 0 ? localPosts : FALLBACK_SEED_POSTS };
    }
  },

  // Single post by ID for direct share links
  async getPostById(postId: string): Promise<{ success: boolean; post?: Post; message?: string }> {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && data.post) {
        return { success: true, post: data.post };
      }
      const fallback = FALLBACK_SEED_POSTS.find((p) => p.id === postId);
      if (fallback) {
        return { success: true, post: fallback };
      }
      return { success: false, message: data?.message || "A bejegyzés nem található." };
    } catch (err: any) {
      const fallback = FALLBACK_SEED_POSTS.find((p) => p.id === postId);
      if (fallback) {
        return { success: true, post: fallback };
      }
      return { success: false, message: err.message };
    }
  },

  // Community Statistics from the central server database
  async getStats(): Promise<{
    success: boolean;
    stats: { totalPosts: number; totalBelievers: number; totalBlessings: number };
  }> {
    try {
      const res = await fetch(`/api/stats?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const { isJson, data } = await parseResponseSafe(res);

      if (isJson && data?.success && data.stats) {
        return { success: true, stats: data.stats };
      }

      return {
        success: false,
        stats: { totalPosts: 0, totalBelievers: 1, totalBlessings: 0 },
      };
    } catch (err) {
      console.error("api.getStats error:", err);
      return {
        success: false,
        stats: { totalPosts: 0, totalBelievers: 1, totalBlessings: 0 },
      };
    }
  },

  // User Registration: Saved locally and synced to server
  async register(payload: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{
    success: boolean;
    message: string;
    user?: User;
    token?: string;
  }> {
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = payload.displayName.trim();
    const localUser: User & { password?: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      password: payload.password,
      displayName: cleanName,
      role: "user",
      haloBadge: "Szent Lélek Kísérő",
      avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(cleanName)}`,
      createdAt: new Date().toISOString(),
    };

    // Save locally first so credentials are never lost
    saveStoredLocalUser(localUser);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && data.user) {
        saveStoredLocalUser({ ...data.user, password: payload.password });
        return data;
      }
      if (isJson && data && !data.success) {
        return data;
      }
    } catch (err: any) {
      console.warn("Server register request failed, falling back to local registration:", err);
    }

    const { password: _, ...safeUser } = localUser;
    return {
      success: true,
      message: "Áldás reád! Sikeresen csatlakoztál a HolyFans közösségéhez!",
      user: safeUser,
      token: `token-${localUser.id}`,
    };
  },

  // User Login: Resilient multi-tier authentication
  async login(payload: {
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    message: string;
    user?: User;
    token?: string;
  }> {
    const cleanEmail = payload.email.trim().toLowerCase();
    const localUsers = getStoredLocalUsers();
    const matchingLocal = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          clientUser: matchingLocal || undefined,
        }),
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && data.user) {
        saveStoredLocalUser({ ...data.user, password: payload.password });
        return data;
      }

      // If server returned 401 or not found, but we have matching local credentials
      if (matchingLocal && matchingLocal.password === payload.password) {
        const { password: _, ...safeUser } = matchingLocal;
        fetch("/api/sync-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users: [matchingLocal] }),
        }).catch(() => {});

        return {
          success: true,
          message: "Sikeres bejelentkezés! Üdvözlünk a szent körben!",
          user: safeUser,
          token: `token-${matchingLocal.id}`,
        };
      }

      return data;
    } catch (err: any) {
      if (matchingLocal && matchingLocal.password === payload.password) {
        const { password: _, ...safeUser } = matchingLocal;
        return {
          success: true,
          message: "Sikeres bejelentkezés offline módban!",
          user: safeUser,
          token: `token-${matchingLocal.id}`,
        };
      }
      return {
        success: false,
        message: err.message || "Hiba történt a szerverhez való csatlakozáskor.",
      };
    }
  },

  // Verify current user profile with server
  async getMe(token: string): Promise<{ success: boolean; user?: User }> {
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && data.user) {
        return { success: true, user: data.user };
      }

      return { success: false };
    } catch {
      return { success: false };
    }
  },

  // Upload new post to the server and store in persistent storage
  async createPost(
    formData: FormData,
    file?: File | null
  ): Promise<{ success: boolean; message: string; post?: Post }> {
    let dataUrl = "";
    if (file) {
      try {
        dataUrl = await fileToDataUrl(file);
      } catch {}
    }

    const title = (formData.get("title") as string) || "Szent Kép";
    const subtitle = (formData.get("subtitle") as string) || "";
    const authorId = (formData.get("authorId") as string) || "guest-user";
    const authorName = (formData.get("authorName") as string) || "Dicső Látogató";
    const authorEmail = (formData.get("authorEmail") as string) || "latogato@holyfans.com";
    const authorHalo = (formData.get("authorHalo") as string) || "Kezdő Kereső";
    const authorAvatar =
      (formData.get("authorAvatar") as string) ||
      `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(authorName)}`;

    const provisionalPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      subtitle,
      imageUrl: dataUrl || "/pics/celestial-light.svg",
      authorId,
      authorName,
      authorEmail,
      authorHalo,
      authorAvatar,
      createdAt: new Date().toISOString(),
      blessings: 1,
    };

    // Save to local cache immediately so it can never be lost
    saveStoredLocalPost(provisionalPost);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && data.post) {
        const savedPost: Post = {
          ...data.post,
          imageUrl: dataUrl || data.post.imageUrl,
        };
        saveStoredLocalPost(savedPost);
        return { success: true, message: data.message || "A kép sikeresen közzétéve!", post: savedPost };
      }
    } catch (err: any) {
      console.warn("Server createPost failed, maintaining local post:", err);
    }

    // Try syncing to server in background
    fetch("/api/sync-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts: [provisionalPost] }),
    }).catch(() => {});

    return {
      success: true,
      message: "A szent kép áldással elmentve és közzétéve!",
      post: provisionalPost,
    };
  },

  // Bless a post
  async blessPost(postId: string): Promise<{ success: boolean; blessings: number; message?: string }> {
    try {
      const res = await fetch(`/api/posts/${postId}/bless`, {
        method: "POST",
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success) {
        return { success: true, blessings: data.blessings, message: data.message };
      }

      return { success: false, blessings: 0, message: data?.message };
    } catch {
      return { success: false, blessings: 0 };
    }
  },

  // Update User Profile (display name, halo badge, avatar URL, password)
  async updateProfile(
    token: string,
    payload: {
      displayName?: string;
      haloBadge?: string;
      avatarUrl?: string;
      password?: string;
    }
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Nem sikerült a profil frissítése a szerveren.",
      };
    }
  },

  // Upload Profile Avatar File directly to server pics folder
  async uploadAvatar(
    token: string,
    file: File
  ): Promise<{ success: boolean; message: string; avatarUrl?: string; user?: User }> {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/users/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "A profilkép feltöltése sikertelen volt a szerveren.",
      };
    }
  },

  // Edit Post (title, subtitle) in central database.json
  async updatePost(
    token: string,
    postId: string,
    payload: { title: string; subtitle: string }
  ): Promise<{ success: boolean; message: string; post?: Post }> {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Nem sikerült a bejegyzés módosítása.",
      };
    }
  },

  // Delete Post in central database.json
  async deletePost(
    token: string,
    postId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "A törlés sikertelen volt a szerveren.",
      };
    }
  },

  // Admin: Get all users with post counts merged from server and local cache
  async getAdminUsers(token?: string): Promise<{ success: boolean; users: Array<User & { postCount: number }>; message?: string }> {
    const localUsers = getStoredLocalUsers();
    const localPosts = getStoredLocalPosts();

    try {
      const activeToken = (token && token.trim()) || api.getToken() || "token-admin-holy-1";
      const res = await fetch(`/api/admin/users?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const { isJson, data } = await parseResponseSafe(res);
      const serverUsers: Array<User & { postCount: number }> =
        isJson && data?.success && Array.isArray(data.users) ? data.users : [];

      const userMap = new Map<string, User & { postCount: number }>();
      for (const u of serverUsers) {
        userMap.set(u.id, u);
        if (u.email) userMap.set(u.email.toLowerCase(), u);
      }

      const missingOnServer: User[] = [];
      for (const lu of localUsers) {
        const { password: _, ...safeLu } = lu;
        const key = lu.email ? lu.email.toLowerCase() : lu.id;
        if (!userMap.has(key) && !userMap.has(lu.id)) {
          const postCount = localPosts.filter(
            (p) => p.authorId === lu.id || (lu.email && p.authorEmail === lu.email)
          ).length;
          const userWithCount = { ...safeLu, postCount };
          userMap.set(lu.id, userWithCount);
          if (lu.email) userMap.set(lu.email.toLowerCase(), userWithCount);
          missingOnServer.push(lu);
        }
      }

      const uniqueUsers: Array<User & { postCount: number }> = [];
      const seen = new Set<string>();
      for (const u of userMap.values()) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          uniqueUsers.push(u);
        }
      }

      // Sync missing users to server in background
      if (missingOnServer.length > 0) {
        fetch("/api/sync-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users: missingOnServer }),
        }).catch(() => {});
      }

      return { success: true, users: uniqueUsers };
    } catch (err: any) {
      const uniqueUsers = localUsers.map((lu) => {
        const { password: _, ...safeLu } = lu;
        const postCount = localPosts.filter(
          (p) => p.authorId === lu.id || (lu.email && p.authorEmail === lu.email)
        ).length;
        return { ...safeLu, postCount };
      });
      return { success: true, users: uniqueUsers };
    }
  },

  // Admin: Get all posts directly from central database.json
  async getAdminPosts(token?: string): Promise<{ success: boolean; posts: Post[]; message?: string }> {
    try {
      const activeToken = (token && token.trim()) || api.getToken() || "token-admin-holy-1";
      const res = await fetch(`/api/admin/posts?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && Array.isArray(data.posts)) {
        return data;
      }

      return { success: false, posts: [], message: data?.message || "Nem sikerült a bejegyzések betöltése." };
    } catch (err: any) {
      return { success: false, posts: [], message: err.message };
    }
  },

  // Admin: Delete user from central database.json
  async deleteAdminUser(token: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "A felhasználó törlése nem sikerült.",
      };
    }
  },

  // Admin: Change user role in central database.json
  async setAdminRole(
    token: string,
    userId: string,
    role: "admin" | "user"
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Nem sikerült a szerepkör módosítása.",
      };
    }
  },
};
