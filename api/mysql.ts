import mysql from "mysql2/promise";
import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

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

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "sql7.freesqldatabase.com",
  user: process.env.MYSQL_USER || "sql7837130",
  password: process.env.MYSQL_PASSWORD || "1ysw2J7xdC",
  database: process.env.MYSQL_DATABASE || "sql7837130",
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

let pool: Pool | null = null;
let initialized = false;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

export async function initMySql(): Promise<boolean> {
  if (initialized) return true;
  try {
    const p = getPool();
    await p.query(`
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
    `);

    await p.query(`
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
    `);

    initialized = true;
    console.log("✨ MySQL adatbázis sikeresen inicializálva (sql7.freesqldatabase.com)!");
    return true;
  } catch (err) {
    console.error("❌ MySQL inicializálási hiba:", err);
    return false;
  }
}

// ----------------- USERS -----------------

export async function getMySqlUsers(): Promise<DbUser[]> {
  try {
    await initMySql();
    const p = getPool();
    const [rows] = await p.query<RowDataPacket[]>(
      "SELECT id, email, password, displayName, role, haloBadge, avatarUrl, createdAt FROM users ORDER BY createdAt ASC"
    );
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      password: r.password,
      displayName: r.displayName,
      role: (r.role as "admin" | "user") || "user",
      haloBadge: r.haloBadge || "Szent Lélek Kísérő",
      avatarUrl: r.avatarUrl || "",
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error("getMySqlUsers error:", err);
    throw err;
  }
}

export async function getMySqlUserByEmail(email: string): Promise<DbUser | null> {
  try {
    await initMySql();
    const p = getPool();
    const [rows] = await p.query<RowDataPacket[]>(
      "SELECT id, email, password, displayName, role, haloBadge, avatarUrl, createdAt FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [email.trim()]
    );
    if (!rows || rows.length === 0) return null;
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
  } catch (err) {
    console.error("getMySqlUserByEmail error:", err);
    throw err;
  }
}

export async function getMySqlUserById(id: string): Promise<DbUser | null> {
  try {
    await initMySql();
    const p = getPool();
    const [rows] = await p.query<RowDataPacket[]>(
      "SELECT id, email, password, displayName, role, haloBadge, avatarUrl, createdAt FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) return null;
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
  } catch (err) {
    console.error("getMySqlUserById error:", err);
    throw err;
  }
}

export async function saveMySqlUser(user: DbUser): Promise<void> {
  try {
    await initMySql();
    const p = getPool();
    await p.execute(
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
    );
  } catch (err) {
    console.error("saveMySqlUser error:", err);
    throw err;
  }
}

export async function updateMySqlUserProfile(
  id: string,
  updates: { displayName?: string; haloBadge?: string; avatarUrl?: string; password?: string }
): Promise<DbUser | null> {
  try {
    await initMySql();
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
      await p.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

      // Also update authorName/authorAvatar/authorHalo in posts
      if (updates.displayName || updates.avatarUrl || updates.haloBadge) {
        const postFields: string[] = [];
        const postVals: any[] = [];
        if (updates.displayName) {
          postFields.push("authorName = ?");
          postVals.push(updates.displayName);
        }
        if (updates.avatarUrl) {
          postFields.push("authorAvatar = ?");
          postVals.push(updates.avatarUrl);
        }
        if (updates.haloBadge) {
          postFields.push("authorHalo = ?");
          postVals.push(updates.haloBadge);
        }
        postVals.push(id);
        await p.execute(`UPDATE posts SET ${postFields.join(", ")} WHERE authorId = ?`, postVals);
      }
    }

    return await getMySqlUserById(id);
  } catch (err) {
    console.error("updateMySqlUserProfile error:", err);
    throw err;
  }
}

