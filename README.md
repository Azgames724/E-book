# Page & Co. — Digital Library

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PDF.js](https://img.shields.io/badge/PDF.js-3.11-FF6600?logo=mozilla&logoColor=white)](https://mozilla.github.io/pdf.js/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Page & Co.** is a lightweight, elegant digital library and e-book management platform designed for distraction-free reading. It combines an editorial aesthetic with an in-browser PDF reader, real-time catalog search, and an administrative publishing dashboard.

---

## Key Features

### For Readers
- **Immersive PDF Reader**: High-fidelity canvas rendering powered by Mozilla's PDF.js.
- **Reading Controls**: Zoom magnification, dynamic page fitting, keyboard navigation (`ArrowLeft`, `ArrowRight`, `Escape`), and full-screen reading mode.
- **Real-Time Catalog Search**: Instant client-side filtering by book title or author name.
- **Responsive Typography**: Clean, adaptive typography pairing *Playfair Display* and *DM Sans* across desktop, tablet, and mobile displays.

### For Administrators
- **Publishing Dashboard**: Upload digital publications (PDF) with author attribution and optional custom cover images.
- **Automatic Cover Generation**: Generates customized editorial SVG book covers automatically if a cover image is omitted.
- **Session-Based Authentication**: Protected administration panel guarded by brute-force rate limiting and timing-safe credential verification.
- **Catalog Management**: Instant catalog pruning with synchronized filesystem cleanup for removed titles.

### Security & Architecture
- **Hardened HTTP Headers**: Comprehensive security headers configured via `helmet`.
- **Zero Secret Exposure**: Strict separation of administrative credentials from client-side bundles and markup.
- **Rate Limiting**: IP-based rate limiting on sensitive authentication routes via `express-rate-limit`.
- **Atomic State Updates**: Safe atomic file writes preventing race conditions during catalog synchronization.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v18+) |
| **Server Framework** | Express.js |
| **Authentication & Sessions** | `express-session`, `crypto` |
| **Security & Protection** | `helmet`, `express-rate-limit` |
| **File Handling** | `multer` |
| **PDF Rendering** | PDF.js (Mozilla) |
| **Frontend** | Vanilla JavaScript, Semantic HTML5, CSS3 Custom Properties |

---

## Project Structure

```text
├── data/
│   └── books.json          # Persistent catalog database (JSON)
├── uploads/                # Document and artwork storage (PDF & covers)
├── .env.example            # Template for environment configuration
├── index.html              # Frontend application, reader UI, and styling
├── package.json            # Node.js dependencies and script definitions
├── README.md               # Project documentation
└── server.js               # Express application server and REST API
```

---

## Getting Started

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Azgames724/E-book.git
   cd E-book
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the sample environment file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```

   Configure the variables in `.env`:
   ```ini
   # Administrative password for uploading and deleting books
   ADMIN_PASSWORD=YourSecureAdminPassword

   # Secret string used to sign session cookies
   SESSION_SECRET=your-random-32-character-session-secret

   # Port on which the application server listens
   PORT=3000

   # Runtime environment (development | production)
   NODE_ENV=development
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Access the Application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## REST API Reference

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service health status (`{"ok": true}`). |
| `GET` | `/api/books` | Retrieves all available library books with metadata and cover URLs. |
| `GET` | `/api/books/:id/pdf` | Streams the PDF document for in-browser rendering. |
| `GET` | `/api/books/:id/cover` | Serves the book cover image or auto-generated SVG. |

### Administrative Endpoints (Protected)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Authenticates administrator session (`password` in JSON payload). |
| `GET` | `/api/admin/me` | Verifies whether the current session has admin privileges. |
| `POST` | `/api/admin/logout` | Terminates administrative session and clears cookies. |
| `POST` | `/api/admin/books` | Uploads a new book (`multipart/form-data`: `title`, `author`, `pdf`, optional `cover`). |
| `DELETE` | `/api/admin/books/:id` | Permanently deletes a book document and its associated cover. |

---

## Production Deployment

When deploying to production environments (such as Google Cloud Run, Render, or a VPS):

1. **Set Production Environment**:
   ```bash
   export NODE_ENV=production
   ```
2. **Reverse Proxy & HTTPS**:
   The server includes `app.set("trust proxy", 1);` to correctly handle `X-Forwarded-Proto` and `X-Forwarded-For` headers behind SSL-terminating reverse proxies (such as Nginx, Cloudflare, or AWS ALB).
3. **Persistent Storage**:
   Ensure that the `/data` and `/uploads` directories are mounted on persistent storage volumes or persistent network storage so that uploaded documents and catalog entries persist across server restarts or container re-deployments.

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
