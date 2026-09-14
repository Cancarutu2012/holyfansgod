import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

const app = express();
const PORT = 3000;

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

// Database helper functions
interface DatabaseSchema {
  users: Array<{
    id: string;
    email: string;
    password: string;
    displayName: string;
    role?: "admin" | "user";
    haloBadge?: string;
    avatarUrl?: string;
    createdAt: string;
  }>;
  posts: Array<{
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
  }>;
}

// In-memory database cache to guarantee data availability across serverless invocations
let memoryDb: DatabaseSchema | null = null;

const DEFAULT_USERS = [
  {
    id: "admin-holy-1",
    email: "admin@holyfans.com",
    password: "admin",
    displayName: "Főpap Admin",
    role: "admin" as const,
    haloBadge: "Arkangyal Adminisztrátor",
    avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-1789385577439-qs8sb",
    email: "test@test.com",
    password: "password123",
    displayName: "Test Elek",
    haloBadge: "Kerub Fényhozó",
    avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Test%20Elek",
    createdAt: "2026-09-14T11:32:57.439Z",
  },
];

const DEFAULT_POSTS = [
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

function readDb(): DatabaseSchema {
  try {
    let rawContent: string | null = null;
    if (fs.existsSync(DB_FILE)) {
      rawContent = fs.readFileSync(DB_FILE, "utf-8");
    } else {
      const rootDbFile = path.join(process.cwd(), "database.json");
      if (fs.existsSync(rootDbFile)) {
        rawContent = fs.readFileSync(rootDbFile, "utf-8");
        try {
          fs.writeFileSync(DB_FILE, rawContent, "utf-8");
        } catch {}
      }
    }

    if (rawContent) {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed.users) && Array.isArray(parsed.posts)) {
        if (!memoryDb || parsed.posts.length >= memoryDb.posts.length) {
          memoryDb = parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Could not read DB_FILE, utilizing memory/seed database:", err);
  }

  if (!memoryDb) {
    memoryDb = {
      users: [...DEFAULT_USERS],
      posts: [...DEFAULT_POSTS],
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), "utf-8");
    } catch {}
  }

  // Ensure default seed posts exist if posts is empty
  if (!memoryDb.posts || memoryDb.posts.length === 0) {
    memoryDb.posts = [...DEFAULT_POSTS];
  }

  // Ensure admin is always present
  if (!memoryDb.users.some((u) => u.email && u.email.toLowerCase() === "admin@holyfans.com")) {
    memoryDb.users.unshift(DEFAULT_USERS[0]);
  }

  return memoryDb;
}

function writeDb(data: DatabaseSchema): void {
  memoryDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write DB_FILE (in-memory state maintained):", err);
  }

  // Also sync to root database.json if not on Vercel
  try {
    const rootDbFile = path.join(process.cwd(), "database.json");
    if (!IS_VERCEL && rootDbFile !== DB_FILE) {
      fs.writeFileSync(rootDbFile, JSON.stringify(data, null, 2), "utf-8");
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
    fileSize: 15 * 1024 * 1024, // 15MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Csak képfájlok tölthetők fel (JPG, PNG, WebP, SVG, GIF)!"));
    }
  },
});

// Middleware for parsing JSON and form bodies
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Standard CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Route normalization middleware for Vercel Serverless Function rewrites
app.use((req, res, next) => {
  // If request URL was stripped of /api by Vercel rewrite (e.g. /register or /posts), normalize it back to /api/*
  if (!req.url.startsWith("/api") && !req.url.startsWith("/pics")) {
    const queryIdx = req.url.indexOf("?");
    const pathPart = queryIdx >= 0 ? req.url.slice(0, queryIdx) : req.url;
    const queryPart = queryIdx >= 0 ? req.url.slice(queryIdx) : "";
    req.url = `/api${pathPart.startsWith("/") ? "" : "/"}${pathPart}${queryPart}`;
  }
  next();
});

// Direct route to serve pics, checking /tmp/pics, public/pics, and root pics
app.get("/pics/:filename", (req: Request, res: Response) => {
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
// API Routes
// ----------------------------------------------------

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "HolyFans API", version: "2.0.0" });
});

