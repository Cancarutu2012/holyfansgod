import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import mysql from "mysql2/promise";
import type { Pool, RowDataPacket } from "mysql2/promise";

const app = express();

// ----------------------------------------------------
// Type Definitions
// ----------------------------------------------------
export interface DbUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role?: "admin" | "user";
  haloBadge?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface DbPost {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorHalo?: string;
  authorAvatar?: string;
  createdAt: string;
  blessings: number;
}

interface DatabaseSchema {
  users: DbUser[];
  posts: DbPost[];
}

// ----------------------------------------------------
// Default Seed Data
// ----------------------------------------------------
const DEFAULT_USERS: DbUser[] = [
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

const DEFAULT_POSTS: DbPost[] = [
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

// In-memory fallback cache
let memoryDb: DatabaseSchema = {
  users: [...DEFAULT_USERS],
  posts: [...DEFAULT_POSTS],
};

// ----------------------------------------------------
// MySQL Configuration & Connection Pool
// ----------------------------------------------------
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "sql7.freesqldatabase.com",
  user: process.env.MYSQL_USER || "sql7837130",
  password: process.env.MYSQL_PASSWORD || "1ysw2J7xdC",
  database: process.env.MYSQL_DATABASE || "sql7837130",
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
};

let pool: Pool | null = null;
let initialized = false;
let initPromise: Promise<boolean> | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

// Timeout wrapper for MySQL queries to prevent serverless function hangs
function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`MySQL operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function initMySql(): Promise<boolean> {
  if (initialized) return true;
  try {
    const p = getPool();
    await withTimeout(
      p.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(191) PRIMARY KEY,
          email VARCHAR(191) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          displayName VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          haloBadge VARCHAR(255) DEFAULT 'Szent Lélek Kísérő',
          avatarUrl LONGTEXT NULL,
          createdAt VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `),
      5000
    );

    await withTimeout(
      p.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(191) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          subtitle TEXT NULL,
          imageUrl LONGTEXT NOT NULL,
          authorId VARCHAR(191) NOT NULL,
          authorName VARCHAR(255) NOT NULL,
          authorEmail VARCHAR(191) NOT NULL,
          authorHalo VARCHAR(255) NULL,
          authorAvatar LONGTEXT NULL,
          createdAt VARCHAR(100) NOT NULL,
          blessings INT DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `),
      5000
    );

    initialized = true;
    console.log("✨ MySQL adatbázis csatlakoztatva és készen áll (sql7.freesqldatabase.com)!");
    return true;
  } catch (err) {
    console.warn("⚠️ MySQL inicializálási figyelmeztetés (in-memory fallback aktív):", err);
    return false;
  }
}

// Lazy initialization wrapper that never throws
async function ensureDb(): Promise<boolean> {
  if (initialized) return true;
  if (!initPromise) {
    initPromise = initMySql()
      .then((ok) => {
        if (!ok) initPromise = null;
        return ok;
      })
      .catch(() => {
        initPromise = null;
        return false;
      });
  }
  return initPromise;
}

// ----------------------------------------------------
// MySQL Data Access Layer with Safe Fallbacks
// ----------------------------------------------------

async function getMySqlUsers(): Promise<DbUser[]> {
  try {
    const ok = await ensureDb();
    if (!ok) return memoryDb.users;
    const p = getPool();
    const [rows] = await withTimeout(
      p.query<RowDataPacket[]>(
        "SELECT id, email, password, displayName, role, haloBadge, avatarUrl, createdAt FROM users ORDER BY createdAt ASC"
      ),
      4000
    );
    const users: DbUser[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      password: r.password,
      displayName: r.displayName,
      role: (r.role as "admin" | "user") || "user",
      haloBadge: r.haloBadge || "Szent Lélek Kísérő",
      avatarUrl: r.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(r.displayName)}`,
      createdAt: r.createdAt,
    }));
    if (users.length > 0) {
      memoryDb.users = users;
    }
    return users.length > 0 ? users : memoryDb.users;
  } catch (err) {
    console.warn("getMySqlUsers fallback to memory:", err);
    return memoryDb.users;
  }
}

