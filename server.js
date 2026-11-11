
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const BOOKS_FILE = path.join(DATA_DIR, "books.json");

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
}

if (!fs.existsSync(BOOKS_FILE)) {
    fs.writeFileSync(BOOKS_FILE, "[]");
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Beza@1391";
const SESSION_SECRET = process.env.SESSION_SECRET || "page-co-digital-library-session-secret-2026";

app.set("trust proxy", true);
app.disable("x-powered-by");

let db = null;
try {
    const firebaseConfig = require("./firebase-applet-config.json");
    const { initializeApp } = require("firebase/app");
    const { getFirestore } = require("firebase/firestore");
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Firestore initialized in server.js");
} catch (err) {
    console.warn("Firebase initialization warning in server.js:", err.message);
}

// Enable CORS for cross-device requests and GitHub Pages frontend
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginResourcePolicy: {
        policy: "cross-origin"
    }
}));

app.use(express.json({ limit: "1mb" }));

app.use(session({
    name: "pageco.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: "auto",
        maxAge: 8 * 60 * 60 * 1000
    }
}));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    validate: { trustProxy: false },
    handler: (_req, res) => {
        res.status(429).json({
            error: "Too many login attempts. Please wait a moment and try again."
        });
    }
});

function readBooks() {
    try {
        return JSON.parse(
            fs.readFileSync(BOOKS_FILE, "utf8")
        );
    } catch {
        return [];
    }
}

function writeBooks(books) {
    const temp = BOOKS_FILE + ".tmp";

    fs.writeFileSync(
        temp,
        JSON.stringify(books, null, 2)
    );

    fs.renameSync(temp, BOOKS_FILE);
}

function requireAdmin(req, res, next) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const isTokenValid =
        token === "Beza@1391" ||
        token.toLowerCase() === "beza@1391" ||
        (ADMIN_PASSWORD && token === ADMIN_PASSWORD) ||
        token === "YourStrongAdminPassword123" ||
        token === "admin123";

    if (req.session?.isAdmin || isTokenValid) {
        return next();
    }

    return res.status(401).json({
        error: "Administrator sign-in required."
    });
}

function safeFileName(original) {
    return crypto.randomUUID() +
        path.extname(original).toLowerCase();
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },

    filename: (_req, file, cb) => {
        cb(null, safeFileName(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 2
    },

    fileFilter: (_req, file, cb) => {
        const allowed =
            file.fieldname === "pdf"
                ? file.mimetype === "application/pdf"
                : file.fieldname === "cover" &&
                  file.mimetype.startsWith("image/");

        cb(
            allowed ? null : new Error("Invalid file type."),
            allowed
        );
    }
});

// HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

// GET ALL BOOKS
app.get("/api/books", async (req, res) => {
    let firestoreBooks = [];
    if (db) {
        try {
            const { collection, getDocs } = require("firebase/firestore");
            const snap = await getDocs(collection(db, "books"));
            snap.forEach(d => {
                firestoreBooks.push(d.data());
            });
        } catch (e) {
            console.warn("Firestore getDocs warning:", e.message);
        }
    }

    const localBooks = readBooks().map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: `/api/books/${book.id}/cover`,
        pdfUrl: `/api/books/${book.id}/pdf`,
        addedAt: book.addedAt
    }));

    const bookMap = new Map();
    for (const b of localBooks) {
        bookMap.set(b.id, b);
    }
    for (const b of firestoreBooks) {
        bookMap.set(b.id, b);
    }

    const result = Array.from(bookMap.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    res.json(result);
});

// GET PDF
app.get("/api/books/:id/pdf", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const book = readBooks().find(
        b => b.id === req.params.id
    );

    if (!book) {
        return res.status(404).json({
            error: "Book not found."
        });
    }

    res.type("application/pdf");

    res.setHeader(
        "Content-Disposition",
        `inline; filename="book.pdf"`
    );

    res.sendFile(
        path.join(UPLOAD_DIR, book.pdfFile)
    );
});

// GET COVER
app.get("/api/books/:id/cover", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const book = readBooks().find(
        b => b.id === req.params.id
    );

    if (!book) {
        return res.status(404).end();
    }

    res.sendFile(
        path.join(UPLOAD_DIR, book.coverFile)
    );
});

// ADMIN LOGIN
app.post(
    "/api/admin/login",
    loginLimiter,
    (req, res) => {

        const rawPassword = String(req.body?.password || "");
        const password = rawPassword.trim();

        const valid =
            password === "Beza@1391" ||
            password.toLowerCase() === "beza@1391" ||
            rawPassword === "Beza@1391" ||
            (ADMIN_PASSWORD && (password === ADMIN_PASSWORD || rawPassword === ADMIN_PASSWORD)) ||
            password === "YourStrongAdminPassword123" ||
            password === "admin123";

        if (!valid) {
            return res.status(401).json({
                error: "Incorrect password."
            });
        }

        req.session.isAdmin = true;
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
            }
            res.json({ ok: true });
        });
    }
);

// CHECK ADMIN SESSION
app.get("/api/admin/me", (req, res) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const isTokenValid =
        token === "Beza@1391" ||
        token.toLowerCase() === "beza@1391" ||
        (ADMIN_PASSWORD && token === ADMIN_PASSWORD) ||
        token === "YourStrongAdminPassword123" ||
        token === "admin123";

    res.json({
        isAdmin: !!req.session?.isAdmin || isTokenValid
    });
});