// Authentication: Register
app.post("/api/register", (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    res.status(400).json({ success: false, message: "Kérlek töltsd ki az összes mezőt (Email, Jelszó, Megjelenített név)!" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = displayName.trim();

  if (password.length < 4) {
    res.status(400).json({ success: false, message: "A jelszónak legalább 4 karakter hosszúnak kell lennie!" });
    return;
  }

  const db = readDb();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === trimmedEmail);
  if (existingUser) {
    res.status(409).json({ success: false, message: "Ezzel az e-mail címmel már regisztráltak a szent közösségbe!" });
    return;
  }

  const haloTitles = [
    "Arany Dicsfény",
    "Szeráf Sugárzás",
    "Kerub Fényhozó",
    "Hajnalcsillag Áldott",
    "Mennyei Védelmező",
    "Szent Lélek Kísérő"
  ];
  const randomHalo = haloTitles[Math.floor(Math.random() * haloTitles.length)];

  const newUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: trimmedEmail,
    password: password, // Stored in database.json per user request
    displayName: trimmedName,
    haloBadge: randomHalo,
    avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(trimmedName)}`,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);

  // Return user without password
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({
    success: true,
    message: "Áldás reád! Sikeresen csatlakoztál a HolyFans közösségéhez!",
    user: safeUser,
    token: `token-${newUser.id}`,
  });
});

// Authentication: Login
app.post("/api/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: "Add meg az e-mail címed és a jelszavad!" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const db = readDb();

  // Guaranteed admin login handler
  if (trimmedEmail === "admin@holyfans.com" && password === "admin") {
    let adminUser = db.users.find((u) => u.email.toLowerCase() === "admin@holyfans.com");
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
      db.users.unshift(adminUser);
      writeDb(db);
    } else {
      adminUser.role = "admin";
      writeDb(db);
    }
    const { password: _, ...safeAdmin } = adminUser;
    res.json({
      success: true,
      message: "Sikeres bejelentkezés mint Főpap Adminisztrátor!",
      user: safeAdmin,
      token: `token-${adminUser.id}`,
    });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === trimmedEmail);

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

// Helper to get authenticated user
function getAuthUser(req: Request, db: DatabaseSchema) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  const userId = token.replace("token-", "");
  return db.users.find((u) => u.id === userId) || null;
}

// Authentication: Current user profile
app.get("/api/me", (req: Request, res: Response) => {
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user) {
    res.status(401).json({ success: false, message: "Nem vagy bejelentkezve vagy a felhasználó nem található." });
    return;
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// User Profile Update (Name, Halo Badge, Avatar URL, Password)
app.put("/api/users/profile", (req: Request, res: Response) => {
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user) {
    res.status(401).json({ success: false, message: "Nem vagy bejelentkezve!" });
    return;
  }

  const { displayName, haloBadge, avatarUrl, password } = req.body;

  if (displayName && typeof displayName === "string" && displayName.trim()) {
    user.displayName = displayName.trim();
  }
  if (haloBadge && typeof haloBadge === "string" && haloBadge.trim()) {
    user.haloBadge = haloBadge.trim();
  }
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim()) {
    user.avatarUrl = avatarUrl.trim();
  }
  if (password && typeof password === "string" && password.trim().length >= 4) {
    user.password = password.trim();
  }

  // Update existing posts by this user to keep display name and avatar in sync
  for (const post of db.posts) {
    if (post.authorId === user.id || post.authorEmail === user.email) {
      if (user.displayName) post.authorName = user.displayName;
      if (user.avatarUrl) post.authorAvatar = user.avatarUrl;
      if (user.haloBadge) post.authorHalo = user.haloBadge;
    }
  }

  writeDb(db);

  const { password: _, ...safeUser } = user;
  res.json({
    success: true,
    message: "A profilod adatai áldással frissültek!",
    user: safeUser,
  });
});

// Upload profile picture directly
app.post("/api/users/avatar", upload.single("avatar"), (req: Request, res: Response) => {
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user) {
    res.status(401).json({ success: false, message: "Nem vagy bejelentkezve!" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: "Nem érkezett képfájl." });
    return;
  }

  const avatarUrl = `/pics/${req.file.filename}`;
  user.avatarUrl = avatarUrl;

  for (const post of db.posts) {
    if (post.authorId === user.id || post.authorEmail === user.email) {
      post.authorAvatar = avatarUrl;
    }
  }

  writeDb(db);

  const { password: _, ...safeUser } = user;
  res.json({
    success: true,
    message: "Profilkép sikeresen frissítve!",
    avatarUrl,
    user: safeUser,
  });
});

// Feed: Get all posts

app.get("/api/posts", (req: Request, res: Response) => {
  const db = readDb();
  // Sort posts in reverse chronological order (newest first)
  const sortedPosts = [...db.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ success: true, posts: sortedPosts });
});

// Single Post: Get post by ID (for direct share links)
app.get("/api/posts/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  const post = db.posts.find((p) => p.id === id);
  if (!post) {
    res.status(404).json({ success: false, message: "A megosztott bejegyzés nem található." });
    return;
  }
  res.json({ success: true, post });
});

// Upload: Create new post with image in pics folder
app.post("/api/posts", upload.single("image"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: "Kérlek tölts fel egy képet!" });
    return;
  }

  const { title, subtitle, authorId, authorName, authorEmail, authorHalo } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ success: false, message: "A cím megadása kötelező!" });
    return;
  }

  const db = readDb();

  // Find author or fallback
  let author = db.users.find((u) => u.id === authorId || u.email === authorEmail);

  // Determine image URL - on serverless or ephemeral filesystems, store as data URL so it never 404s
  let finalImageUrl = `/pics/${req.file.filename}`;
  try {
    if (req.file.path && fs.existsSync(req.file.path)) {
      const fileBuf = fs.readFileSync(req.file.path);
      if (fileBuf && fileBuf.length <= 4 * 1024 * 1024) {
        finalImageUrl = `data:${req.file.mimetype || "image/jpeg"};base64,${fileBuf.toString("base64")}`;
      }
    }
  } catch (err) {
    console.warn("Could not encode image buffer, falling back to path:", err);
  }

  const newPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    subtitle: (subtitle || "").trim(),
    imageUrl: finalImageUrl,
    authorId: author?.id || authorId || "guest-user",
    authorName: author?.displayName || authorName || "Névtelen Testvér",
    authorEmail: author?.email || authorEmail || "anon@holyfans.com",
    authorHalo: author?.haloBadge || authorHalo || "Dicsfény Hordozó",
    authorAvatar: author?.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(authorName || "Holy")}`,
    createdAt: new Date().toISOString(),
    blessings: 1, // Author's first holy blessing
  };

  db.posts.unshift(newPost);
  writeDb(db);

  res.status(201).json({
    success: true,
    message: "A kép sikeresen fel lett szentelve és közzétéve a HolyFans hírfolyamban!",
    post: newPost,
  });
});