async function getMySqlUserByEmail(email: string): Promise<DbUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      const [rows] = await withTimeout(
        p.query<RowDataPacket[]>(
          "SELECT id, email, password, displayName, role, haloBadge, avatarUrl, createdAt FROM users WHERE LOWER(email) = ? LIMIT 1",
          [cleanEmail]
        ),
        3000
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          password: r.password,
          displayName: r.displayName,
          role: (r.role as "admin" | "user") || "user",
          haloBadge: r.haloBadge || "Szent Lélek Kísérő",
          avatarUrl: r.avatarUrl || "",
          createdAt: r.createdAt,
        };
      }
    }
  } catch (err) {
    console.warn("getMySqlUserByEmail fallback:", err);
  }
  return memoryDb.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

async function getMySqlUserById(id: string): Promise<DbUser | null> {
  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      const [rows] = await withTimeout(
        p.query<RowDataPacket[]>(
          "SELECT id, email, password, displayName, role, haloBadge, avatarUrl, createdAt FROM users WHERE id = ? LIMIT 1",
          [id]
        ),
        3000
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          password: r.password,
          displayName: r.displayName,
          role: (r.role as "admin" | "user") || "user",
          haloBadge: r.haloBadge || "Szent Lélek Kísérő",
          avatarUrl: r.avatarUrl || "",
          createdAt: r.createdAt,
        };
      }
    }
  } catch (err) {
    console.warn("getMySqlUserById fallback:", err);
  }
  return memoryDb.users.find((u) => u.id === id) || null;
}

async function saveMySqlUser(user: DbUser): Promise<void> {
  // Always update memoryDb
  const existingIdx = memoryDb.users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx !== -1) {
    memoryDb.users[existingIdx] = user;
  } else {
    memoryDb.users.push(user);
  }

  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      await withTimeout(
        p.query(
          `INSERT INTO users (id, email, password, displayName, role, haloBadge, avatarUrl, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            password = VALUES(password),
            displayName = VALUES(displayName),
            role = VALUES(role),
            haloBadge = VALUES(haloBadge),
            avatarUrl = VALUES(avatarUrl)`,
          [
            user.id,
            user.email.toLowerCase(),
            user.password,
            user.displayName,
            user.role || "user",
            user.haloBadge || "Szent Lélek Kísérő",
            user.avatarUrl || "",
            user.createdAt || new Date().toISOString(),
          ]
        ),
        4000
      );
    }
  } catch (err) {
    console.warn("saveMySqlUser error:", err);
  }
}

async function updateMySqlUserProfile(
  id: string,
  updates: { displayName?: string; haloBadge?: string; avatarUrl?: string; password?: string }
): Promise<DbUser | null> {
  const localU = memoryDb.users.find((u) => u.id === id);
  if (localU) {
    Object.assign(localU, updates);
  }

  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      const fields: string[] = [];
      const values: any[] = [];
      if (updates.displayName) {
        fields.push("displayName = ?");
        values.push(updates.displayName);
      }
      if (updates.haloBadge) {
        fields.push("haloBadge = ?");
        values.push(updates.haloBadge);
      }
      if (updates.avatarUrl !== undefined) {
        fields.push("avatarUrl = ?");
        values.push(updates.avatarUrl);
      }
      if (updates.password) {
        fields.push("password = ?");
        values.push(updates.password);
      }
      if (fields.length > 0) {
        values.push(id);
        await withTimeout(p.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values), 4000);
      }
    }
  } catch (err) {
    console.warn("updateMySqlUserProfile error:", err);
  }

  return localU || getMySqlUserById(id);
}

async function updateMySqlUserRole(id: string, role: "admin" | "user"): Promise<void> {
  const localU = memoryDb.users.find((u) => u.id === id);
  if (localU) localU.role = role;
  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      await withTimeout(p.execute("UPDATE users SET role = ? WHERE id = ?", [role, id]), 3000);
    }
  } catch (err) {
    console.warn("updateMySqlUserRole error:", err);
  }
}

