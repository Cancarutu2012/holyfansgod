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

      const initial: DatabaseSchema = { users: [], posts: [] };
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      } catch {}
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
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

// Authentication: Current user profile
app.get("/api/me", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Nem vagy bejelentkezve." });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const userId = token.replace("token-", "");
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);

  if (!user) {
    res.status(404).json({ success: false, message: "Felhasználó nem található." });
    return;
  }

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
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
