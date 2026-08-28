# Blog Pribadi Sederhana — Design Spec

**Tanggal:** 2026-08-28
**Stack:** Astro (template resmi `blog`)
**Target deploy:** Netlify / Vercel (static)

## Tujuan

Blog pribadi minimal untuk menulis artikel dalam format markdown, deploy static ke Netlify/Vercel, dengan syntax highlighting untuk code block.

## Fitur

- Homepage dengan welcome + link ke blog
- Halaman daftar semua post (`/blog`)
- Halaman detail post (`/blog/[slug]`) render markdown
- Syntax highlighting untuk code block (via Shiki, bawaan Astro)
- About page (bawaan template, dibiarkan)
- RSS feed (bawaan template, dibiarkan)

## Arsitektur

Astro static site generation (SSG). Semua halaman di-build jadi HTML statis saat `npm run build`, output ke `dist/`. Tidak ada server runtime.

### Struktur direktori

```
src/
  content/
    blog/                    # file .md/.mdx untuk setiap post
      first-post.md
      ...
    config.ts                # schema Zod untuk validasi frontmatter
  pages/
    index.astro              # homepage
    about.astro              # about page
    blog/
      index.astro            # list semua post
      [...slug].astro        # detail post per slug
    rss.xml.js               # RSS feed
  layouts/
    BlogPost.astro           # layout untuk halaman detail post
  components/
    Header.astro
    Footer.astro
    BaseHead.astro
    FormattedDate.astro
  styles/
    global.css
public/                      # asset static (favicon, images)
astro.config.mjs
package.json
tsconfig.json
```

### Data flow

1. Penulis membuat file markdown baru di `src/content/blog/nama-post.md` dengan frontmatter:
   ```yaml
   ---
   title: 'Judul Post'
   description: 'Ringkasan singkat'
   pubDate: 'Aug 28 2026'
   heroImage: '/blog-placeholder.jpg'  # opsional
   ---
   ```
2. Astro Content Collections membaca semua file di collection `blog`, validasi terhadap schema Zod (`config.ts`).
3. `pages/blog/index.astro` memanggil `getCollection('blog')`, sort by `pubDate` desc, render list.
4. `pages/blog/[...slug].astro` generate satu halaman per post, render markdown ke HTML.
5. Code block di markdown otomatis di-highlight oleh Shiki (built-in Astro, tanpa config tambahan).

## Menulis Post Baru

1. Buat file `src/content/blog/judul-post.md`
2. Isi frontmatter (title, description, pubDate wajib)
3. Tulis konten markdown di bawahnya
4. Commit + push → auto-deploy

## Deploy

**Vercel:**
- Import repo → auto-detect Astro → deploy

**Netlify:**
- Import repo → build command `npm run build`, publish `dist` → deploy

Tidak perlu env variable. Zero-config kedua platform.

## Testing

Manual verification setelah scaffold:
- `npm run dev` → buka `http://localhost:4321`, cek homepage, list post, detail post
- Cek syntax highlighting di post yang berisi code block
- `npm run build` → exit 0, output ke `dist/`

## Yang Tidak Termasuk (ponytail)

- Custom design system → pakai styling default template; upgrade saat butuh brand look
- Multi collection (notes, tutorial, dsb) → satu collection `blog` saja; upgrade saat >1 tipe konten
- Dark mode toggle → tidak diminta
- Tag/kategori filter → tidak diminta
- Search → tidak diminta
- Komentar → tidak diminta

## Command Setup

```bash
npm create astro@latest -- --template blog --typescript strict --install --git --yes .
```

Lalu:
```bash
npm run dev
```