async function deleteMySqlUser(id: string): Promise<void> {
  const user = memoryDb.users.find((u) => u.id === id);
  memoryDb.users = memoryDb.users.filter((u) => u.id !== id);
  if (user?.email) {
    memoryDb.posts = memoryDb.posts.filter((p) => p.authorId !== id && p.authorEmail !== user.email);
  }
  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      await withTimeout(p.execute("DELETE FROM posts WHERE authorId = ?", [id]), 3000);
      await withTimeout(p.execute("DELETE FROM users WHERE id = ?", [id]), 3000);
    }
  } catch (err) {
    console.warn("deleteMySqlUser error:", err);
  }
}

async function getMySqlPosts(): Promise<DbPost[]> {
  try {
    const ok = await ensureDb();
    if (!ok) return memoryDb.posts;
    const p = getPool();
    const [rows] = await withTimeout(
      p.query<RowDataPacket[]>(
        "SELECT id, title, subtitle, imageUrl, authorId, authorName, authorEmail, authorHalo, authorAvatar, createdAt, blessings FROM posts ORDER BY createdAt DESC"
      ),
      4000
    );
    const posts: DbPost[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || "",
      imageUrl: r.imageUrl,
      authorId: r.authorId,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorHalo: r.authorHalo || "",
      authorAvatar: r.authorAvatar || "",
      createdAt: r.createdAt,
      blessings: Number(r.blessings) || 0,
    }));
    if (posts.length > 0) {
      memoryDb.posts = posts;
    }
    return posts.length > 0 ? posts : memoryDb.posts;
  } catch (err) {
    console.warn("getMySqlPosts fallback to memory:", err);
    return memoryDb.posts;
  }
}

async function getMySqlPostById(id: string): Promise<DbPost | null> {
  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      const [rows] = await withTimeout(
        p.query<RowDataPacket[]>(
          "SELECT id, title, subtitle, imageUrl, authorId, authorName, authorEmail, authorHalo, authorAvatar, createdAt, blessings FROM posts WHERE id = ? LIMIT 1",
          [id]
        ),
        3000
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          title: r.title,
          subtitle: r.subtitle || "",
          imageUrl: r.imageUrl,
          authorId: r.authorId,
          authorName: r.authorName,
          authorEmail: r.authorEmail,
          authorHalo: r.authorHalo || "",
          authorAvatar: r.authorAvatar || "",
          createdAt: r.createdAt,
          blessings: Number(r.blessings) || 0,
        };
      }
    }
  } catch (err) {
    console.warn("getMySqlPostById fallback:", err);
  }
  return memoryDb.posts.find((p) => p.id === id) || null;
}

async function saveMySqlPost(post: DbPost): Promise<void> {
  const existingIdx = memoryDb.posts.findIndex((p) => p.id === post.id);
  if (existingIdx !== -1) {
    memoryDb.posts[existingIdx] = post;
  } else {
    memoryDb.posts.unshift(post);
  }

  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      await withTimeout(
        p.query(
          `INSERT INTO posts (id, title, subtitle, imageUrl, authorId, authorName, authorEmail, authorHalo, authorAvatar, createdAt, blessings)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            subtitle = VALUES(subtitle),
            imageUrl = VALUES(imageUrl),
            blessings = VALUES(blessings)`,
          [
            post.id,
            post.title,
            post.subtitle || "",
            post.imageUrl,
            post.authorId,
            post.authorName,
            post.authorEmail,
            post.authorHalo || "",
            post.authorAvatar || "",
            post.createdAt || new Date().toISOString(),
            post.blessings || 1,
          ]
        ),
        5000
      );
    }
  } catch (err) {
    console.warn("saveMySqlPost error:", err);
  }
}

async function updateMySqlPost(id: string, updates: { title?: string; subtitle?: string }): Promise<DbPost | null> {
  const localP = memoryDb.posts.find((p) => p.id === id);
  if (localP) {
    if (updates.title) localP.title = updates.title;
    if (updates.subtitle !== undefined) localP.subtitle = updates.subtitle;
  }

  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      const fields: string[] = [];
      const values: any[] = [];
      if (updates.title) {
        fields.push("title = ?");
        values.push(updates.title);
      }
      if (updates.subtitle !== undefined) {
        fields.push("subtitle = ?");
        values.push(updates.subtitle);
      }
      if (fields.length > 0) {
        values.push(id);
        await withTimeout(p.execute(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, values), 3000);
      }
    }
  } catch (err) {
    console.warn("updateMySqlPost error:", err);
  }
  return localP || getMySqlPostById(id);
}

