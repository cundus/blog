# Blog Pribadi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a static personal blog using Astro's official `blog` template, verify it runs and builds, add a sample markdown post with a code block, and prepare for Netlify/Vercel deploy.

**Architecture:** Astro SSG. Official `blog` template provides layouts, Content Collections, RSS, Shiki syntax highlighting out of the box. Posts are `.md` files in `src/content/blog/`. Build outputs static HTML to `dist/`.

**Tech Stack:** Astro, TypeScript (strict), MDX, Shiki (built-in), Node.js 18+.

**Working directory:** `C:\Users\cundus\Documents\Project\test-drive\mydiary`

---

## File Structure (from template)

Template will create:
- `src/content/blog/` — markdown posts
- `src/content/config.ts` — Zod schema for post frontmatter
- `src/pages/index.astro`, `about.astro`, `blog/index.astro`, `blog/[...slug].astro`, `rss.xml.js`
- `src/layouts/BlogPost.astro`
- `src/components/Header.astro`, `Footer.astro`, `BaseHead.astro`, `FormattedDate.astro`
- `src/styles/global.css`
- `public/` (favicon, sample images)
- `astro.config.mjs`, `package.json`, `tsconfig.json`, `.gitignore`

We will add:
- `src/content/blog/hello-world.md` — sample post with code block to verify Shiki
- `netlify.toml` — Netlify build config (optional but explicit)

---

## Task 1: Initialize Git Repository

**Files:**
- Create: `.gitignore` (via Astro template later, but init repo first)

- [ ] **Step 1: Initialize git**

Run:
```powershell
git init
git branch -M main
```

Expected: `Initialized empty Git repository in ...\.git\`

- [ ] **Step 2: Commit existing docs/**

Run:
```powershell
git add docs .codegraph
git commit -m "docs: add design spec and implementation plan for blog"
```

Expected: commit success with 2+ files.

---

## Task 2: Scaffold Astro Blog Template

**Files:**
- Modify: entire project directory (template writes into current dir)

- [ ] **Step 1: Run Astro create with blog template**

Run (in project root):
```powershell
npm create astro@latest -- --template blog --typescript strict --install --no-git --yes .
```

Flags explained:
- `--template blog` — official blog starter
- `--typescript strict` — strict TS
- `--install` — auto-install deps
- `--no-git` — we already init'd git
- `--yes` — skip prompts
- `.` — install into current directory

Expected: files written, `npm install` runs, exit 0. `node_modules/` and `package.json` present.

- [ ] **Step 2: Verify template files exist**

Run:
```powershell
Test-Path src\pages\index.astro; Test-Path src\content\blog; Test-Path astro.config.mjs; Test-Path package.json
```

Expected: all `True`.

- [ ] **Step 3: Commit scaffold**

Run:
```powershell
git add -A
git commit -m "feat: scaffold Astro blog template"
```

Expected: commit success with many files.

---

## Task 3: Verify Dev Server Runs

- [ ] **Step 1: Start dev server (background)**

Run:
```powershell
npm run dev
```

Expected: output includes `Local http://localhost:4321/` within ~5s.

- [ ] **Step 2: Fetch homepage to verify**

In another shell:
```powershell
Invoke-WebRequest -Uri http://localhost:4321/ -UseBasicParsing | Select-Object StatusCode
```

Expected: `StatusCode : 200`.

- [ ] **Step 3: Fetch blog list**

```powershell
Invoke-WebRequest -Uri http://localhost:4321/blog -UseBasicParsing | Select-Object StatusCode
```

Expected: `StatusCode : 200`.

- [ ] **Step 4: Stop dev server**

Ctrl+C in the dev server shell.

---

## Task 4: Add Sample Post With Code Block

**Files:**
- Create: `src/content/blog/hello-world.md`

- [ ] **Step 1: Write sample post**

Create `src/content/blog/hello-world.md`:

```markdown
---
title: 'Hello World'
description: 'Post pertama di blog pribadi ini.'
pubDate: 'Aug 28 2026'
---

Selamat datang di blog pribadi saya. Post ini menguji rendering markdown dan syntax highlighting.

## Contoh Code Block

```js
function greet(name) {
  return `Halo, ${name}!`;
}

