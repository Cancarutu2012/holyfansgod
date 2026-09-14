import { User, Post } from "../types";

const LOCAL_STORAGE_KEY = "holyfans_local_database_v1";

export const ADMIN_EMAIL = "admin@holyfans.com";
export const ADMIN_PASS = "admin";

export interface LocalDbUser extends User {
  password?: string;
}

export interface LocalDbSchema {
  users: LocalDbUser[];
  posts: Post[];
}

function getInitialDb(): LocalDbSchema {
  return {
    users: [
      {
        id: "admin-holy-1",
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        displayName: "Főpap Admin",
        role: "admin",
        haloBadge: "Arkangyal Adminisztrátor",
        avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    posts: [
      {
        id: "holy-seed-1",
        title: "Mennyei Fény és Béke",
        subtitle: "A dicsőség sugara átragyog a sötétségen és békességet hoz a lelkeknek.",
        imageUrl: "/pics/celestial-light.svg",
        authorId: "admin-holy-1",
        authorName: "Főpap Admin",
        authorEmail: ADMIN_EMAIL,
        authorHalo: "Arkangyal Adminisztrátor",
        authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
        createdAt: new Date().toISOString(),
        blessings: 12,
      },
      {
        id: "holy-seed-2",
        title: "Katedrális Arany Dicsősége",
        subtitle: "Fenséges boltozatok, melyek a magasságos fényét tükrözik vissza a hívők felé.",
        imageUrl: "/pics/cathedral-glory.svg",
        authorId: "seed-user-2",
        authorName: "Mária Világossága",
        authorEmail: "maria@holyfans.com",
        authorHalo: "Arany Dicsfény",
        authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Maria",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        blessings: 24,
      }
    ],
  };
}

export function readLocalDb(): LocalDbSchema {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDb();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    const users: LocalDbUser[] = Array.isArray(parsed.users) ? parsed.users : [];
    const posts: Post[] = Array.isArray(parsed.posts) ? parsed.posts : [];

    // Ensure admin exists in users
    const hasAdmin = users.some((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (!hasAdmin) {
      users.unshift({
        id: "admin-holy-1",
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        displayName: "Főpap Admin",
        role: "admin",
        haloBadge: "Arkangyal Adminisztrátor",
        avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ users, posts }));
    }

    return { users, posts };
  } catch (err) {
    console.warn("Could not read local database, using fallback", err);
    return getInitialDb();
  }
}

export function writeLocalDb(db: LocalDbSchema): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error("Could not write local database to localStorage", err);
  }
}

// Convert file to Base64 Data URL for client-side storage
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
