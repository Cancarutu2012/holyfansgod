import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  initMySql,
  getMySqlUsers,
  getMySqlUserByEmail,
  getMySqlUserById,
  saveMySqlUser,
  updateMySqlUserProfile,
  updateMySqlUserRole,
  deleteMySqlUser,
  getMySqlPosts,
  getMySqlPostById,
  saveMySqlPost,
  updateMySqlPost,
  incrementMySqlBlessings,
  deleteMySqlPost,
  bulkSyncToMySql,
  checkMySqlHealth,
  type DbUser,
  type DbPost,
} from "./mysql.ts";

const app = express();

const IS_VERCEL = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_STORAGE_DIR = IS_VERCEL ? "/tmp" : process.cwd();
const DB_FILE = path.join(BASE_STORAGE_DIR, "database.json");
const PICS_DIR = path.join(BASE_STORAGE_DIR, "pics");

// Ensure pics directory exists
if (!fs.existsSync(PICS_DIR)) {
  try {
    fs.mkdirSync(PICS_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create pics directory:", err);
  }
}

// Database schema for fallback cache
interface DatabaseSchema {
  users: DbUser[];
  posts: DbPost[];
}

let memoryDb: DatabaseSchema | null = null;

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

// Initialize MySQL and sync with local storage
initMySql()
  .then(async (ok) => {
    if (ok) {
      console.log("✨ Connected to MySQL (sql7.freesqldatabase.com) successfully!");
      // Initial sync of default admin and demo records if table was empty
      const currentUsers = await getMySqlUsers().catch(() => []);
      if (currentUsers.length === 0) {
        for (const u of DEFAULT_USERS) {
          await saveMySqlUser(u).catch(() => {});
        }
      }
      const currentPosts = await getMySqlPosts().catch(() => []);
      if (currentPosts.length === 0) {
        for (const p of DEFAULT_POSTS) {
          await saveMySqlPost(p).catch(() => {});
        }
      }
    }
  })
  .catch((err) => {
    console.warn("MySQL startup initialization note:", err);
  });

function readDb(): DatabaseSchema {
  const rootDbFile = path.join(process.cwd(), "database.json");
  const userMap = new Map<string, DbUser>();
  const postMap = new Map<string, DbPost>();

  for (const u of DEFAULT_USERS) {
    userMap.set(u.id, u);
    if (u.email) userMap.set(u.email.toLowerCase(), u);
  }
  for (const p of DEFAULT_POSTS) {
    postMap.set(p.id, p);
  }

  try {
    if (fs.existsSync(rootDbFile)) {
      const parsedRoot = JSON.parse(fs.readFileSync(rootDbFile, "utf-8"));
      if (Array.isArray(parsedRoot.users)) {
        for (const u of parsedRoot.users) {
          userMap.set(u.id, u);
          if (u.email) userMap.set(u.email.toLowerCase(), u);
        }
      }
      if (Array.isArray(parsedRoot.posts)) {
        for (const p of parsedRoot.posts) {
          postMap.set(p.id, p);
        }
      }
    }
  } catch (err) {
    console.warn("Could not read rootDbFile:", err);
  }

  try {
    if (fs.existsSync(DB_FILE) && DB_FILE !== rootDbFile) {
      const parsedTmp = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      if (Array.isArray(parsedTmp.users)) {
        for (const u of parsedTmp.users) {
          userMap.set(u.id, u);
          if (u.email) userMap.set(u.email.toLowerCase(), u);
        }
      }
      if (Array.isArray(parsedTmp.posts)) {
        for (const p of parsedTmp.posts) {
          postMap.set(p.id, p);
        }
      }
    }
  } catch (err) {
    console.warn("Could not read DB_FILE:", err);
  }

  if (memoryDb?.users) {
    for (const u of memoryDb.users) {
      userMap.set(u.id, u);
      if (u.email) userMap.set(u.email.toLowerCase(), u);
    }
  }
  if (memoryDb?.posts) {
    for (const p of memoryDb.posts) {
      postMap.set(p.id, p);
    }
  }

  const uniqueUsers: DbUser[] = [];
  const seenUserIds = new Set<string>();
  for (const u of userMap.values()) {
    if (!seenUserIds.has(u.id)) {
      seenUserIds.add(u.id);
      uniqueUsers.push(u);
    }
  }

  memoryDb = {
    users: uniqueUsers,
    posts: Array.from(postMap.values()),
  };

  if (!memoryDb.posts || memoryDb.posts.length === 0) {
    memoryDb.posts = [...DEFAULT_POSTS];
  }

  if (!memoryDb.users.some((u) => u.email && u.email.toLowerCase() === "admin@holyfans.com")) {
    memoryDb.users.unshift(DEFAULT_USERS[0]);
  }

  return memoryDb;
}

function writeDb(data: DatabaseSchema): void {
  memoryDb = data;
  const rootDbFile = path.join(process.cwd(), "database.json");
  const serialized = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(DB_FILE, serialized, "utf-8");
  } catch (err) {
    console.warn("Could not write DB_FILE:", err);
  }

  try {
    if (rootDbFile !== DB_FILE) {
      fs.writeFileSync(rootDbFile, serialized, "utf-8");
    }
  } catch {}
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(PICS_DIR)) {
      try {
        fs.mkdirSync(PICS_DIR, { recursive: true });
      } catch {}
    }
    cb(null, PICS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    cb(null, `holy-${cleanBase ? cleanBase.slice(0, 20) + "-" : ""}${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
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

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS and disable caching
app.use((req: Request, res: Response, next: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Direct route to serve pics, checking /tmp/pics, public/pics, and root pics
app.get(["/pics/:filename", "/api/pics/:filename"], (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const possiblePaths = [
    path.join(PICS_DIR, filename),
    path.join(process.cwd(), "public", "pics", filename),
    path.join(process.cwd(), "pics", filename),
    path.join(process.cwd(), "dist", "pics", filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      if (filename.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      } else if (filename.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (filename.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      } else if (filename.endsWith(".gif")) {
        res.setHeader("Content-Type", "image/gif");
      } else {
        res.setHeader("Content-Type", "image/jpeg");
      }
      return res.sendFile(p);
    }
  }

  res.status(404).send("Szent kép nem található.");
});

// Serve pics folder statically as /pics
app.use("/pics", express.static(PICS_DIR));

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

  // 1. Try MySQL
  try {
    if (token === "token-admin" || token === "admin" || userId === "admin" || token === "token-admin-holy-1") {
      const admin = await getMySqlUserByEmail("admin@holyfans.com");
      if (admin) return admin;
    }
    const user =
      (await getMySqlUserById(userId)) ||
      (await getMySqlUserById(token)) ||
      (await getMySqlUserByEmail(userId));
    if (user) return user;
  } catch (err) {
    console.warn("resolveAuthUser MySQL fallback:", err);
  }

  // 2. Fallback to local cache
  const db = readDb();
  if (token === "token-admin" || token === "admin" || userId === "admin" || token === "token-admin-holy-1") {
    return db.users.find((u) => u.email && u.email.toLowerCase() === "admin@holyfans.com") || db.users[0] || null;
  }
  return (
    db.users.find(
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
    version: "3.0.0",
    database: "MySQL (sql7.freesqldatabase.com)",
    mysql: mysqlHealth,
  });
});

// Authentication: Register
app.post(["/api/register", "/register"], async (req: Request, res: Response) => {
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

  // Check if user exists in MySQL or local DB
  let existingUser = await getMySqlUserByEmail(trimmedEmail).catch(() => null);
  if (!existingUser) {
    const db = readDb();
    existingUser = db.users.find((u) => u.email.toLowerCase() === trimmedEmail) || null;
  }

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

  // 1. Save to MySQL database
  try {
    await saveMySqlUser(newUser);
  } catch (err) {
    console.error("Failed to save user to MySQL:", err);
  }

  // 2. Also keep in local cache
  const db = readDb();
  db.users.push(newUser);
  writeDb(db);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({
    success: true,
    message: "Áldás reád! Sikeresen csatlakoztál a HolyFans közösségéhez!",
    user: safeUser,
    token: `token-${newUser.id}`,
  });
});

// Authentication: Login
app.post(["/api/login", "/login"], async (req: Request, res: Response) => {
  const { email, password, clientUser } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: "Add meg az e-mail címed és a jelszavad!" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Admin login handler
  if (trimmedEmail === "admin@holyfans.com" && password === "admin") {
    let adminUser = await getMySqlUserByEmail("admin@holyfans.com").catch(() => null);
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
      await saveMySqlUser(adminUser).catch(() => {});
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

  // Look up user in MySQL
  let user: DbUser | null = await getMySqlUserByEmail(trimmedEmail).catch(() => null);

  // If not found in MySQL, check local cache
  if (!user) {
    const db = readDb();
    user = db.users.find((u) => u.email.toLowerCase() === trimmedEmail) || null;
    if (user) {
      saveMySqlUser(user).catch(() => {});
    }
  }

  // If client provided clientUser with matching email and password
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
      await saveMySqlUser(user).catch(() => {});
      const db = readDb();
      db.users.push(user);
      writeDb(db);
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
});

// Authentication: Current user profile
app.get(["/api/me", "/me"], async (req: Request, res: Response) => {
  const user = await resolveAuthUser(req);

  if (!user) {
    res.status(401).json({ success: false, message: "Nem vagy bejelentkezve vagy a felhasználó nem található." });
    return;
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// User Profile Update
app.put(["/api/users/profile", "/users/profile"], async (req: Request, res: Response) => {
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

  // Update in MySQL
  let updatedUser: DbUser | null = null;
  try {
    updatedUser = await updateMySqlUserProfile(user.id, updates);
  } catch (err) {
    console.error("updateMySqlUserProfile error:", err);
  }

  // Also update local cache
  const db = readDb();
  const localU = db.users.find((u) => u.id === user.id);
  if (localU) {
    Object.assign(localU, updates);
    for (const post of db.posts) {
      if (post.authorId === user.id || post.authorEmail === user.email) {
        if (updates.displayName) post.authorName = updates.displayName;
        if (updates.avatarUrl) post.authorAvatar = updates.avatarUrl;
        if (updates.haloBadge) post.authorHalo = updates.haloBadge;
      }
    }
    writeDb(db);
  }

  const finalUser = updatedUser || (localU ? { ...localU } : user);
  const { password: _, ...safeUser } = finalUser;

  res.json({
    success: true,
    message: "A profilod adatai áldással frissültek a MySQL adatbázisban!",
    user: safeUser,
  });
});

// Upload profile picture directly
app.post(["/api/users/avatar", "/users/avatar"], upload.single("avatar"), async (req: Request, res: Response) => {
  const user = await resolveAuthUser(req);

  if (!user) {
    res.status(401).json({ success: false, message: "Nem vagy bejelentkezve!" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: "Nem érkezett képfájl." });
    return;
  }

  let finalAvatarUrl = `/pics/${req.file.filename}`;
  try {
    if (req.file.path && fs.existsSync(req.file.path)) {
      const fileBuf = fs.readFileSync(req.file.path);
      if (fileBuf && fileBuf.length <= 4 * 1024 * 1024) {
        finalAvatarUrl = `data:${req.file.mimetype || "image/jpeg"};base64,${fileBuf.toString("base64")}`;
      }
    }
  } catch {}

  // Update in MySQL
  try {
    await updateMySqlUserProfile(user.id, { avatarUrl: finalAvatarUrl });
  } catch (err) {
    console.error("update avatar in MySQL error:", err);
  }

  // Update in local cache
  const db = readDb();
  const localU = db.users.find((u) => u.id === user.id);
  if (localU) {
    localU.avatarUrl = finalAvatarUrl;
    for (const post of db.posts) {
      if (post.authorId === user.id || post.authorEmail === user.email) {
        post.authorAvatar = finalAvatarUrl;
      }
    }
    writeDb(db);
  }

  user.avatarUrl = finalAvatarUrl;
  const { password: _, ...safeUser } = user;

  res.json({
    success: true,
    message: "Profilkép sikeresen frissítve!",
    avatarUrl: finalAvatarUrl,
    user: safeUser,
  });
});

// Feed: Get all posts
app.get(["/api/posts", "/posts"], async (req: Request, res: Response) => {
  try {
    const posts = await getMySqlPosts();
    res.json({ success: true, posts });
  } catch (err) {
    console.warn("GET /api/posts MySQL fallback to local:", err);
    const db = readDb();
    const sortedPosts = [...db.posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ success: true, posts: sortedPosts });
  }
});

// Single Post: Get post by ID
app.get(["/api/posts/:id", "/posts/:id"], async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const post = await getMySqlPostById(id);
    if (post) {
      res.json({ success: true, post });
      return;
    }
  } catch (err) {
    console.warn("getMySqlPostById error:", err);
  }

  const db = readDb();
  const localPost = db.posts.find((p) => p.id === id);
  if (!localPost) {
    res.status(404).json({ success: false, message: "A megosztott bejegyzés nem található." });
    return;
  }
  res.json({ success: true, post: localPost });
});

// Upload: Create new post with image
app.post(["/api/posts", "/posts"], upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "Kérlek tölts fel egy képet!" });
    return;
  }

  const { title, subtitle, authorId, authorName, authorEmail, authorHalo } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ success: false, message: "A cím megadása kötelező!" });
    return;
  }

  let finalImageUrl = `/pics/${req.file.filename}`;
  try {
    if (req.file.path && fs.existsSync(req.file.path)) {
      const fileBuf = fs.readFileSync(req.file.path);
      if (fileBuf && fileBuf.length <= 10 * 1024 * 1024) {
        finalImageUrl = `data:${req.file.mimetype || "image/jpeg"};base64,${fileBuf.toString("base64")}`;
      }
    }
  } catch (err) {
    console.warn("Could not encode image buffer:", err);
  }

  const author =
    (authorId ? await getMySqlUserById(authorId).catch(() => null) : null) ||
    (authorEmail ? await getMySqlUserByEmail(authorEmail).catch(() => null) : null);

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

  // 1. Save to MySQL database
  try {
    await saveMySqlPost(newPost);
  } catch (err) {
    console.error("Failed to save post to MySQL:", err);
  }

  // 2. Also save to local cache
  const db = readDb();
  db.posts.unshift(newPost);
  writeDb(db);

  res.status(201).json({
    success: true,
    message: "A kép sikeresen fel lett szentelve és elmentve a MySQL adatbázisba!",
    post: newPost,
  });
});

// Interaction: Bless a post (Amen/Like)
app.post(["/api/posts/:id/bless", "/posts/:id/bless"], async (req: Request, res: Response) => {
  const { id } = req.params;

  let newBlessings = 0;
  try {
    newBlessings = await incrementMySqlBlessings(id);
  } catch (err) {
    console.warn("incrementMySqlBlessings error, fallback:", err);
  }

  const db = readDb();
  const post = db.posts.find((p) => p.id === id);
  if (post) {
    post.blessings = newBlessings > 0 ? newBlessings : (post.blessings || 0) + 1;
    newBlessings = post.blessings;
    writeDb(db);
  }

  res.json({
    success: true,
    blessings: newBlessings || 1,
    message: "Áldás elküldve! Amen!",
  });
});

// Post edit (Title and Subtitle)
app.put(["/api/posts/:id", "/posts/:id"], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, subtitle } = req.body;
  const user = await resolveAuthUser(req);

  if (!user) {
    res.status(401).json({ success: false, message: "A művelethez bejelentkezés szükséges." });
    return;
  }

  const db = readDb();
  const postIndex = db.posts.findIndex((p) => p.id === id);
  const existingPost = postIndex !== -1 ? db.posts[postIndex] : await getMySqlPostById(id).catch(() => null);

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

  // Update in MySQL
  let updatedPost: DbPost | null = null;
  try {
    updatedPost = await updateMySqlPost(id, updates);
  } catch (err) {
    console.error("updateMySqlPost error:", err);
  }

  // Update local cache
  if (postIndex !== -1) {
    if (updates.title) db.posts[postIndex].title = updates.title;
    if (updates.subtitle !== undefined) db.posts[postIndex].subtitle = updates.subtitle;
    writeDb(db);
  }

  res.json({
    success: true,
    message: "A szent bejegyzés sikeresen módosítva lett az adatbázisban!",
    post: updatedPost || existingPost,
  });
});

// Post deletion
app.delete(["/api/posts/:id", "/posts/:id"], async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await resolveAuthUser(req);

  if (!user) {
    res.status(401).json({ success: false, message: "A törléshez bejelentkezés szükséges." });
    return;
  }

  const db = readDb();
  const postIndex = db.posts.findIndex((p) => p.id === id);
  const existingPost = postIndex !== -1 ? db.posts[postIndex] : await getMySqlPostById(id).catch(() => null);

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

  // Delete from MySQL
  try {
    await deleteMySqlPost(id);
  } catch (err) {
    console.error("deleteMySqlPost error:", err);
  }

  // Delete from local cache
  if (postIndex !== -1) {
    db.posts.splice(postIndex, 1);
    writeDb(db);
  }

  res.json({
    success: true,
    message: "A bejegyzés sikeresen törölve lett a MySQL adatbázisból.",
  });
});

// Admin: Get all users with post counts
app.get(["/api/admin/users", "/admin/users"], async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const user = await resolveAuthUser(req);
  const isAdmin =
    user && (user.role === "admin" || (user.email && user.email.toLowerCase() === "admin@holyfans.com"));

  if (!isAdmin) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor férhet hozzá ehhez az oldalhoz." });
    return;
  }

  try {
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
  } catch (err) {
    console.error("admin users MySQL error, falling back:", err);
    const db = readDb();
    const usersWithMeta = db.users.map(({ password, ...u }) => ({
      ...u,
      postCount: db.posts.filter(
        (p) =>
          p.authorId === u.id || (p.authorEmail && u.email && p.authorEmail.toLowerCase() === u.email.toLowerCase())
      ).length,
    }));

    res.json({
      success: true,
      users: usersWithMeta,
    });
  }
});

// Admin: Delete a user
app.delete(["/api/admin/users/:id", "/admin/users/:id"], async (req: Request, res: Response) => {
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

  // Delete from MySQL
  try {
    await deleteMySqlUser(id);
  } catch (err) {
    console.error("deleteMySqlUser error:", err);
  }

  // Delete from local cache
  const db = readDb();
  const userIndex = db.users.findIndex((u) => u.id === id);
  if (userIndex !== -1) {
    const removed = db.users.splice(userIndex, 1)[0];
    db.posts = db.posts.filter((p) => p.authorId !== id && p.authorEmail !== removed.email);
    writeDb(db);
  }

  res.json({
    success: true,
    message: "Felhasználó és bejegyzései sikeresen törölve a MySQL adatbázisból.",
  });
});

// Admin: Change user role
app.put(["/api/admin/users/:id/role", "/admin/users/:id/role"], async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const user = await resolveAuthUser(req);

  if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor módosíthatja a szerepköröket!" });
    return;
  }

  const newRole = role === "admin" ? "admin" : "user";

  // Update in MySQL
  try {
    await updateMySqlUserRole(id, newRole);
  } catch (err) {
    console.error("updateMySqlUserRole error:", err);
  }

  // Update in local cache
  const db = readDb();
  const target = db.users.find((u) => u.id === id);
  if (target) {
    target.role = newRole;
    writeDb(db);
  }

  res.json({
    success: true,
    message: `Szerepkör sikeresen módosítva a MySQL-ben: -> ${newRole}`,
  });
});

// Admin: Get all posts
app.get(["/api/admin/posts", "/admin/posts"], async (req: Request, res: Response) => {
  const user = await resolveAuthUser(req);

  if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor férhet hozzá!" });
    return;
  }

  try {
    const posts = await getMySqlPosts();
    res.json({ success: true, posts });
  } catch (err) {
    const db = readDb();
    const sortedPosts = [...db.posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ success: true, posts: sortedPosts });
  }
});

// Sync any local data into MySQL and local cache
app.post(["/api/sync-local", "/sync-local"], async (req: Request, res: Response) => {
  try {
    const { users, posts } = req.body;
    let usersAdded = 0;
    let postsAdded = 0;

    // 1. Sync to MySQL
    if (Array.isArray(users) || Array.isArray(posts)) {
      const synced = await bulkSyncToMySql(users, posts);
      usersAdded = synced.usersSaved;
      postsAdded = synced.postsSaved;
    }

    // 2. Also sync to local cache
    const db = readDb();
    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u.email || u.email.toLowerCase() === "admin@holyfans.com") continue;
        const existing = db.users.find(
          (e) => e.email.toLowerCase() === u.email.toLowerCase() || e.id === u.id
        );
        if (!existing) {
          db.users.push(u);
        } else if (u.password && existing.password !== u.password) {
          existing.password = u.password;
        }
      }
    }

    if (Array.isArray(posts)) {
      for (const p of posts) {
        if (!p.id || !p.title) continue;
        const exists = db.posts.some((e) => e.id === p.id);
        if (!exists) {
          db.posts.unshift(p);
        }
      }
    }

    writeDb(db);

    res.json({
      success: true,
      message: `Szinkronizáció kész (${usersAdded} felhasználó és ${postsAdded} bejegyzés elmentve a MySQL adatbázisba).`,
      usersAdded,
      postsAdded,
    });
  } catch (err: any) {
    console.error("Error during sync-local:", err);
    res.status(500).json({ success: false, message: "Szinkronizációs hiba." });
  }
});

// Community Statistics
app.get(["/api/stats", "/stats"], async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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
  } catch (err) {
    const db = readDb();
    const totalPosts = db.posts.length;
    const totalBelievers = db.users.length;
    const totalBlessings = db.posts.reduce((sum, p) => sum + (p.blessings || 0), 0);

    res.json({
      success: true,
      stats: {
        totalPosts,
        totalBelievers,
        totalBlessings,
      },
      source: "local-fallback",
    });
  }
});

// Database inspector with MySQL diagnostic info
app.get(["/api/database-inspect", "/database-inspect"], async (req: Request, res: Response) => {
  const db = readDb();
  const mysqlHealth = await checkMySqlHealth();
  let picsFiles: string[] = [];
  try {
    if (fs.existsSync(PICS_DIR)) {
      picsFiles = fs.readdirSync(PICS_DIR);
    }
  } catch (err) {
    console.error("Error reading pics dir", err);
  }

  res.json({
    success: true,
    mysql: mysqlHealth,
    localCache: db,
    picsFiles,
  });
});

// Express JSON error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Express Error Handler:", err);
  res.status(err.status || 400).json({
    success: false,
    message: err.message || "Hiba történt a szerver oldalon.",
  });
});

export default app;