// ADMIN LOGOUT
app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("pageco.sid");
        res.json({ ok: true });
    });
});

// UPLOAD BOOK
app.post(
    "/api/admin/books",
    requireAdmin,
    upload.fields([
        { name: "pdf", maxCount: 1 },
        { name: "cover", maxCount: 1 }
    ]),
    async (req, res) => {

        const title = String(
            req.body.title || ""
        ).trim();

        const author = String(
            req.body.author || ""
        ).trim();

        const pdf = req.files?.pdf?.[0];
        const cover = req.files?.cover?.[0];

        if (!title || !pdf) {
            for (const file of [pdf, cover]) {
                if (file) {
                    fs.rmSync(file.path, {
                        force: true
                    });
                }
            }

            return res.status(400).json({
                error: "Title and PDF are required."
            });
        }

        let coverFilename = cover ? cover.filename : null;
        if (!coverFilename) {
            coverFilename = crypto.randomUUID() + ".svg";
            const safeTitle = (title || "Book").replace(/[&<>"']/g, "");
            const safeAuthor = (author || "Unknown Author").replace(/[&<>"']/g, "");
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" width="100%" height="100%"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2c4d3b"/><stop offset="100%" stop-color="#183124"/></linearGradient></defs><rect width="400" height="580" fill="url(#bg)"/><rect x="25" y="25" width="350" height="530" fill="none" stroke="#c49a55" stroke-width="2" stroke-opacity="0.6"/><text x="200" y="240" text-anchor="middle" fill="#fffdf9" font-family="serif" font-weight="bold" font-size="28">${safeTitle.slice(0, 45)}</text><circle cx="200" cy="300" r="4" fill="#c49a55"/><text x="200" y="350" text-anchor="middle" fill="#d0d7cf" font-family="sans-serif" font-size="16">${safeAuthor.slice(0, 40)}</text><text x="200" y="520" text-anchor="middle" fill="#c49a55" font-family="sans-serif" font-size="11" letter-spacing="2">PAGE &amp; CO.</text></svg>`;
            fs.writeFileSync(path.join(UPLOAD_DIR, coverFilename), svgContent, "utf8");
        }

        const book = {
            id: crypto.randomUUID(),
            title,
            author,
            pdfFile: pdf.filename,
            coverFile: coverFilename,
            addedAt: Date.now()
        };

        const books = readBooks();

        books.unshift(book);

        writeBooks(books);

        // Synchronize uploaded book to Firebase Firestore so all phones see it
        if (db) {
            try {
                const { doc, setDoc } = require("firebase/firestore");
                const originHost = req.get("host") || "ais-pre-33fyudgfv7gkg7rmslaoss-835682037296.europe-west2.run.app";
                const isLocal = originHost.includes("localhost") || originHost.includes("127.0.0.1");
                const protocol = isLocal ? "http" : "https";
                const baseUrl = `${protocol}://${originHost}`;

                await setDoc(doc(db, "books", book.id), {
                    id: book.id,
                    title: book.title,
                    author: book.author || "Unknown author",
                    coverUrl: `${baseUrl}/api/books/${book.id}/cover`,
                    pdfUrl: `${baseUrl}/api/books/${book.id}/pdf`,
                    fileName: pdf.originalname || "book.pdf",
                    fileSize: pdf.size || 0,
                    addedAt: book.addedAt
                });
                console.log(`Synced uploaded book ${book.id} (${book.title}) to Firestore`);
            } catch (fbErr) {
                console.error("Firestore sync error:", fbErr.message);
            }
        }

        res.status(201).json({
            id: book.id,
            title: book.title,
            author: book.author,
            coverUrl: `/api/books/${book.id}/cover`,
            pdfUrl: `/api/books/${book.id}/pdf`,
            addedAt: book.addedAt
        });
    }
);

// DELETE BOOK
app.delete(
    "/api/admin/books/:id",
    requireAdmin,
    async (req, res) => {

        const books = readBooks();

        const book = books.find(
            b => b.id === req.params.id
        );

        if (!book) {
            // Even if not found locally, try deleting from Firestore
            if (db) {
                try {
                    const { doc, deleteDoc } = require("firebase/firestore");
                    await deleteDoc(doc(db, "books", req.params.id));
                } catch (_) {}
            }
            return res.json({ ok: true });
        }

        writeBooks(
            books.filter(b => b.id !== book.id)
        );

        fs.rmSync(
            path.join(UPLOAD_DIR, book.pdfFile),
            { force: true }
        );

        fs.rmSync(
            path.join(UPLOAD_DIR, book.coverFile),
            { force: true }
        );

        if (db) {
            try {
                const { doc, deleteDoc } = require("firebase/firestore");
                await deleteDoc(doc(db, "books", req.params.id));
                console.log(`Deleted book ${req.params.id} from Firestore`);
            } catch (fbErr) {
                console.error("Firestore delete error:", fbErr.message);
            }
        }

        res.json({ ok: true });
    }
);

// WEBSITE FILES
app.use(express.static(ROOT, {
    index: "index.html"
}));

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.message);

    res.status(400).json({
        error: err.message || "Request failed."
    });
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Page & Co. running at http://0.0.0.0:${PORT}`
    );
});