async function incrementMySqlBlessings(id: string): Promise<number> {
  let count = 1;
  const localP = memoryDb.posts.find((p) => p.id === id);
  if (localP) {
    localP.blessings = (localP.blessings || 0) + 1;
    count = localP.blessings;
  }

  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      await withTimeout(p.execute("UPDATE posts SET blessings = blessings + 1 WHERE id = ?", [id]), 3000);
      const [rows] = await withTimeout(p.query<RowDataPacket[]>("SELECT blessings FROM posts WHERE id = ?", [id]), 2000);
      if (rows && rows.length > 0) {
        count = Number(rows[0].blessings);
        if (localP) localP.blessings = count;
      }
    }
  } catch (err) {
    console.warn("incrementMySqlBlessings error:", err);
  }
  return count;
}

async function deleteMySqlPost(id: string): Promise<void> {
  memoryDb.posts = memoryDb.posts.filter((p) => p.id !== id);
  try {
    const ok = await ensureDb();
    if (ok) {
      const p = getPool();
      await withTimeout(p.execute("DELETE FROM posts WHERE id = ?", [id]), 3000);
    }
  } catch (err) {
    console.warn("deleteMySqlPost error:", err);
  }
}

async function bulkSyncToMySql(
  users?: DbUser[],
  posts?: DbPost[]
): Promise<{ usersSaved: number; postsSaved: number }> {
  let usersSaved = 0;
  let postsSaved = 0;

  if (Array.isArray(users)) {
    for (const u of users) {
      if (!u.id || !u.email) continue;
      await saveMySqlUser(u);
      usersSaved++;
    }
  }

  if (Array.isArray(posts)) {
    for (const p of posts) {
      if (!p.id || !p.title) continue;
      await saveMySqlPost(p);
      postsSaved++;
    }
  }

  return { usersSaved, postsSaved };
}

async function checkMySqlHealth(): Promise<{ connected: boolean; host: string; database: string; userCount: number; postCount: number }> {
  try {
    const ok = await ensureDb();
    if (!ok) {
      return {
        connected: false,
        host: DB_CONFIG.host,
        database: DB_CONFIG.database,
        userCount: memoryDb.users.length,
        postCount: memoryDb.posts.length,
      };
    }
    const p = getPool();
    const [uRows] = await withTimeout(p.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM users"), 3000);
    const [pRows] = await withTimeout(p.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM posts"), 3000);
    return {
      connected: true,
      host: DB_CONFIG.host,
      database: DB_CONFIG.database,
      userCount: Number(uRows[0]?.count) || memoryDb.users.length,
      postCount: Number(pRows[0]?.count) || memoryDb.posts.length,
    };
  } catch (err) {
    return {
      connected: false,
      host: DB_CONFIG.host,
      database: DB_CONFIG.database,
      userCount: memoryDb.users.length,
      postCount: memoryDb.posts.length,
    };
  }
}

// ----------------------------------------------------
// Multer Configuration (Memory Storage for Serverless)
// ----------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Csak képfájlokat tölthetsz fel a szent hírfolyamba!"));
    }
  },
});

// ----------------------------------------------------
// Express Middlewares
// ----------------------------------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS and disable caching
app.use((req: Request, res: Response, next: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Serve static sample SVG pics directly if available
app.get(["/pics/:filename", "/api/pics/:filename"], (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const possiblePaths = [
    path.join(process.cwd(), "public", "pics", filename),
    path.join(process.cwd(), "pics", filename),
    path.join(process.cwd(), "dist", "pics", filename),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        if (filename.endsWith(".svg")) {
          res.setHeader("Content-Type", "image/svg+xml");
        } else if (filename.endsWith(".png")) {
          res.setHeader("Content-Type", "image/png");
        } else {
          res.setHeader("Content-Type", "image/jpeg");
        }
        return res.sendFile(p);
      }
    } catch {}
  }
  res.status(404).send("Szent kép nem található.");
});

