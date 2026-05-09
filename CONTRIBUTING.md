# Contributing

Hello and thank you for your interest in contributing to Vue Nice Logs.

Contributions are welcome in many forms: issues, documentation, spreading the word, and code.

## Pick an area

- **Issues & discussions** — Bug reports and feature ideas belong in Issues. Use Discussions when you’re unsure something is a bug or you want broader feedback before opening an issue.
- **Documentation** — Improvements to this README, CONTRIBUTING, or inline code comments are always helpful. The documentation language is English.
- **Spread the word** — If Vue Nice Logs helps you, tell others (blog posts, social posts, talks). You can link to this repository.
- **Code** — Follow the steps below for pull requests.

## Code contribution

### Step 1 — Fork and clone

Fork this repository, then clone your fork and enter the directory:

```bash
git clone https://github.com/<YOUR-USERNAME>/adonis-log-viewer.git
cd adonis-log-viewer
```

### Step 2 — Install dependencies

From the **repository root** (npm workspaces install both the Adonis backend and the Vue frontend):

```bash
npm install
```

### Step 3 — Backend environment

Create `app/backend/.env` from the example and generate an app key:

```bash
# macOS / Linux
cp app/backend/.env.example app/backend/.env

# Windows (PowerShell / cmd)
copy app\backend\.env.example app\backend\.env

cd app/backend
node ace generate:key
cd ../..
```

Run migrations if you need the bundled database features:

```bash
cd app/backend
node ace migration:run
cd ../..
```

### Step 4 — Create a branch

Use a descriptive branch name:

```bash
git checkout -b fix/your-fix-name
# or
git checkout -b feature/your-feature-name
```

### Step 5 — Run the viewer while developing

**Terminal A — Adonis**

```bash
npm run dev:backend
```

**Terminal B — Vite** (loads the Vue app with HMR; the `/logs` page pulls scripts from the dev server unless you use production assets)

```bash
npm run dev:frontend
```

Open `http://localhost:3333/logs` (or whatever `HOST` / `PORT` you set in `app/backend/.env`). Optionally set **`LOGS_VITE_ORIGIN`** and **`LOGS_VITE_BASE`** on the backend if Vite runs on another origin or base path.

To test **production-built** assets only:

```bash
npm run build:frontend
cd app/backend
node ace serve --hmr
```

### Step 6 — Lint and tests

Before opening a PR, run linters across workspaces:

```bash
npm run lint
```

Backend tests:

```bash
cd app/backend
npm test
cd ../..
```

### Step 7 — Try your changes in context

Smoke-test browsing log files under `app/backend/logs/`, pagination, filtering, and search. If your change touches the UI, verify both light/dark modes if applicable.

### Step 8 — Commit and push

Prefer short, clear commit messages:

```bash
git commit -m "Fix pagination when reopening large log files"
git push origin your-branch-name
```

### Step 9 — Open a Pull Request

Open a PR from your fork. In the description, explain **what** changed and **why**, how to reproduce or verify manually, and link any related Issues.

---

Thank you for contributing.