export async function updateMySqlUserRole(id: string, role: "admin" | "user"): Promise<void> {
  try {
    await initMySql();
    const p = getPool();
    await p.execute("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  } catch (err) {
    console.error("updateMySqlUserRole error:", err);
    throw err;
  }
}

export async function deleteMySqlUser(id: string): Promise<void> {
  try {
    await initMySql();
    const p = getPool();
    await p.execute("DELETE FROM posts WHERE authorId = ?", [id]);
    await p.execute("DELETE FROM users WHERE id = ?", [id]);
  } catch (err) {
    console.error("deleteMySqlUser error:", err);
    throw err;
  }
}

// ----------------- POSTS -----------------

export async function getMySqlPosts(): Promise<DbPost[]> {
  try {
    await initMySql();
    const p = getPool();
    const [rows] = await p.query<RowDataPacket[]>(
      "SELECT id, title, subtitle, imageUrl, authorId, authorName, authorEmail, authorHalo, authorAvatar, createdAt, blessings FROM posts ORDER BY createdAt DESC"
    );
    return rows.map((r) => ({
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
  } catch (err) {
    console.error("getMySqlPosts error:", err);
    throw err;
  }
}

export async function getMySqlPostById(id: string): Promise<DbPost | null> {
  try {
    await initMySql();
    const p = getPool();
    const [rows] = await p.query<RowDataPacket[]>(
      "SELECT id, title, subtitle, imageUrl, authorId, authorName, authorEmail, authorHalo, authorAvatar, createdAt, blessings FROM posts WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0) return null;
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
  } catch (err) {
    console.error("getMySqlPostById error:", err);
    throw err;
  }
}

export async function saveMySqlPost(post: DbPost): Promise<void> {
  try {
    await initMySql();
    const p = getPool();
    await p.execute(
      `INSERT INTO posts (id, title, subtitle, imageUrl, authorId, authorName, authorEmail, authorHalo, authorAvatar, createdAt, blessings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         imageUrl = VALUES(imageUrl),
         authorName = VALUES(authorName),
         authorHalo = VALUES(authorHalo),
         authorAvatar = VALUES(authorAvatar),
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
    );
  } catch (err) {
    console.error("saveMySqlPost error:", err);
    throw err;
  }
}

export async function updateMySqlPost(
  id: string,
  updates: { title?: string; subtitle?: string }
): Promise<DbPost | null> {
  try {
    await initMySql();
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
      await p.execute(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, values);
    }

    return await getMySqlPostById(id);
  } catch (err) {
    console.error("updateMySqlPost error:", err);
    throw err;
  }
}

export async function incrementMySqlBlessings(id: string): Promise<number> {
  try {
    await initMySql();
    const p = getPool();
    await p.execute("UPDATE posts SET blessings = blessings + 1 WHERE id = ?", [id]);
    const [rows] = await p.query<RowDataPacket[]>("SELECT blessings FROM posts WHERE id = ?", [id]);
    if (rows && rows.length > 0) {
      return Number(rows[0].blessings);
    }
    return 1;
  } catch (err) {
    console.error("incrementMySqlBlessings error:", err);
    throw err;
  }
}

export async function deleteMySqlPost(id: string): Promise<void> {
  try {
    await initMySql();
    const p = getPool();
    await p.execute("DELETE FROM posts WHERE id = ?", [id]);
  } catch (err) {
    console.error("deleteMySqlPost error:", err);
    throw err;
  }
}

// ----------------- BULK SYNC & HEALTH -----------------

export async function bulkSyncToMySql(users?: DbUser[], posts?: DbPost[]): Promise<{ usersSaved: number; postsSaved: number }> {
  let usersSaved = 0;
  let postsSaved = 0;
  try {
    await initMySql();
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
  } catch (err) {
    console.warn("bulkSyncToMySql partial warning:", err);
  }
  return { usersSaved, postsSaved };
}

export async function checkMySqlHealth(): Promise<{
  connected: boolean;
  host: string;
  database: string;
  userCount: number;
  postCount: number;
  error?: string;
}> {
  try {
    await initMySql();
    const p = getPool();
    const [uRows] = await p.query<RowDataPacket[]>("SELECT COUNT(*) as cnt FROM users");
    const [pRows] = await p.query<RowDataPacket[]>("SELECT COUNT(*) as cnt FROM posts");
    return {
      connected: true,
      host: DB_CONFIG.host,
      database: DB_CONFIG.database,
      userCount: uRows[0]?.cnt || 0,
      postCount: pRows[0]?.cnt || 0,
    };
  } catch (err: any) {
    return {
      connected: false,
      host: DB_CONFIG.host,
      database: DB_CONFIG.database,
      userCount: 0,
      postCount: 0,
      error: err.message,
    };
  }
}
