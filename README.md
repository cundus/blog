# mydiary

Blog pribadi sederhana dibangun dengan [Astro](https://astro.build). Konten ditulis dalam Markdown, di-render statis, siap deploy ke Netlify atau Vercel.

## Fitur

- Daftar post di halaman utama (`/`)
- Halaman detail per-post (`/blog/[slug]`)
- Syntax highlighting via Shiki (bawaan Astro)
- SEO tags, Open Graph, sitemap, RSS feed
- 100% statis, cepat, tanpa server runtime

## Struktur

```text
src/
├── content/
│   └── blog/           # tulis post di sini (.md / .mdx)
├── pages/              # routing berbasis file
├── layouts/            # layout Astro
├── components/         # komponen UI
└── content.config.ts   # schema frontmatter (title, description, pubDate, heroImage?, updatedDate?)
```

## Menulis Post Baru

Tambahkan file `.md` di `src/content/blog/`. Contoh minimal:

```markdown
---
title: 'Judul Post'
description: 'Ringkasan singkat.'
pubDate: 'Aug 28 2026'
---

Isi post dalam Markdown.

## Sub-bagian

Blok kode dengan syntax highlighting otomatis:

    ```js
    console.log('halo');
    ```
```

Frontmatter wajib: `title`, `description`, `pubDate`. Opsional: `heroImage` (path relatif ke gambar di `src/assets/`), `updatedDate`.

## Perintah

Jalankan dari root proyek:

| Perintah              | Aksi                                        |
| :-------------------- | :------------------------------------------ |
| `npm install`         | Install dependencies                        |
| `npm run dev`         | Server dev di `http://localhost:4321`       |
| `npm run build`       | Build ke `./dist/`                          |
| `npm run preview`     | Preview hasil build sebelum deploy          |

## Deploy

### Netlify

Sudah ada `netlify.toml`. Cukup:

1. Push repo ke GitHub/GitLab.
2. Di Netlify dashboard: **Add new site** → **Import an existing project** → pilih repo.
3. Netlify auto-detect config dari `netlify.toml` (build: `npm run build`, publish: `dist`, Node 20).
4. Deploy.

### Vercel

1. Push repo ke GitHub/GitLab.
2. Di Vercel dashboard: **Add New Project** → import repo.
3. Framework Preset: **Astro** (auto-detect). Build command dan output dir sudah benar.
4. Deploy.

## Tech Stack

- [Astro](https://astro.build) — static site generator
- Markdown / MDX untuk konten
- Shiki untuk syntax highlighting
- Node.js 20+
