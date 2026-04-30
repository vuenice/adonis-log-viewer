# Vue Nice Logs

Lightweight **log viewer UI** with a **Vue 3** frontend and an **AdonisJS** backend (monorepo via npm workspaces).

![Log Viewer Screenshot](app/frontend/public/assets/log-viewer.png)

## Features

- Browse multiple log files from a sidebar
- Filter/search logs, sort order, and paginate
- Quick counters by level (debug/info/warn/error)

## Getting started

Install dependencies from the repo root:

```bash
npm install
```

Backend setup:

```bash
copy app\backend\.env.example app\backend\.env
cd app\backend
node ace generate:key
```

Run dev servers:

```bash
# frontend (http://localhost:5173)
npm run dev

# backend (http://localhost:3333)
npm run dev:backend
```

## Scripts (root)

- `npm run dev`: frontend dev server
- `npm run dev:backend`: backend dev server
- `npm run lint`: lint all workspaces