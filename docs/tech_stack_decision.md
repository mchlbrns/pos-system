# Tech Stack Decision — Universal POS System

> **Version:** 1.0  
> **Last Updated:** 2026-06-05  
> **Decision Status:** Approved  
> **Decision Makers:** Project Architect

---

## 1. Decision Summary

| Layer | Chosen Technology | Alternative Considered |
|-------|-------------------|----------------------|
| **Backend** | Node.js (Express.js) | PHP (Laravel) |
| **Frontend** | React (Vite, PWA) | Blade Templates (Laravel) |
| **Database** | SQLite (better-sqlite3) | MySQL / MariaDB |
| **Printer** | node-escpos + raw text | php-escpos |
| **Packaging** | Electron (optional) | XAMPP bundle |
| **Language** | JavaScript/TypeScript everywhere | PHP + JS |

---

## 2. Context & Constraints

### 2.1 Target Environment — Philippine Small Businesses

Understanding the deployment environment is critical to making the right tech choices:

| Factor | Reality |
|--------|---------|
| **Hardware** | Low-cost PCs (₱8,000–₱15,000), 4GB RAM, HDD or small SSD |
| **Internet** | Unreliable or absent; many areas have no fiber/DSL |
| **IT Support** | None — owner installs and maintains everything |
| **Printers** | Mix of cheap Chinese thermal (58mm/80mm) and old Epson dot-matrix |
| **Budget** | ₱0 for software licenses; ₱0/month for cloud services |
| **Users** | Non-technical; basic smartphone literacy |
| **Power** | Brownouts common in provinces; UPS not guaranteed |

### 2.2 Key Requirements Driving the Decision

1. **Zero-config database** — No MySQL server setup, no XAMPP
2. **Offline-first** — Full operation without internet
3. **Single language** — Reduce complexity, one skill set for maintenance
4. **Low resource usage** — Must run well on 4GB RAM machines
5. **Printer compatibility** — Direct ESC/POS commands to thermal printers
6. **Easy deployment** — One installer, no dependencies to configure
7. **PWA capability** — Install from browser, work offline

---

## 3. Detailed Comparison

### 3.1 Backend: Node.js (Express) vs PHP (Laravel)

#### Performance & Resource Usage

| Metric | Node.js (Express) | PHP (Laravel) |
|--------|-------------------|---------------|
| Memory footprint | ~30–50 MB idle | ~80–150 MB (with Apache/Nginx) |
| Startup time | ~1–2 seconds | ~3–5 seconds (framework bootstrap) |
| Concurrent handling | Event-loop, non-blocking I/O | Process-per-request (Apache) or worker pool |
| Background tasks | Native (setTimeout, workers) | Requires queue worker (Redis/database) |
| Cold start | Fast | Slow (autoloader, service providers) |

**Winner: Node.js** — Lower memory, faster startup, better for low-spec PCs.

#### Development Efficiency

| Factor | Node.js (Express) | PHP (Laravel) |
|--------|-------------------|---------------|
| Language consistency | JavaScript everywhere (front + back) | PHP backend + JS frontend |
| Learning curve | One language to master | Two languages, Laravel conventions |
| Ecosystem (npm) | 2M+ packages | Composer: 300K+ packages |
| Real-time support | Native WebSocket | Requires Pusher/Socket.io + Redis |
| Printer libraries | node-escpos (mature, active) | php-escpos (works, less maintained) |
| Plugin system | Dynamic require/import | Service providers (heavier) |

**Winner: Node.js** — Single language advantage is massive for a small team.

#### Deployment Complexity

| Factor | Node.js (Express) | PHP (Laravel) |
|--------|-------------------|---------------|
| Server requirement | Node.js runtime only | Apache/Nginx + PHP + Composer |
| Windows deployment | `node server.js` | XAMPP/WAMP stack |
| Installer size | ~50 MB (with Electron) | ~150 MB (XAMPP bundle) |
| Database setup | SQLite file, zero config | MySQL server + credentials |
| Environment config | `.env` file | `.env` + `php artisan key:generate` + migrations |
| Process management | PM2 or Electron | Apache service + queue worker |

**Winner: Node.js** — Dramatically simpler deployment for non-technical users.

#### Laravel's Strengths (Where PHP Wins)

| Factor | Advantage |
|--------|-----------|
| Built-in auth scaffolding | Laravel Breeze/Sanctum — faster auth setup |
| ORM (Eloquent) | More expressive than most Node ORMs |
| Artisan CLI | Code generation, migrations, seeders |
| Mature MVC structure | Convention over configuration |
| PHP developer availability | More PHP developers in the Philippines |

**Acknowledged but not decisive** — These advantages matter more for large teams and cloud-deployed apps, not for a single-machine offline POS.

