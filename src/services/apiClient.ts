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
      return localStorage.getItem("holyfans_token");
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

  // Feed: Get all posts from the central server database
  async getPosts(): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const res = await fetch(`/api/posts?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const { isJson, data } = await parseResponseSafe(res);

      if (isJson && data?.success && Array.isArray(data.posts) && data.posts.length > 0) {
        return { success: true, posts: data.posts };
      }

      if (isJson && data?.success && Array.isArray(data.posts)) {
        return { success: true, posts: data.posts.length > 0 ? data.posts : FALLBACK_SEED_POSTS };
      }

      // Fallback to seed posts if server is waking up
      return { success: true, posts: FALLBACK_SEED_POSTS };
    } catch (err) {
      console.error("api.getPosts error:", err);
      return { success: true, posts: FALLBACK_SEED_POSTS };
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

  // User Registration: Saved directly in the shared database.json
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
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Hiba történt a szerverhez való csatlakozáskor.",
      };
    }
  },

  // User Login: Authenticated against the shared database.json
  async login(payload: {
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    message: string;
    user?: User;
    token?: string;
  }> {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
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

  // Upload new post to the server and store in pics folder & database.json
  async createPost(
    formData: FormData,
    _file?: File | null
  ): Promise<{ success: boolean; message: string; post?: Post }> {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      const { data } = await parseResponseSafe(res);
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Hiba történt a kép feltöltése során.",
      };
    }
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

  // Admin: Get all users with post counts directly from central database.json
  async getAdminUsers(token: string): Promise<{ success: boolean; users: Array<User & { postCount: number }>; message?: string }> {
    try {
      const res = await fetch(`/api/admin/users?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const { isJson, data } = await parseResponseSafe(res);
      if (isJson && data?.success && Array.isArray(data.users)) {
        return data;
      }

      return { success: false, users: [], message: data?.message || "Nem sikerült a felhasználók betöltése." };
    } catch (err: any) {
      return { success: false, users: [], message: err.message };
    }
  },

  // Admin: Get all posts directly from central database.json
  async getAdminPosts(token: string): Promise<{ success: boolean; posts: Post[]; message?: string }> {
    try {
      const res = await fetch(`/api/admin/posts?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