// Interaction: Bless a post (Like/Amen)
app.post("/api/posts/:id/bless", (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  const post = db.posts.find((p) => p.id === id);

  if (!post) {
    res.status(404).json({ success: false, message: "A bejegyzés nem található." });
    return;
  }

  post.blessings = (post.blessings || 0) + 1;
  writeDb(db);

  res.json({
    success: true,
    blessings: post.blessings,
    message: "Áldás elküldve! Amen!",
  });
});

// Post edit (Title and Subtitle)
app.put("/api/posts/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, subtitle } = req.body;
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user) {
    res.status(401).json({ success: false, message: "A művelethez bejelentkezés szükséges." });
    return;
  }

  const postIndex = db.posts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    res.status(404).json({ success: false, message: "A bejegyzés nem található." });
    return;
  }

  const post = db.posts[postIndex];
  const isOwner = post.authorId === user.id || post.authorEmail === user.email;
  const isAdmin = user.role === "admin" || user.email === "admin@holyfans.com";

  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: "Csak a bejegyzés szerzője vagy az Admin szerkesztheti a bejegyzést!" });
    return;
  }

  if (title && typeof title === "string" && title.trim()) {
    post.title = title.trim();
  }
  if (typeof subtitle === "string") {
    post.subtitle = subtitle.trim();
  }

  writeDb(db);

  res.json({
    success: true,
    message: "A szent bejegyzés sikeresen módosítva lett!",
    post,
  });
});

// Post deletion
app.delete("/api/posts/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user) {
    res.status(401).json({ success: false, message: "A törléshez bejelentkezés szükséges." });
    return;
  }

  const postIndex = db.posts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    res.status(404).json({ success: false, message: "A bejegyzés nem található." });
    return;
  }

  const post = db.posts[postIndex];
  const isOwner = post.authorId === user.id || post.authorEmail === user.email;
  const isAdmin = user.role === "admin" || user.email === "admin@holyfans.com";

  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: "Nincs jogosultságod a bejegyzés törléséhez!" });
    return;
  }

  db.posts.splice(postIndex, 1);
  writeDb(db);

  res.json({
    success: true,
    message: "A bejegyzés sikeresen törölve lett.",
  });
});

// Admin: Get all users
app.get("/api/admin/users", (req: Request, res: Response) => {
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor férhet hozzá ehhez az oldalhoz." });
    return;
  }

  const usersWithMeta = db.users.map(({ password, ...u }) => ({
    ...u,
    postCount: db.posts.filter((p) => p.authorId === u.id || p.authorEmail === u.email).length,
  }));

  res.json({
    success: true,
    users: usersWithMeta,
  });
});

