import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

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

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // If running on Vercel, check if there's a starter database.json in process.cwd()
      const rootDbFile = path.join(process.cwd(), "database.json");
      if (IS_VERCEL && fs.existsSync(rootDbFile)) {
        try {
          const content = fs.readFileSync(rootDbFile, "utf-8");
          const parsed = JSON.parse(content);
          fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
          return parsed;
        } catch {
          // fallback to empty
        }
      }

      const initial: DatabaseSchema = {
        users: [
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
        ],
        posts: [
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
            authorId: "admin-holy-1",
            authorName: "Főpap Admin",
            authorEmail: "admin@holyfans.com",
            authorHalo: "Arkangyal Adminisztrátor",
            authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
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
        ],
      };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      } catch {}
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(content);
    if (!Array.isArray(data.users)) data.users = [];
    if (!Array.isArray(data.posts)) data.posts = [];

    // Ensure seed posts exist if posts array is completely empty
    if (data.posts.length === 0) {
      data.posts = [
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
          authorId: "admin-holy-1",
          authorName: "Főpap Admin",
          authorEmail: "admin@holyfans.com",
          authorHalo: "Arkangyal Adminisztrátor",
          authorAvatar: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
          createdAt: "2026-09-14T10:30:00.000Z",
          blessings: 28,
        },
      ];
      writeDb(data);
    }

    // Ensure admin is present
    const hasAdmin = data.users.some(
      (u: any) => u.email && u.email.toLowerCase() === "admin@holyfans.com"
    );
    if (!hasAdmin) {
      data.users.unshift({
        id: "admin-holy-1",
        email: "admin@holyfans.com",
        password: "admin",
        displayName: "Főpap Admin",
        role: "admin",
        haloBadge: "Arkangyal Adminisztrátor",
        avatarUrl: "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=ArchangelAdmin",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      writeDb(data);
    }

    return data;
  } catch (err) {
    console.error("Error reading database.json:", err);
    return { users: [], posts: [] };
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database.json:", err);
  }
}

// Configure multer for disk storage in the 'pics' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve pics folder statically as /pics
app.use("/pics", express.static(PICS_DIR));

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "HolyFans API" });
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

  const newPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    subtitle: (subtitle || "").trim(),
    imageUrl: `/pics/${req.file.filename}`, // Direct relative path served by Express
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
