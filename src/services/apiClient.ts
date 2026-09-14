import { User, Post } from "../types";
import { readLocalDb, writeLocalDb, fileToDataUrl } from "./localDb";

// Safe JSON parser that won't throw SyntaxError on 404 or text/html
async function parseResponseSafe(res: Response): Promise<{ isJson: boolean; data: any; status: number }> {
  const status = res.status;
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return { isJson: false, data: null, status };
  }

  try {
    const data = await res.json();
    return { isJson: true, data, status };
  } catch {
    return { isJson: false, data: null, status };
  }
}

export const api = {
  // Get active session token
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

  // Get all feed posts
  async getPosts(): Promise<{ success: boolean; posts: Post[] }> {
    try {
      const res = await fetch("/api/posts");
      const { isJson, data, status } = await parseResponseSafe(res);

      if (isJson && data?.success && Array.isArray(data.posts)) {
        return { success: true, posts: data.posts };
      }

      // If server returned 404 (e.g. static hosting on Vercel), use local fallback
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        return { success: true, posts: local.posts };
      }

      return { success: false, posts: [] };
    } catch {
      // Network error fallback
      const local = readLocalDb();
      return { success: true, posts: local.posts };
    }
  },

  // Get community stats
  async getStats(): Promise<{
    success: boolean;
    stats: { totalPosts: number; totalBelievers: number; totalBlessings: number };
  }> {
    try {
      const res = await fetch("/api/stats");
      const { isJson, data, status } = await parseResponseSafe(res);

      if (isJson && data?.success && data.stats) {
        return { success: true, stats: data.stats };
      }

      if (status === 404 || !isJson) {
        const local = readLocalDb();
        return {
          success: true,
          stats: {
            totalPosts: local.posts.length,
            totalBelievers: Math.max(local.users.length, 2),
            totalBlessings: local.posts.reduce((acc, p) => acc + (p.blessings || 0), 0),
          },
        };
      }

      const local = readLocalDb();
      return {
        success: true,
        stats: {
          totalPosts: local.posts.length,
          totalBelievers: local.users.length,
          totalBlessings: local.posts.reduce((acc, p) => acc + (p.blessings || 0), 0),
        },
      };
    } catch {
      const local = readLocalDb();
      return {
        success: true,
        stats: {
          totalPosts: local.posts.length,
          totalBelievers: Math.max(local.users.length, 2),
          totalBlessings: local.posts.reduce((acc, p) => acc + (p.blessings || 0), 0),
        },
      };
    }
  },

  // Register a new user
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

      const { isJson, data, status } = await parseResponseSafe(res);

      if (isJson && data) {
        return data;
      }

      // If Vercel returned 404, handle registration client-side!
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const trimmedEmail = payload.email.trim().toLowerCase();

        const exists = local.users.find((u) => u.email.toLowerCase() === trimmedEmail);
        if (exists) {
          return {
            success: false,
            message: "Ezzel az e-mail címmel már regisztráltak a szent közösségbe!",
          };
        }

        const haloTitles = [
          "Arany Dicsfény",
          "Szeráf Sugárzás",
          "Kerub Fényhozó",
          "Hajnalcsillag Áldott",
          "Mennyei Védelmező",
          "Szent Lélek Kísérő",
        ];
        const randomHalo = haloTitles[Math.floor(Math.random() * haloTitles.length)];

        const newUser: User = {
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          email: trimmedEmail,
          displayName: payload.displayName.trim(),
          haloBadge: randomHalo,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(payload.displayName)}`,
          createdAt: new Date().toISOString(),
        };

        local.users.push({ ...newUser, password: payload.password });
        writeLocalDb(local);

        return {
          success: true,
          message: "Áldás reád! Sikeresen csatlakoztál a HolyFans közösségéhez!",
          user: newUser,
          token: `token-${newUser.id}`,
        };
      }

      return { success: false, message: "A regisztráció sikertelen volt." };
    } catch {
      // Local fallback on network error
      const local = readLocalDb();
      const trimmedEmail = payload.email.trim().toLowerCase();
      const exists = local.users.find((u) => u.email.toLowerCase() === trimmedEmail);
      if (exists) {
        return {
          success: false,
          message: "Ezzel az e-mail címmel már regisztráltak a szent közösségbe!",
        };
      }

      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: trimmedEmail,
        displayName: payload.displayName.trim(),
        haloBadge: "Arany Dicsfény",
        avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(payload.displayName)}`,
        createdAt: new Date().toISOString(),
      };

      local.users.push({ ...newUser, password: payload.password });
      writeLocalDb(local);

      return {
        success: true,
        message: "Áldás reád! Sikeresen regisztráltál!",
        user: newUser,
        token: `token-${newUser.id}`,
      };
    }
  },

  // Login
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

      const { isJson, data, status } = await parseResponseSafe(res);

      if (isJson && data) {
        return data;
      }

      // If 404 from Vercel static server, fallback to localDb
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const trimmedEmail = payload.email.trim().toLowerCase();

        if (trimmedEmail === "admin@holyfans.com" && payload.password === "admin") {
          let adminUser = local.users.find((u) => u.email.toLowerCase() === "admin@holyfans.com");
          if (!adminUser) {
            adminUser = {
              id: "admin-holy-1",
              email: "admin@holyfans.com",
              password: "admin",
              displayName: "Főpap Admin",
              role: "admin",
              haloBadge: "Arkangyal Adminisztrátor",
              avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
              createdAt: "2026-01-01T00:00:00.000Z",
            };
            local.users.unshift(adminUser);
          } else {
            adminUser.role = "admin";
          }
          writeLocalDb(local);
          const { password: _, ...safeAdmin } = adminUser;
          return {
            success: true,
            message: "Sikeres bejelentkezés mint Főpap Adminisztrátor!",
            user: safeAdmin,
            token: `token-${adminUser.id}`,
          };
        }

        const user = local.users.find(
          (u) => u.email.toLowerCase() === trimmedEmail && u.password === payload.password
        );

        if (!user) {
          return {
            success: false,
            message: "Hibás e-mail cím vagy jelszó!",
          };
        }

        const { password: _, ...safeUser } = user;
        return {
          success: true,
          message: "Sikeres bejelentkezés! Üdvözlünk a szent körben!",
          user: safeUser,
          token: `token-${safeUser.id}`,
        };
      }

      return { success: false, message: "A bejelentkezés nem sikerült." };
    } catch {
      const local = readLocalDb();
      const trimmedEmail = payload.email.trim().toLowerCase();
      const user = local.users.find(
        (u) => u.email.toLowerCase() === trimmedEmail && u.password === payload.password
      );

      if (!user) {
        return { success: false, message: "Hibás e-mail cím vagy jelszó!" };
      }

      const { password: _, ...safeUser } = user;
      return {
        success: true,
        message: "Sikeres bejelentkezés!",
        user: safeUser,
        token: `token-${safeUser.id}`,
      };
    }
  },

  // Verify current user profile
  async getMe(token: string): Promise<{ success: boolean; user?: User }> {
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data?.success && data.user) {
        return { success: true, user: data.user };
      }

      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const userId = token.replace("token-", "");
        const user = local.users.find((u) => u.id === userId);
        if (user) {
          const { password: _, ...safeUser } = user;
          return { success: true, user: safeUser };
        }
      }

      return { success: false };
    } catch {
      const local = readLocalDb();
      const userId = token.replace("token-", "");
      const user = local.users.find((u) => u.id === userId);
      if (user) {
        const { password: _, ...safeUser } = user;
        return { success: true, user: safeUser };
      }
      return { success: false };
    }
  },

  // Upload new post
  async createPost(
    formData: FormData,
    file: File | null
  ): Promise<{ success: boolean; message: string; post?: Post }> {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      const { isJson, data, status } = await parseResponseSafe(res);

      if (isJson && data?.success && data.post) {
        return data;
      }

      // If server returned 404 on Vercel, store image client-side as DataURL!
      if (status === 404 || !isJson) {
        const title = (formData.get("title") as string) || "Cím nélküli szent pillanat";
        const subtitle = (formData.get("subtitle") as string) || "";
        const authorId = (formData.get("authorId") as string) || "guest-user";
        const authorName = (formData.get("authorName") as string) || "Dicső Látogató";
        const authorEmail = (formData.get("authorEmail") as string) || "latogato@holyfans.com";
        const authorHalo = (formData.get("authorHalo") as string) || "Arany Dicsfény";

        let imageUrl = "/pics/celestial-light.svg";
        if (file) {
          imageUrl = await fileToDataUrl(file);
        }

        const newPost: Post = {
          id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          subtitle: subtitle.trim(),
          imageUrl,
          authorId,
          authorName,
          authorEmail,
          authorHalo,
          authorAvatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(authorName)}`,
          createdAt: new Date().toISOString(),
          blessings: 1,
        };

        const local = readLocalDb();
        local.posts.unshift(newPost);
        writeLocalDb(local);

        return {
          success: true,
          message: "A kép sikeresen fel lett szentelve és közzétéve a hírfolyamban!",
          post: newPost,
        };
      }

      return {
        success: false,
        message: data?.message || "Hiba történt a feltöltés során.",
      };
    } catch {
      // Local fallback
      const title = (formData.get("title") as string) || "Cím nélküli szent pillanat";
      const subtitle = (formData.get("subtitle") as string) || "";
      const authorId = (formData.get("authorId") as string) || "guest-user";
      const authorName = (formData.get("authorName") as string) || "Dicső Látogató";
      const authorEmail = (formData.get("authorEmail") as string) || "latogato@holyfans.com";
      const authorHalo = (formData.get("authorHalo") as string) || "Arany Dicsfény";

      let imageUrl = "/pics/celestial-light.svg";
      if (file) {
        imageUrl = await fileToDataUrl(file);
      }

      const newPost: Post = {
        id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        subtitle: subtitle.trim(),
        imageUrl,
        authorId,
        authorName,
        authorEmail,
        authorHalo,
        authorAvatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(authorName)}`,
        createdAt: new Date().toISOString(),
        blessings: 1,
      };

      const local = readLocalDb();
      local.posts.unshift(newPost);
      writeLocalDb(local);

      return {
        success: true,
        message: "A kép sikeresen közzétéve!",
        post: newPost,
      };
    }
  },

  // Bless a post
  async blessPost(postId: string): Promise<{ success: boolean; blessings: number }> {
    try {
      const res = await fetch(`/api/posts/${postId}/bless`, {
        method: "POST",
      });

      const { isJson, data, status } = await parseResponseSafe(res);

      if (isJson && data?.success) {
        return { success: true, blessings: data.blessings };
      }

      // Fallback
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const post = local.posts.find((p) => p.id === postId);
        if (post) {
          post.blessings = (post.blessings || 0) + 1;
          writeLocalDb(local);
          return { success: true, blessings: post.blessings };
        }
      }

      return { success: false, blessings: 0 };
    } catch {
      const local = readLocalDb();
      const post = local.posts.find((p) => p.id === postId);
      if (post) {
        post.blessings = (post.blessings || 0) + 1;
        writeLocalDb(local);
        return { success: true, blessings: post.blessings };
      }
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

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data) {
        return data;
      }

      // Fallback
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const userId = token.replace("token-", "");
        const user = local.users.find((u) => u.id === userId);

        if (!user) {
          return { success: false, message: "A felhasználó nem található!" };
        }

        if (payload.displayName?.trim()) user.displayName = payload.displayName.trim();
        if (payload.haloBadge?.trim()) user.haloBadge = payload.haloBadge.trim();
        if (payload.avatarUrl?.trim()) user.avatarUrl = payload.avatarUrl.trim();
        if (payload.password && payload.password.length >= 4) user.password = payload.password;

        // Sync posts
        for (const post of local.posts) {
          if (post.authorId === user.id || post.authorEmail === user.email) {
            if (user.displayName) post.authorName = user.displayName;
            if (user.avatarUrl) post.authorAvatar = user.avatarUrl;
            if (user.haloBadge) post.authorHalo = user.haloBadge;
          }
        }

        writeLocalDb(local);
        const { password: _, ...safeUser } = user;
        return {
          success: true,
          message: "A profilod adatai áldással frissültek!",
          user: safeUser,
        };
      }

      return { success: false, message: "Nem sikerült a profil frissítése." };
    } catch {
      const local = readLocalDb();
      const userId = token.replace("token-", "");
      const user = local.users.find((u) => u.id === userId);

      if (!user) {
        return { success: false, message: "A felhasználó nem található!" };
      }

      if (payload.displayName?.trim()) user.displayName = payload.displayName.trim();
      if (payload.haloBadge?.trim()) user.haloBadge = payload.haloBadge.trim();
      if (payload.avatarUrl?.trim()) user.avatarUrl = payload.avatarUrl.trim();
      if (payload.password && payload.password.length >= 4) user.password = payload.password;

      for (const post of local.posts) {
        if (post.authorId === user.id || post.authorEmail === user.email) {
          if (user.displayName) post.authorName = user.displayName;
          if (user.avatarUrl) post.authorAvatar = user.avatarUrl;
          if (user.haloBadge) post.authorHalo = user.haloBadge;
        }
      }

      writeLocalDb(local);
      const { password: _, ...safeUser } = user;
      return {
        success: true,
        message: "A profilod adatai áldással frissültek!",
        user: safeUser,
      };
    }
  },

  // Upload Profile Avatar File
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

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data && data.success) {
        return data;
      }

      // Fallback: convert file to dataUrl and save in localDb
      if (status === 404 || !isJson) {
        const dataUrl = await fileToDataUrl(file);
        const local = readLocalDb();
        const userId = token.replace("token-", "");
        const user = local.users.find((u) => u.id === userId);

        if (!user) {
          return { success: false, message: "A felhasználó nem található." };
        }

        user.avatarUrl = dataUrl;
        for (const post of local.posts) {
          if (post.authorId === user.id || post.authorEmail === user.email) {
            post.authorAvatar = dataUrl;
          }
        }
        writeLocalDb(local);

        const { password: _, ...safeUser } = user;
        return {
          success: true,
          message: "Profilkép sikeresen beállítva!",
          avatarUrl: dataUrl,
          user: safeUser,
        };
      }

      return { success: false, message: "A profilkép feltöltése sikertelen." };
    } catch {
      const dataUrl = await fileToDataUrl(file);
      const local = readLocalDb();
      const userId = token.replace("token-", "");
      const user = local.users.find((u) => u.id === userId);

      if (!user) {
        return { success: false, message: "A felhasználó nem található." };
      }

      user.avatarUrl = dataUrl;
      for (const post of local.posts) {
        if (post.authorId === user.id || post.authorEmail === user.email) {
          post.authorAvatar = dataUrl;
        }
      }
      writeLocalDb(local);

      const { password: _, ...safeUser } = user;
      return {
        success: true,
        message: "Profilkép sikeresen beállítva!",
        avatarUrl: dataUrl,
        user: safeUser,
      };
    }
  },

  // Edit Post (title, subtitle)
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

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data) {
        return data;
      }

      // Fallback
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const post = local.posts.find((p) => p.id === postId);
        if (!post) {
          return { success: false, message: "A bejegyzés nem található." };
        }
        post.title = payload.title.trim();
        post.subtitle = (payload.subtitle || "").trim();
        writeLocalDb(local);

        return {
          success: true,
          message: "A bejegyzés sikeresen módosítva lett!",
          post,
        };
      }

      return { success: false, message: "Nem sikerült a bejegyzés módosítása." };
    } catch {
      const local = readLocalDb();
      const post = local.posts.find((p) => p.id === postId);
      if (!post) {
        return { success: false, message: "A bejegyzés nem található." };
      }
      post.title = payload.title.trim();
      post.subtitle = (payload.subtitle || "").trim();
      writeLocalDb(local);

      return {
        success: true,
        message: "A bejegyzés sikeresen módosítva lett!",
        post,
      };
    }
  },

  // Delete Post
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

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data) {
        return data;
      }

      // Fallback
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        local.posts = local.posts.filter((p) => p.id !== postId);
        writeLocalDb(local);
        return { success: true, message: "A bejegyzés sikeresen törölve lett." };
      }

      return { success: false, message: "A törlés sikertelen volt." };
    } catch {
      const local = readLocalDb();
      local.posts = local.posts.filter((p) => p.id !== postId);
      writeLocalDb(local);
      return { success: true, message: "A bejegyzés sikeresen törölve lett." };
    }
  },

  // Admin: Get all users with post counts
  async getAdminUsers(token: string): Promise<{ success: boolean; users: Array<User & { postCount: number }> }> {
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data?.success && Array.isArray(data.users)) {
        return data;
      }

      // Fallback
      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const users = local.users.map(({ password: _, ...u }) => ({
          ...u,
          postCount: local.posts.filter((p) => p.authorId === u.id || p.authorEmail === u.email).length,
        }));
        return { success: true, users };
      }

      return { success: false, users: [] };
    } catch {
      const local = readLocalDb();
      const users = local.users.map(({ password: _, ...u }) => ({
        ...u,
        postCount: local.posts.filter((p) => p.authorId === u.id || p.authorEmail === u.email).length,
      }));
      return { success: true, users };
    }
  },

  // Admin: Delete user
  async deleteAdminUser(token: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data) {
        return data;
      }

      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const target = local.users.find((u) => u.id === userId);
        if (!target) {
          return { success: false, message: "Felhasználó nem található." };
        }
        local.users = local.users.filter((u) => u.id !== userId);
        local.posts = local.posts.filter((p) => p.authorId !== userId && p.authorEmail !== target.email);
        writeLocalDb(local);
        return { success: true, message: `Felhasználó (${target.displayName}) sikeresen törölve.` };
      }

      return { success: false, message: "A felhasználó törlése nem sikerült." };
    } catch {
      const local = readLocalDb();
      const target = local.users.find((u) => u.id === userId);
      if (!target) {
        return { success: false, message: "Felhasználó nem található." };
      }
      local.users = local.users.filter((u) => u.id !== userId);
      local.posts = local.posts.filter((p) => p.authorId !== userId && p.authorEmail !== target.email);
      writeLocalDb(local);
      return { success: true, message: `Felhasználó (${target.displayName}) sikeresen törölve.` };
    }
  },

  // Admin: Change user role
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

      const { isJson, data, status } = await parseResponseSafe(res);
      if (isJson && data) {
        return data;
      }

      if (status === 404 || !isJson) {
        const local = readLocalDb();
        const target = local.users.find((u) => u.id === userId);
        if (!target) return { success: false, message: "Felhasználó nem található." };
        target.role = role;
        writeLocalDb(local);
        return { success: true, message: `Szerepkör sikeresen módosítva: ${role}` };
      }

      return { success: false, message: "Nem sikerült a szerepkör módosítása." };
    } catch {
      const local = readLocalDb();
      const target = local.users.find((u) => u.id === userId);
      if (!target) return { success: false, message: "Felhasználó nem található." };
      target.role = role;
      writeLocalDb(local);
      return { success: true, message: `Szerepkör sikeresen módosítva: ${role}` };
    }
  },
};