// Admin: Delete a user
app.delete("/api/admin/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor végezhet felhasználó törlést!" });
    return;
  }

  if (user.id === id) {
    res.status(400).json({ success: false, message: "A saját adminisztrátori fiókodat nem törölheted!" });
    return;
  }

  const userIndex = db.users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    res.status(404).json({ success: false, message: "Felhasználó nem található." });
    return;
  }

  const removedUser = db.users.splice(userIndex, 1)[0];
  // Also clean up or keep posts
  db.posts = db.posts.filter((p) => p.authorId !== id && p.authorEmail !== removedUser.email);
  writeDb(db);

  res.json({
    success: true,
    message: `Felhasználó (${removedUser.displayName}) és bejegyzései sikeresen törölve.`,
  });
});

// Admin: Change user role
app.put("/api/admin/users/:id/role", (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor módosíthatja a szerepköröket!" });
    return;
  }

  const target = db.users.find((u) => u.id === id);
  if (!target) {
    res.status(404).json({ success: false, message: "Felhasználó nem található." });
    return;
  }

  target.role = role === "admin" ? "admin" : "user";
  writeDb(db);

  res.json({
    success: true,
    message: `Szerepkör sikeresen módosítva: ${target.displayName} -> ${target.role}`,
  });
});


// Admin: Get all posts
app.get("/api/admin/posts", (req: Request, res: Response) => {
  const db = readDb();
  const user = getAuthUser(req, db);

  if (!user || (user.role !== "admin" && user.email !== "admin@holyfans.com")) {
    res.status(403).json({ success: false, message: "Csak Adminisztrátor férhet hozzá!" });
    return;
  }

  const sortedPosts = [...db.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({
    success: true,
    posts: sortedPosts,
  });
});

// Sync any local data from previous sessions into the central database.json
app.post("/api/sync-local", (req: Request, res: Response) => {
  try {
    const { users, posts } = req.body;
    const db = readDb();
    let usersAdded = 0;
    let postsAdded = 0;

    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u.email || u.email.toLowerCase() === "admin@holyfans.com") continue;
        const exists = db.users.some(
          (existing) => existing.email.toLowerCase() === u.email.toLowerCase() || existing.id === u.id
        );
        if (!exists) {
          db.users.push({
            id: u.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            email: u.email.toLowerCase(),
            password: u.password || "password",
            displayName: u.displayName || "Szent Hívő",
            role: u.role || "user",
            haloBadge: u.haloBadge || "Arany Dicsfény",
            avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(u.displayName || "User")}`,
            createdAt: u.createdAt || new Date().toISOString(),
          });
          usersAdded++;
        }
      }
    }

    if (Array.isArray(posts)) {
      for (const p of posts) {
        if (!p.id || !p.title) continue;
        const exists = db.posts.some((existing) => existing.id === p.id);
        if (!exists) {
          db.posts.push({
            id: p.id,
            title: p.title,
            subtitle: p.subtitle || "",
            imageUrl: p.imageUrl || "/pics/celestial-light.svg",
            authorId: p.authorId || "guest-user",
            authorName: p.authorName || "Hívő",
            authorEmail: p.authorEmail || "hivo@holyfans.com",
            authorHalo: p.authorHalo || "Dicsfény",
            authorAvatar: p.authorAvatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(p.authorName || "Post")}`,
            createdAt: p.createdAt || new Date().toISOString(),
            blessings: p.blessings || 1,
          });
          postsAdded++;
        }
      }
    }

    if (usersAdded > 0 || postsAdded > 0) {
      writeDb(db);
    }

    res.json({
      success: true,
      message: `Szinkronizáció kész (${usersAdded} új felhasználó, ${postsAdded} új bejegyzés a közös adatbázisban).`,
      usersAdded,
      postsAdded,
    });
  } catch (err: any) {
    console.error("Error during sync-local:", err);
    res.status(500).json({ success: false, message: "Szinkronizációs hiba." });
  }
});

// Community Statistics
app.get("/api/stats", (req: Request, res: Response) => {
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
  });
});

// Database and pics folder inspector
app.get("/api/database-inspect", (req: Request, res: Response) => {
  const db = readDb();
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
    database: db,
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

// ----------------------------------------------------
// Frontend Server (Vite dev or production static)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ HolyFans szerver ragyog a http://localhost:${PORT} címen!`);
  });
}

if (!IS_VERCEL) {
  startServer();
}

export default app;