---

### 3.2 Frontend: React (Vite PWA) vs Laravel Blade

| Factor | React (Vite PWA) | Laravel Blade |
|--------|-------------------|---------------|
| Offline capability | Service Worker + cache API = true offline | Server-rendered, no offline |
| Installability | PWA install prompt | Not installable |
| Responsiveness | SPA, instant UI updates | Full page reloads |
| State management | React state/context, excellent for cart | Session-based, page refresh loses cart |
| Component reuse | Full component library | Partial (includes) |
| Build size | ~200 KB gzipped (production) | N/A (server-rendered) |
| Developer experience | Hot Module Replacement | Laravel Mix (decent) |

**Winner: React (Vite PWA)** — Offline-first PWA is a hard requirement. Blade cannot do this.

---

### 3.3 Database: SQLite vs MySQL

This is perhaps the most impactful decision for the Philippine small business context.

| Factor | SQLite (better-sqlite3) | MySQL / MariaDB |
|--------|------------------------|-----------------|
| Installation | Zero — it's a file | Install MySQL Server, configure users |
| Configuration | None | `my.cnf`, user accounts, privileges |
| Memory usage | ~2–5 MB | ~200–400 MB idle |
| Backup | Copy one `.db` file | `mysqldump` or file copy (with server stopped) |
| Recovery | Copy backup file back | Restore dump, restart server |
| Concurrency | Good for 1–3 users (WAL mode) | Excellent for 100+ users |
| Max database size | ~281 TB (theoretical), ~10 GB practical | Very large |
| Transactions/sec | ~50,000 reads/sec, ~1,000 writes/sec | ~10,000+ writes/sec |
| JSON support | `json_extract()`, `json_set()` | Native JSON type |
| Full-text search | FTS5 extension (built-in) | FULLTEXT indexes |
| Cost | Free, no server | Free, but needs server process |
| Windows service | None needed | MySQL Windows Service |
| Crash resistance | WAL mode, atomic commits | InnoDB journaling |
| Upgrade path | Can migrate to MySQL later | N/A |

**Winner: SQLite** — For 1–3 user deployment, SQLite is perfect. Zero config, zero maintenance, zero cost.

#### Why SQLite is NOT a Compromise

Common objections and why they don't apply here:

| Objection | Response |
|-----------|----------|
| "SQLite can't handle concurrency" | A POS terminal has 1–3 users. SQLite in WAL mode handles this easily. |
| "SQLite is not a real database" | SQLite processes more transactions daily than any other database engine in the world. It's in every smartphone. |
| "What about multi-branch?" | V1 is single-machine. When multi-branch is needed, we migrate to MySQL — the schema is designed to be compatible. |
| "No user authentication" | Application-level auth. The database file is secured by OS file permissions. |

#### Migration Path to MySQL

The schema is designed to be MySQL-compatible:
- Standard SQL types (TEXT, INTEGER, REAL, BLOB)
- JSON fields use `json_extract()` which works in both
- Foreign keys are standard SQL
- Only change needed: `AUTOINCREMENT` → `AUTO_INCREMENT`
- Migration script will be provided in V2

---

### 3.4 Printer Layer: node-escpos vs php-escpos

| Factor | node-escpos | php-escpos |
|--------|-------------|------------|
| Protocol support | ESC/POS, Star | ESC/POS |
| Connection types | USB, Serial, Network, Bluetooth | USB, Serial, Network |
| Maintenance | Active community | Less active |
| Integration | Native with Node.js backend | PHP extension required |
| Raw text fallback | Easy (write to COM port) | Easy (fwrite) |
| Cash drawer | Supported | Supported |
| Barcode/QR | Supported | Supported |
| Image printing | Supported | Supported |

**Winner: node-escpos** — Better maintained, native integration with our backend.

---

## 4. Architecture Decision

### 4.1 Chosen Architecture

```
┌─────────────────────────────────────────────┐
│                  Client (Browser / PWA)       │
│         React + Vite + Service Worker         │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  POS UI  │ │ Reports  │ │  Admin Panel  │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
└───────────────────┬─────────────────────────┘
                    │ HTTP REST API (localhost)
┌───────────────────┴─────────────────────────┐
│                Server (Node.js + Express)     │
│                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ API Layer│ │  Auth    │ │Plugin Loader  │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Printer  │ │ Database │ │  Business    │  │
│  │ Driver   │ │  Layer   │ │  Plugins     │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
└───────────────────┬─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
  ┌─────┴──────┐        ┌──────┴──────┐
  │   SQLite   │        │   Printer   │
  │  Database  │        │  Hardware   │
  │  (.db file)│        │ (USB/Net)   │
  └────────────┘        └─────────────┘
```