console.log(greet('dunia'));
```

## Daftar

- Poin satu
- Poin dua
- Poin tiga

**Selesai.**
```

- [ ] **Step 2: Verify post appears in dev server**

Start dev server:
```powershell
npm run dev
```

Fetch:
```powershell
Invoke-WebRequest -Uri http://localhost:4321/blog/hello-world/ -UseBasicParsing | Select-Object StatusCode
```

Expected: `StatusCode : 200`. Also visually verify in browser that code block is syntax-highlighted.

Stop dev server (Ctrl+C).

- [ ] **Step 3: Commit sample post**

```powershell
git add src/content/blog/hello-world.md
git commit -m "feat: add hello world sample post"
```

Expected: commit success.

---

## Task 5: Verify Production Build

- [ ] **Step 1: Run build**

```powershell
npm run build
```

Expected: exit code 0. Output includes `Complete!` and mentions pages generated. `dist/` directory created.

- [ ] **Step 2: Verify build artifacts**

```powershell
Test-Path dist\index.html; Test-Path dist\blog\index.html; Test-Path dist\blog\hello-world\index.html
```

Expected: all `True`.

- [ ] **Step 3: Preview production build**

```powershell
npm run preview
```

Fetch homepage:
```powershell
Invoke-WebRequest -Uri http://localhost:4321/ -UseBasicParsing | Select-Object StatusCode
```

Expected: `StatusCode : 200`.

Stop preview server (Ctrl+C).

---

## Task 6: Add Netlify Config (Optional Explicit)

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Create netlify.toml**

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

- [ ] **Step 2: Commit**

```powershell
git add netlify.toml
git commit -m "chore: add netlify deploy config"
```

Expected: commit success.

Note: Vercel auto-detects Astro, no config file needed. Netlify also auto-detects, but explicit `netlify.toml` locks the Node version and avoids surprises.

---

## Task 7: Update README

**Files:**
- Modify: `README.md` (template generates one; replace/augment)

- [ ] **Step 1: Overwrite README with usage instructions**

Overwrite `README.md`:

```markdown
# Blog Pribadi

Blog pribadi sederhana dibangun dengan [Astro](https://astro.build). Konten dalam markdown, deploy static ke Netlify/Vercel.

## Menulis Post Baru

1. Buat file `src/content/blog/nama-post.md`
2. Isi frontmatter:
   ```yaml
   ---
   title: 'Judul'
   description: 'Ringkasan'
   pubDate: 'Aug 28 2026'
   ---
   ```
3. Tulis konten markdown di bawahnya
4. Commit + push → auto-deploy

## Development

```bash
npm run dev       # dev server di http://localhost:4321
npm run build     # build ke ./dist
npm run preview   # preview production build
```

## Deploy

**Vercel:** import repo → deploy (auto-detect Astro).

**Netlify:** import repo → deploy (build config di `netlify.toml`).
```

- [ ] **Step 2: Commit**

```powershell
git add README.md
git commit -m "docs: add README with usage and deploy instructions"
```

Expected: commit success.

---

## Task 8: Final Verification

- [ ] **Step 1: Clean build from scratch**

```powershell
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build
```

Expected: exit 0, `dist/` regenerated.

- [ ] **Step 2: Check git log**

```powershell
git log --oneline
```

Expected: at least 6 commits (docs, scaffold, sample post, netlify, readme, plus any earlier).

- [ ] **Step 3: Report ready-to-deploy**

Confirm to user:
- Dev server works
- Production build works
- Sample post renders with syntax highlighting
- Ready to push to GitHub and connect to Vercel/Netlify

---

## Done Criteria

- `npm run dev` serves homepage, blog list, and sample post
- `npm run build` exits 0 with `dist/` populated
- Sample post `hello-world.md` visible at `/blog/hello-world/` with highlighted code block
- Git history clean, commits atomic
- `netlify.toml` and `README.md` in place
