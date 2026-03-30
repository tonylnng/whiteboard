<div align="center">

# 🖊️ Whiteboard — Real-Time Collaborative Canvas

**A powerful, open whiteboard platform built for teams who think visually.**

[Report Bug](https://github.com/tonylnng/whiteboard/issues) · [Request Feature](https://github.com/tonylnng/whiteboard/issues)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)
![Docker](https://img.shields.io/badge/docker-required-blue.svg)

</div>

---

## ✨ What Is This?

Your team has ideas. Whiteboard gets them out of everyone's heads and onto a shared canvas — in real time.

Run a sprint planning session. Map out a system architecture. Facilitate a retro. Sketch a user flow. Vote on priorities. Whatever you're working through, Whiteboard gives your team a visual space to think together — and an AI that participates alongside you.

Self-hosted, open, and built on [tldraw](https://tldraw.dev).

### 🎯 Key Features

| Feature | Description |
|---------|-------------|
| 🎨 **Infinite Canvas** | tldraw-powered canvas with shapes, text, arrows, images |
| 👥 **Real-time Collaboration** | Live cursors, instant sync across all users |
| 📋 **18 Templates** | HMW, SWOT, Retrospectives, PI Planning, OKR, Lean Canvas & more |
| 🗳️ **Dot Voting** | Facilitate decisions with visual vote badges + result charts |
| 🔷 **Shape Library** | 34 shapes across Flowchart, BPMN, ERD, Network, Wireframe categories |
| 🎬 **Media Embed** | YouTube, Figma, Google Slides, Spotify — right on the canvas |
| ⏱️ **Brainstorm Toolbar** | Timer, anonymous mode, facilitator tools |
| 🔗 **Guest Access** | Share boards via link — no account needed |
| 📁 **Board Management** | Folders, dashboards, board CRUD |

### 🤖 AI Features

Powered by [OpenRouter](https://openrouter.ai) — bring your own model (GPT-4o, Gemini, Claude, Mistral, Llama & more).

| Feature | Description |
|---------|-------------|
| ✨ **Generate Stickies** | Create sticky notes from a topic instantly |
| 🧠 **Canvas Agent** | Intelligent shape placement and arrangement |
| 📝 **Board Summary** | Summarize all content on the board |
| 🔀 **Auto Layout** | Rearrange shapes intelligently |
| ✍️ **Text Assistant** | Improve or rewrite text on canvas |
| 📊 **Text to Diagram** | Convert text descriptions to diagrams |
| 🔗 **Smart Connect** | Auto-connect related shapes |
| 🗂️ **Sticky Cluster** | Group similar stickies automatically |

---

## 🏗️ Architecture

```
whiteboard/
├── client/          # React 18 + tldraw v3 + Tailwind CSS (Frontend)
├── server/          # NestJS 10 + TypeORM + Socket.IO (Backend API)
├── collab/          # Hocuspocus (Real-time WebSocket server)
├── nginx/           # Reverse proxy config
├── scripts/         # DB init scripts
└── docker-compose.yml
```

### Tech Stack

**Frontend**
- [React 18](https://react.dev) + [TypeScript](https://typescriptlang.org)
- [tldraw v3](https://tldraw.dev) — canvas engine
- [Vite](https://vitejs.dev) — build tool
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Zustand](https://zustand-demo.pmnd.rs) — state management
- [Socket.IO Client](https://socket.io) — real-time sync
- [Recharts](https://recharts.org) — vote result charts

**Backend**
- [NestJS 10](https://nestjs.com) — API framework
- [TypeORM](https://typeorm.io) + [PostgreSQL 16](https://postgresql.org) — database
- [Socket.IO](https://socket.io) — WebSocket gateway
- [Redis](https://redis.io) — caching & sessions
- [JWT](https://jwt.io) — authentication
- [Hocuspocus](https://hocuspocus.dev) — collaborative document sync

**AI**
- [OpenRouter](https://openrouter.ai) — LLM gateway (supports 100+ models)
- Bring your own model — set `AI_DEFAULT_MODEL` in `.env` to any model available on OpenRouter (e.g. GPT-4o, Gemini, Mistral, Llama, Claude, etc.)

**Infrastructure**
- [Docker](https://docker.com) + Docker Compose
- [Nginx](https://nginx.org) — reverse proxy
- MinIO — file/image storage

---

## 🚀 Quick Start

### Prerequisites

Make sure you have these installed:

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose v2
- [Node.js 20+](https://nodejs.org) (for local development)
- [Git](https://git-scm.com)

### 1. Clone the repo

```bash
git clone https://github.com/tonylnng/whiteboard.git
cd whiteboard
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Database
POSTGRES_USER=whiteboard
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=whiteboard

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret

# AI (get your key from openrouter.ai — supports GPT-4o, Gemini, Claude, Mistral, Llama & more)
OPENROUTER_API_KEY=sk-or-...
AI_DEFAULT_MODEL=openai/gpt-4o   # change to any model on openrouter.ai/models

# App URL
APP_URL=http://localhost:3502
```

### 3. Build & run with Docker

```bash
docker compose up -d --build
```

This starts 5 services:
- `wb-postgres` — PostgreSQL database (port 5434)
- `wb-redis` — Redis cache (port 6382)
- `wb-app` — NestJS API (port 3500)
- `wb-hocuspocus` — Collab server (port 3501)
- `wb-client` — React frontend (port 3502)

### 4. Open the app

```
http://localhost:3502
```

Register an account and start your first board! 🎉

### Updating

```bash
git pull
docker compose up -d --build
```

---

## 📁 Project Structure Deep Dive

```
server/src/
├── ai/                  # AI features (sticky generator, canvas agent, summary...)
├── auth/                # JWT authentication, guards, strategies
├── boards/              # Board CRUD, sharing, snapshots
├── collab/              # Socket.IO gateway for real-time collaboration
├── comments/            # Board comments
├── folders/             # Board folder management
├── users/               # User management
└── upload/              # File upload (MinIO)

client/src/
├── components/
│   ├── ai/              # AI Panel UI
│   └── board/           # BrainstormToolbar, VoteBadgeOverlay, ShapeLibrary...
├── shapes/              # Custom tldraw shapes (VoteItem, VoteChart)
├── hooks/               # useCollaboration (Socket.IO + tldraw sync)
├── stores/              # Zustand stores (auth, UI)
├── pages/               # Route pages (Dashboard, Board, Login, Register)
└── lib/                 # API client, shape library config
```

---

## 🔧 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_*` | ✅ | Database connection |
| `REDIS_*` | ✅ | Redis connection + password |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `OPENROUTER_API_KEY` | ✅ | AI features — get a key at [openrouter.ai](https://openrouter.ai) |
| `APP_URL` | ✅ | Public URL of the app |
| `AI_DEFAULT_MODEL` | ⚙️ | Any model slug from [openrouter.ai/models](https://openrouter.ai/models) |
| `AI_TEMPERATURE` | ⚙️ | Default: `0.7` |
| `MINIO_*` | ⚙️ | File storage (optional) |

---

## 🛠️ Troubleshooting

**Containers won't start?**
```bash
docker compose logs wb-app
docker compose logs wb-client
```

**Database connection issues?**
```bash
# Check postgres is healthy
docker compose ps
# Re-run init
docker compose down -v && docker compose up -d --build
```

**Frontend can't reach backend?**
- Check `VITE_API_URL` in your `.env` points to the correct backend URL

---

## 📄 License

MIT

---

<div align="center">
Built with ❤️ using tldraw, NestJS, and too much coffee ☕
</div>