### 4.2 Why Not Electron from Day 1?

| Approach | Pros | Cons |
|----------|------|------|
| **Browser-based (chosen for V1)** | Lighter, faster updates, PWA installable | No direct USB access (uses server for printer) |
| **Electron (optional wrapper)** | Native feel, system tray, auto-start | +80 MB download, more memory |
| **Decision** | Start with browser-based; Electron wrapper is optional for users who want "app-like" experience |

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SQLite write contention with 3+ users | Medium | Medium | WAL mode; queue writes; upgrade path to MySQL |
| node-escpos doesn't support a specific printer | Low | High | Raw text fallback; community contributions |
| Node.js unfamiliar to Filipino developers | Medium | Low | Large global community; extensive documentation |
| Power outage data loss | Medium | High | WAL mode; auto-save; auto-backup; UPS recommendation |
| Vite PWA service worker issues | Low | Medium | Thorough testing; fallback to browser mode |

---

## 6. Cost Comparison

### 6.1 Our Stack (Node.js + React + SQLite)

| Item | Cost |
|------|------|
| Node.js | Free (MIT license) |
| React | Free (MIT license) |
| SQLite | Free (public domain) |
| Express.js | Free (MIT license) |
| node-escpos | Free (MIT license) |
| Vite | Free (MIT license) |
| Hosting/Cloud | ₱0/month (runs locally) |
| Database server | ₱0/month (no server) |
| **Total monthly cost** | **₱0** |

### 6.2 Laravel Stack Alternative

| Item | Cost |
|------|------|
| PHP + Laravel | Free (MIT license) |
| MySQL Server | Free (GPL), but needs a running process |
| Apache/Nginx | Free, but needs configuration |
| XAMPP | Free, but ~150 MB footprint |
| Hosting/Cloud (if online) | ₱500–₱2,000/month |
| **Total monthly cost** | **₱0 (offline) to ₱2,000 (online)** |

### 6.3 Hardware Requirement Comparison

| Resource | Our Stack | Laravel Stack |
|----------|-----------|---------------|
| RAM (idle) | ~80 MB (Node + browser) | ~400 MB (Apache + MySQL + browser) |
| Disk space | ~100 MB installed | ~300 MB (XAMPP + project) |
| CPU (idle) | < 1% | ~2–3% (MySQL service) |
| Min recommended RAM | 4 GB | 8 GB |

---

## 7. Final Decision Rationale

### Why This Stack Wins for Philippine Small Businesses:

1. **₱0 monthly cost** — No cloud, no server, no licenses
2. **Runs on ₱8,000 PCs** — 80 MB RAM vs 400 MB RAM footprint
3. **One-click install** — No XAMPP, no MySQL, no Apache configuration
4. **Offline-first** — Works in areas with no internet
5. **One language (JavaScript)** — Easier to maintain, hire, and learn
6. **PWA** — Install from browser, works offline, updates easily
7. **SQLite** — Copy one file to backup; copy it back to restore
8. **Future-proof** — Can upgrade to MySQL/PostgreSQL when needed
9. **Printer driver** — Native ESC/POS support in the same language
10. **Plugin architecture** — Add new business types without touching core code

### The Decisive Factor

> For a non-technical sari-sari store owner in Quezon Province who bought a ₱12,000 PC from CDR-King: **which stack lets them install a POS system by double-clicking an installer, with no internet, no IT support, and no monthly fees?**
>
> The answer is Node.js + React + SQLite. Laravel + MySQL requires explaining what a "database server" is.

---

## 8. Technology Versions

| Technology | Version | Notes |
|------------|---------|-------|
| Node.js | 20 LTS | Long-term support until April 2026 |
| Express.js | 4.x | Stable, well-documented |
| React | 18.x | Concurrent features, hooks |
| Vite | 5.x | Fast builds, PWA plugin |
| SQLite | 3.45+ | JSON support, WAL mode |
| better-sqlite3 | 11.x | Synchronous API, fast |
| node-escpos | 3.x | ESC/POS protocol |
| vite-plugin-pwa | 0.20+ | Service worker generation |
| i18next | 23.x | Internationalization (Filipino/English) |
| Electron | 30.x | Optional desktop wrapper |

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-05 | Choose Node.js over Laravel | Lower resource usage, single language, simpler deployment |
| 2026-06-05 | Choose SQLite over MySQL | Zero config, zero maintenance, perfect for 1–3 users |
| 2026-06-05 | Choose React PWA over Blade | Offline-first is a hard requirement |
| 2026-06-05 | Choose better-sqlite3 over sql.js | Native performance, synchronous API |
| 2026-06-05 | Electron is optional, not required | Browser-based PWA is sufficient for V1 |