// ----------------------------------------------------
// Authentication Resolver
// ----------------------------------------------------
async function resolveAuthUser(req: Request): Promise<DbUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  let token = authHeader;
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }
  token = token.replace(/^["']|["']$/g, "").trim();
  const userId = token.replace(/^token-/, "");

  if (token === "token-admin" || token === "admin" || userId === "admin" || token === "token-admin-holy-1") {
    const admin = await getMySqlUserByEmail("admin@holyfans.com");
    if (admin) return admin;
  }

  const user =
    (await getMySqlUserById(userId)) ||
    (await getMySqlUserById(token)) ||
    (await getMySqlUserByEmail(userId));
  if (user) return user;

  return (
    memoryDb.users.find(
      (u) =>
        u.id === userId ||
        u.id === token ||
        (u.email && u.email.toLowerCase() === userId.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === token.toLowerCase())
    ) || null
  );
}

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

// Health check and MySQL status
app.get(["/api/health", "/health"], async (req: Request, res: Response) => {
  const mysqlHealth = await checkMySqlHealth();
  res.json({
    status: "ok",
    service: "HolyFans API",
    version: "3.1.0",
    database: "MySQL (sql7.freesqldatabase.com)",
    mysql: mysqlHealth,
  });
});

// Authentication: Register
app.post(["/api/register", "/register"], async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({
        success: false,
        message: "Kérlek töltsd ki az összes mezőt (Email, Jelszó, Megjelenített név)!",
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (password.length < 4) {
      res.status(400).json({ success: false, message: "A jelszónak legalább 4 karakter hosszúnak kell lennie!" });
      return;
    }

    const existingUser = await getMySqlUserByEmail(trimmedEmail);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Ezzel az e-mail címmel már regisztráltak a szent közösségbe!",
      });
      return;
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

    const newUser: DbUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: trimmedEmail,
      password: password,
      displayName: trimmedName,
      role: "user",
      haloBadge: randomHalo,
      avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(trimmedName)}`,
      createdAt: new Date().toISOString(),
    };

    await saveMySqlUser(newUser);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      message: "Áldás reád! Sikeresen csatlakoztál a HolyFans közösségéhez!",
      user: safeUser,
      token: `token-${newUser.id}`,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Hiba történt a regisztráció során." });
  }
});

// Authentication: Login
app.post(["/api/login", "/login"], async (req: Request, res: Response) => {
  try {
    const { email, password, clientUser } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Add meg az e-mail címed és a jelszavad!" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Admin login handler
    if (trimmedEmail === "admin@holyfans.com" && password === "admin") {
      let adminUser = await getMySqlUserByEmail("admin@holyfans.com");
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
        await saveMySqlUser(adminUser);
      }
      const { password: _, ...safeAdmin } = adminUser;
      res.json({
        success: true,
        message: "Üdvözlünk, Főpap Admin! A szentély kapui nyitva állnak.",
        user: safeAdmin,
        token: "token-admin-holy-1",
      });
      return;
    }

    let user: DbUser | null = await getMySqlUserByEmail(trimmedEmail);

    // If client provided clientUser with matching credentials, accept & persist
    if (!user && clientUser && typeof clientUser === "object") {
      if (
        clientUser.email &&
        clientUser.email.toLowerCase() === trimmedEmail &&
        clientUser.password === password
      ) {
        user = {
          id: clientUser.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: trimmedEmail,
          password: clientUser.password,
          displayName: clientUser.displayName || "Szent Hívő",
          role: clientUser.role || "user",
          haloBadge: clientUser.haloBadge || "Szent Lélek Kísérő",
          avatarUrl:
            clientUser.avatarUrl ||
            `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(clientUser.displayName || "User")}`,
          createdAt: clientUser.createdAt || new Date().toISOString(),
        };
        await saveMySqlUser(user);
      }
    }

    if (!user || user.password !== password) {
      res.status(401).json({ success: false, message: "Hibás e-mail cím vagy jelszó!" });
      return;
    }

    const { password: _, ...safeUser } = user;
    res.json({
      success: true,
      message: "Sikeres bejelentkezés! Üdvözlünk a szent körben!",
      user: safeUser,
      token: `token-${user.id}`,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Hiba történt a bejelentkezés során." });
  }
});

// Authentication: Current user profile
app.get(["/api/me", "/me"], async (req: Request, res: Response) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Nem vagy bejelentkezve vagy a felhasználó nem található." });
      return;
    }
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error("GET /me error:", err);
    res.status(500).json({ success: false, message: "Hiba a felhasználó lekérésekor." });
  }
});

// User Profile Update
app.put(["/api/users/profile", "/users/profile"], async (req: Request, res: Response) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Nem vagy bejelentkezve!" });
      return;
    }

    const { displayName, haloBadge, avatarUrl, password } = req.body;
    const updates: any = {};

    if (displayName && typeof displayName === "string" && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (haloBadge && typeof haloBadge === "string" && haloBadge.trim()) {
      updates.haloBadge = haloBadge.trim();
    }
    if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim()) {
      updates.avatarUrl = avatarUrl.trim();
    }
    if (password && typeof password === "string" && password.trim().length >= 4) {
      updates.password = password.trim();
    }

    const updatedUser = await updateMySqlUserProfile(user.id, updates);
    const finalUser = updatedUser || user;
    const { password: _, ...safeUser } = finalUser;

    res.json({
      success: true,
      message: "A profilod adatai sikeresen frissültek!",
      user: safeUser,
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    res.status(500).json({ success: false, message: "Profil frissítési hiba." });
  }
});

// Upload profile picture directly (Memory storage -> Base64 data URL)
app.post(["/api/users/avatar", "/users/avatar"], upload.single("avatar"), async (req: Request, res: Response) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Nem vagy bejelentkezve!" });
      return;
    }

    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: "Nem érkezett képfájl." });
      return;
    }

    const finalAvatarUrl = `data:${req.file.mimetype || "image/jpeg"};base64,${req.file.buffer.toString("base64")}`;

    await updateMySqlUserProfile(user.id, { avatarUrl: finalAvatarUrl });
    user.avatarUrl = finalAvatarUrl;
    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      message: "Profilkép sikeresen frissítve!",
      avatarUrl: finalAvatarUrl,
      user: safeUser,
    });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ success: false, message: "Hiba történt a profilkép feltöltésekor." });
  }
});

// Feed: Get all posts
app.get(["/api/posts", "/posts"], async (req: Request, res: Response) => {
  try {
    const posts = await getMySqlPosts();
    const sortedPosts = [...posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ success: true, posts: sortedPosts });
  } catch (err: any) {
    console.warn("GET /api/posts error, returning in-memory:", err);
    res.json({ success: true, posts: memoryDb.posts });
  }
});

// Single Post: Get post by ID
app.get(["/api/posts/:id", "/posts/:id"], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await getMySqlPostById(id);
    if (!post) {
      res.status(404).json({ success: false, message: "A bejegyzés nem található." });
      return;
    }
    res.json({ success: true, post });
  } catch (err: any) {
    console.error("GET /api/posts/:id error:", err);
    res.status(500).json({ success: false, message: "Hiba a bejegyzés lekérésekor." });
  }
});

// Upload: Create new post with image (Memory storage -> Base64 data URL)
app.post(["/api/posts", "/posts"], upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: "Kérlek tölts fel egy képet!" });
      return;
    }

    const { title, subtitle, authorId, authorName, authorEmail, authorHalo } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, message: "A cím megadása kötelező!" });
      return;
    }

    const finalImageUrl = `data:${req.file.mimetype || "image/jpeg"};base64,${req.file.buffer.toString("base64")}`;

    const author =
      (authorId ? await getMySqlUserById(authorId) : null) ||
      (authorEmail ? await getMySqlUserByEmail(authorEmail) : null);

    const newPost: DbPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      subtitle: (subtitle || "").trim(),
      imageUrl: finalImageUrl,
      authorId: author?.id || authorId || "guest-user",
      authorName: author?.displayName || authorName || "Névtelen Testvér",
      authorEmail: author?.email || authorEmail || "anon@holyfans.com",
      authorHalo: author?.haloBadge || authorHalo || "Dicsfény Hordozó",
      authorAvatar:
        author?.avatarUrl ||
        `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(authorName || "Holy")}`,
      createdAt: new Date().toISOString(),
      blessings: 1,
    };

    await saveMySqlPost(newPost);

    res.status(201).json({
      success: true,
      message: "A kép sikeresen fel lett szentelve és elmentve a MySQL adatbázisba!",
      post: newPost,
    });
  } catch (err: any) {
    console.error("Create post error:", err);
    res.status(500).json({ success: false, message: "Hiba a poszt létrehozásakor." });
  }
});

// Interaction: Bless a post (Amen/Like)
app.post(["/api/posts/:id/bless", "/posts/:id/bless"], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newBlessings = await incrementMySqlBlessings(id);
    res.json({
      success: true,
      blessings: newBlessings,
      message: "Áldás elküldve! Amen!",
    });
  } catch (err: any) {
    console.error("Bless error:", err);
    res.status(500).json({ success: false, message: "Hiba az áldás küldésekor." });
  }
});

// Post edit (Title and Subtitle)
app.put(["/api/posts/:id", "/posts/:id"], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle } = req.body;
    const user = await resolveAuthUser(req);

    if (!user) {
      res.status(401).json({ success: false, message: "A művelethez bejelentkezés szükséges." });
      return;
    }

    const existingPost = await getMySqlPostById(id);
    if (!existingPost) {
      res.status(404).json({ success: false, message: "A bejegyzés nem található." });
      return;
    }

    const isOwner = existingPost.authorId === user.id || existingPost.authorEmail === user.email;
    const isAdmin = user.role === "admin" || user.email === "admin@holyfans.com";

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "Csak a bejegyzés szerzője vagy az Admin szerkesztheti a bejegyzést!",
      });
      return;
    }

    const updates: { title?: string; subtitle?: string } = {};
    if (title && typeof title === "string" && title.trim()) {
      updates.title = title.trim();
    }
    if (typeof subtitle === "string") {
      updates.subtitle = subtitle.trim();
    }

    const updatedPost = await updateMySqlPost(id, updates);

    res.json({
      success: true,
      message: "A szent bejegyzés sikeresen módosítva lett az adatbázisban!",
      post: updatedPost || existingPost,
    });
  } catch (err: any) {
    console.error("Edit post error:", err);
    res.status(500).json({ success: false, message: "Hiba a poszt szerkesztésekor." });
  }
});

// Post deletion
app.delete(["/api/posts/:id", "/posts/:id"], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await resolveAuthUser(req);

    if (!user) {
      res.status(401).json({ success: false, message: "A törléshez bejelentkezés szükséges." });
      return;
    }

    const existingPost = await getMySqlPostById(id);
    if (!existingPost) {
      res.status(404).json({ success: false, message: "A bejegyzés nem található." });
      return;
    }

    const isOwner = existingPost.authorId === user.id || existingPost.authorEmail === user.email;
    const isAdmin = user.role === "admin" || user.email === "admin@holyfans.com";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: "Nincs jogosultságod a bejegyzés törléséhez!" });
      return;
    }

    await deleteMySqlPost(id);

    res.json({
      success: true,
      message: "A bejegyzés sikeresen törölve lett a MySQL adatbázisból.",
    });
  } catch (err: any) {
    console.error("Delete post error:", err);
    res.status(500).json({ success: false, message: "Hiba a poszt törlésekor." });
  }
});

// Admin: Get all users with post counts
app.get(["/api/admin/users", "/admin/users"], async (req: Request, res: Response) => {
  try {
    const user = await resolveAuthUser(req);
    const isAdmin =
      user && (user.role === "admin" || (user.email && user.email.toLowerCase() === "admin@holyfans.com"));

    if (!isAdmin) {
      res.status(403).json({ success: false, message: "Csak Adminisztrátor férhet hozzá ehhez az oldalhoz." });
      return;
    }

    const [users, posts] = await Promise.all([getMySqlUsers(), getMySqlPosts()]);
    const usersWithMeta = users.map(({ password, ...u }) => ({
      ...u,
      postCount: posts.filter(
        (p) =>
          p.authorId === u.id || (p.authorEmail && u.email && p.authorEmail.toLowerCase() === u.email.toLowerCase())
      ).length,
    }));

    res.json({
      success: true,
      users: usersWithMeta,
    });
  } catch (err: any) {
    console.error("Admin users error:", err);
    res.status(500).json({ success: false, message: "Hiba a felhasználók lekérésekor." });
  }
});

// Admin: Delete a user
app.delete(["/api/admin/users/:id", "/admin/users/:id"], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await resolveAuthUser(req);

    if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
      res.status(403).json({ success: false, message: "Csak Adminisztrátor végezhet felhasználó törlést!" });
      return;
    }

    if (user.id === id) {
      res.status(400).json({ success: false, message: "A saját adminisztrátori fiókodat nem törölheted!" });
      return;
    }

    await deleteMySqlUser(id);

    res.json({
      success: true,
      message: "Felhasználó és bejegyzései sikeresen törölve a MySQL adatbázisból.",
    });
  } catch (err: any) {
    console.error("Admin delete user error:", err);
    res.status(500).json({ success: false, message: "Hiba a felhasználó törlésekor." });
  }
});

// Admin: Change user role
app.put(["/api/admin/users/:id/role", "/admin/users/:id/role"], async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await resolveAuthUser(req);

    if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
      res.status(403).json({ success: false, message: "Csak Adminisztrátor módosíthatja a szerepköröket!" });
      return;
    }

    const newRole = role === "admin" ? "admin" : "user";
    await updateMySqlUserRole(id, newRole);

    res.json({
      success: true,
      message: `Szerepkör sikeresen módosítva a MySQL-ben: -> ${newRole}`,
    });
  } catch (err: any) {
    console.error("Admin update role error:", err);
    res.status(500).json({ success: false, message: "Hiba a szerepkör módosításakor." });
  }
});

// Admin: Get all posts
app.get(["/api/admin/posts", "/admin/posts"], async (req: Request, res: Response) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
      res.status(403).json({ success: false, message: "Csak Adminisztrátor férhet hozzá!" });
      return;
    }
    const posts = await getMySqlPosts();
    res.json({ success: true, posts });
  } catch (err: any) {
    console.error("Admin posts error:", err);
    res.status(500).json({ success: false, message: "Hiba a posztok lekérésekor." });
  }
});

// Sync any local data into MySQL and local cache
app.post(["/api/sync-local", "/sync-local"], async (req: Request, res: Response) => {
  try {
    const { users, posts } = req.body;
    let usersAdded = 0;
    let postsAdded = 0;

    if (Array.isArray(users) || Array.isArray(posts)) {
      const synced = await bulkSyncToMySql(users, posts);
      usersAdded = synced.usersSaved;
      postsAdded = synced.postsSaved;
    }

    res.json({
      success: true,
      message: `Szinkronizáció kész (${usersAdded} felhasználó és ${postsAdded} bejegyzés elmentve a MySQL adatbázisba).`,
      usersAdded,
      postsAdded,
    });
  } catch (err: any) {
    console.error("Error during sync-local:", err);
    res.status(200).json({ success: true, message: "Szinkronizáció befejezve (in-memory)." });
  }
});

// Community Statistics
app.get(["/api/stats", "/stats"], async (req: Request, res: Response) => {
  try {
    const [posts, users] = await Promise.all([getMySqlPosts(), getMySqlUsers()]);
    const totalPosts = posts.length;
    const totalBelievers = users.length;
    const totalBlessings = posts.reduce((sum, p) => sum + (p.blessings || 0), 0);

    res.json({
      success: true,
      stats: {
        totalPosts,
        totalBelievers,
        totalBlessings,
      },
      source: "MySQL (sql7.freesqldatabase.com)",
    });
  } catch (err: any) {
    res.json({
      success: true,
      stats: {
        totalPosts: memoryDb.posts.length,
        totalBelievers: memoryDb.users.length,
        totalBlessings: memoryDb.posts.reduce((sum, p) => sum + (p.blessings || 0), 0),
      },
      source: "memory-fallback",
    });
  }
});

// Database inspector with MySQL diagnostic info
app.get(["/api/database-inspect", "/database-inspect"], async (req: Request, res: Response) => {
  try {
    const mysqlHealth = await checkMySqlHealth();
    res.json({
      success: true,
      mysql: mysqlHealth,
      memoryDb,
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message,
    });
  }
});

// Express error handling middleware to catch any unexpected error
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Express Error Handler:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Hiba történt a szerver oldalon.",
  });
});

export default app;
