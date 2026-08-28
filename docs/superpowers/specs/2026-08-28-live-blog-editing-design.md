# Live Blog Editing — Design Spec

**Date**: 2026-08-28
**Status**: Approved (pending user file review)
**Author**: Sisyphus (brainstorming session)

## Problem

Astro static blog. Publishing a post = edit `.md` in repo → git push → Netlify rebuild. Author (single user, private) wants to add & edit blog posts directly from the live site without touching the repo.

## Non-Goals

- Multi-author / RBAC
- Public comments
- Media library / image uploads for new posts (Q7 decision: no hero images for DB posts)
- Real-time collaboration
- Version history / drafts autosave server-side (client-side EasyMDE autosave OK)
- Automated migration of old `.md` posts to DB

## Constraints & Decisions

| Q | Decision |
|---|---|
| Who writes | Single author, private (owner only) |
| Publish flow | DB + SSR (instant publish, no rebuild) |
| Hosting | Stay on Netlify + Prisma Postgres (or fallback to Neon / Supabase / Netlify DB if Prisma Postgres only exposes Accelerate URL) |
| Old `.md` posts | Dual source — old stays as `.md`, new goes to DB, `/blog` merges both |
| Auth | Password + signed session cookie, session record in DB |
| Editor UX | EasyMDE (markdown + preview + toolbar) |
| Hero image for new posts | Skipped entirely |

---

## Section 1 — Overall Architecture

**Stack:**
- Astro **hybrid mode** (default `output: 'static'`, opt-in `prerender = false` per page)
- Adapter: `@astrojs/netlify` (deploys as Netlify Functions)
- Database: **Prisma Postgres** (managed) — or Neon/Supabase/Netlify DB fallback
- ORM: **Drizzle** (`drizzle-orm` + `postgres-js` driver)
- Auth: bcrypt password compare + DB-backed session, HMAC-signed cookie is NOT used — raw random token in cookie, SHA-256 hash stored server-side
- Editor: **EasyMDE** on `/admin/new` & `/admin/edit/[id]` (CDN or bundled)

**Dual-source blog reading:**
- `/blog` (list) & `/blog/[slug]` (detail) query BOTH sources:
  - `.md` content collection (`src/content/blog/*.md`)
  - `posts` table in DB
- Merged & sorted by `pubDate` desc
- Slug collision validated at app layer (`.md` wins on collision)

**New pages:**
- `/admin/login` — public SSR form
- `/admin` — protected dashboard (list DB posts, actions)
- `/admin/new` — protected create form
- `/admin/edit/[id]` — protected edit form
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/posts`
- `PATCH /api/posts/[id]`
- `DELETE /api/posts/[id]`

**Prerender matrix:**

| Page | Mode | Reason |
|---|---|---|
| `/` (home) | prerender (static) | static content |
| `/about` | prerender | static content |
| `/blog` (list) | SSR | needs DB fetch |
| `/blog/[slug]` | SSR | mix .md + DB |
| `/rss.xml` | SSR | include DB posts |
| `/admin/*` | SSR | session check |
| `/api/*` | SSR | endpoints |

---

## Section 2 — Database Schema (Drizzle)

**Files:**
- `drizzle.config.ts` — config
- `src/db/schema.ts` — table definitions
- `src/db/client.ts` — drizzle client
- `drizzle/` — generated migrations (committed)

**Schema (`src/db/schema.ts`):**

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const posts = pgTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  body: text('body').notNull(),                                 // raw markdown
  pubDate: timestamp('pub_date').defaultNow().notNull(),
  updatedDate: timestamp('updated_date').defaultNow().notNull().$onUpdate(() => new Date()),
  published: boolean('published').default(false).notNull(),     // false = draft
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  publishedPubDateIdx: index('posts_published_pubdate_idx').on(t.published, t.pubDate),
}));

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  tokenHash: text('token_hash').notNull().unique(),  // SHA-256 of raw cookie token
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  expiresAtIdx: index('sessions_expires_at_idx').on(t.expiresAt),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
```

**Field decisions:**
- No `heroImage` (per Q7)
- No `author` (single user, hardcode in layout)
- `body` stores raw markdown, rendered at SSR
- Session in DB (not JWT) to allow server-side revoke on logout
- `tokenHash` stored, raw token only in cookie — DB leak doesn't expose live sessions
- Composite index `[published, pubDate]` for "published posts sorted by date" queries

**Env vars:**
- `DATABASE_URL` — postgres:// direct connection string
- `ADMIN_PASSWORD_HASH` — bcrypt hash
- `SESSION_SECRET` — 32+ random bytes (reserved for future signing; not strictly required with DB-backed sessions but keep for defense in depth)

**Prisma Postgres compat note:** Prisma Postgres exposes 2 URL schemes: `prisma+postgres://` (Accelerate, Prisma-only) and direct `postgres://`. Drizzle requires the direct one. If Prisma Postgres plan only exposes Accelerate, fall back to Neon (0.5GB free), Supabase (500MB free), or Netlify DB beta.

---

## Section 3 — Auth Flow

**Password setup (one-time, offline):**
- Script `scripts/hash-password.mjs`:
  ```js
  import bcrypt from 'bcryptjs';
  const [,, pw] = process.argv;
  if (!pw) { console.error('Usage: node scripts/hash-password.mjs <password>'); process.exit(1); }
  console.log(await bcrypt.hash(pw, 12));
  ```
- User runs locally: `node scripts/hash-password.mjs "mypassword"` → copies hash to Netlify env var `ADMIN_PASSWORD_HASH`
- Plaintext password never touches repo or server file

**Login flow (`POST /api/auth/login`):**
1. Form submits `{ password }` from `/admin/login`
2. Server: `bcrypt.compare(password, ADMIN_PASSWORD_HASH)`
3. If valid:
   - Generate raw token: `crypto.randomBytes(32).toString('base64url')` (43 chars)
   - Hash: `sha256(rawToken)` → insert into `sessions` with `expiresAt = now + 7 days`
   - Set cookie: `session=<rawToken>`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=604800`
   - 303 redirect to `/admin`
4. If invalid: render `/admin/login?error=1`, delay 500ms (brute-force mitigation)

**Session verification (`src/lib/auth.ts`):**
```typescript
export async function getSession(cookies: AstroCookies): Promise<Session | null> {
  const raw = cookies.get('session')?.value;
  if (!raw) return null;
  const tokenHash = sha256(raw);
  const [row] = await db.select().from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}
```

**Middleware (`src/middleware.ts`):**
- Intercepts all requests
- If `pathname` matches `/admin*` or `/api/posts*`:
  - Call `getSession(context.cookies)`
  - If `null`: redirect to `/admin/login` (pages) or return 401 JSON (API)
  - If valid: set `context.locals.session`, continue
- `/api/auth/login` skips middleware (public)
- `/admin/login` skips middleware (public)

**Logout (`POST /api/auth/logout`):**
1. Read `context.locals.session`
2. `DELETE FROM sessions WHERE id = session.id`
3. Clear cookie: `session=; Max-Age=0`
4. 303 redirect to `/admin/login`

**CSRF:** `SameSite=Lax` cookie is sufficient — browsers don't send cookies on cross-site state-changing requests. Double-submit CSRF token skipped (YAGNI for single-user private admin).

**Rate limit:** Skipped. 500ms delay + strong password + single user = acceptable risk.

**Deps:**
- `bcryptjs` (pure JS, edge-safe)
- `@paralleldrive/cuid2` (already in Section 2)

---

## Section 4 — SSR Blog Reading (dual-source)

**Loader helper (`src/lib/posts.ts`):**

```typescript
import { getCollection } from 'astro:content';
import { db } from '../db/client';
import { posts as postsTable } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export type UnifiedPost = {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  heroImage?: string;          // only from .md
  source: 'markdown' | 'db';
  body: string;                // raw markdown
  render?: () => Promise<{ Content: any }>;  // only .md
};

export async function getAllPosts(): Promise<UnifiedPost[]> {
  const [mdEntries, dbPosts] = await Promise.all([
    getCollection('blog'),
    db.select().from(postsTable).where(eq(postsTable.published, true)).orderBy(desc(postsTable.pubDate)),
  ]);

  const md: UnifiedPost[] = mdEntries.map((e) => ({
    slug: e.slug,
    title: e.data.title,
    description: e.data.description,
    pubDate: e.data.pubDate,
    updatedDate: e.data.updatedDate,
    heroImage: e.data.heroImage?.src,
    source: 'markdown',
    body: e.body,
    render: () => e.render(),
  }));

  const dbUnified: UnifiedPost[] = dbPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    pubDate: p.pubDate,
    updatedDate: p.updatedDate,
    source: 'db',
    body: p.body,
  }));

  return [...md, ...dbUnified].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
}

export async function getPostBySlug(slug: string): Promise<UnifiedPost | null> {
  // .md wins on collision
  const mdEntry = (await getCollection('blog')).find((e) => e.slug === slug);
  if (mdEntry) return { /* ...map to UnifiedPost... */ };

  const [dbPost] = await db.select().from(postsTable)
    .where(and(eq(postsTable.slug, slug), eq(postsTable.published, true)))
    .limit(1);
  if (!dbPost) return null;
  return { /* ...map to UnifiedPost... */ };
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  // Check both .md collection and DB
}
```

**Rendering markdown from DB (`src/pages/blog/[slug].astro`):**
- `.md` source → call `post.render()` → get `<Content />` component (built-in Astro pipeline, includes existing remark/rehype plugins)
- DB source → parse raw markdown with `marked` server-side → sanitize with `isomorphic-dompurify` → `<Fragment set:html={html} />`

**Blog list (`src/pages/blog/index.astro`):**
- `const posts = await getAllPosts()`
- Loop render cards (conditional heroImage — DB posts don't have)
- Cache header: `Astro.response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')`

**Blog detail (`src/pages/blog/[slug].astro`):**
- `const post = await getPostBySlug(Astro.params.slug)` → null → `return Astro.rewrite('/404')`
- Cache header: `max-age=60, s-maxage=60`
- Layout `BlogPost.astro` — pass unified props, make `heroImage` optional

**Slug collision:**
- `.md` wins in lookup
- Form-side: `slugExists(slug, excludeId)` blocks collision with existing `.md` or DB slug

**RSS (`src/pages/rss.xml.ts`):**
- Replace `getCollection('blog')` with `getAllPosts()`

**Deps:**
- `marked` + `@types/marked` (markdown → HTML)
- `isomorphic-dompurify` (sanitize)
- `postgres` (Drizzle driver)

---

## Section 5 — Admin UI + API + Deploy

### Admin pages

**`/admin/login`** (public, skip middleware):
- Password field + submit → `POST /api/auth/login`
- Show error banner if `?error=1`

**`/admin`** (dashboard):
- Frontmatter: `const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt))`
- Table: title, slug, published badge, pubDate, actions (Edit / Delete / Toggle publish)
- "New Post" link → `/admin/new`
- "Logout" button → `POST /api/auth/logout`
- Note: dashboard shows DB posts only (`.md` posts managed via git, out of admin UI scope)

**`/admin/new` & `/admin/edit/[id]`**:
- Form fields: `title`, `slug` (auto-suggest from title, editable), `description`, `body` (EasyMDE), `published` (checkbox)
- EasyMDE from CDN:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
  <script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
  <script>
    new EasyMDE({ element: document.getElementById('body'), spellChecker: false, autosave: { enabled: true, uniqueId: 'post-draft' } });
  </script>
  ```
- Submit → `POST /api/posts` (new) or `PATCH /api/posts/[id]` (edit)
- Progressive enhancement — no JS → plain textarea still works
- Client validation: required fields, slug regex `^[a-z0-9-]+$`

### API routes (`src/pages/api/`)

- `POST /api/auth/login` — body `{ password }`, set cookie, 303 → `/admin`
- `POST /api/auth/logout` — clear cookie, 303 → `/admin/login`
- `POST /api/posts` — validate with Zod, check slug collision, insert, 303 → `/admin`
- `PATCH /api/posts/[id]` — validate, check collision (excluding self), update, 303 → `/admin`
- `DELETE /api/posts/[id]` — delete, 303 → `/admin`

All handlers:
- Try/catch, log error, return 500 JSON on non-redirect failure
- Zod schema in `src/lib/validators.ts` (`postSchema`)
- Use `slugExists(slug, excludeId?)` before insert/update

### Config

**`astro.config.mjs`:**
```js
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'static',                     // per-page opt-in prerender=false
  adapter: netlify(),
  // ... existing
});
```

**`netlify.toml`** (already set `NODE_VERSION = "22"`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

### Package additions

- `@astrojs/netlify`
- `drizzle-orm`, `postgres`
- `drizzle-kit` (dev)
- `@paralleldrive/cuid2`
- `bcryptjs`, `@types/bcryptjs` (dev)
- `marked`, `@types/marked` (dev)
- `isomorphic-dompurify`
- `zod`

### Netlify env vars

- `DATABASE_URL` — Postgres direct connection
- `ADMIN_PASSWORD_HASH` — output of `scripts/hash-password.mjs`
- `SESSION_SECRET` — `openssl rand -base64 32`

### Migration workflow

- Local: `npx drizzle-kit generate` → review `drizzle/*.sql` → commit
- Deploy: manual `npx drizzle-kit migrate` when schema changes (2-3x/year, no automation needed)

### DB provisioning steps

1. Create Prisma Postgres via console.prisma.io
2. Get direct `postgres://` connection string (not `prisma+postgres://`)
3. If Accelerate-only → fallback: Neon / Supabase / Netlify DB
4. Set `DATABASE_URL` in Netlify UI + local `.env.local`

---

## Testing Gate (before shipping)

1. Local `npm run dev` → login → create post → publish → verify in `/blog` + `/blog/[slug]`
2. Local: create draft (`published=false`) → verify not in public
3. Local: edit post → verify `updatedDate` changes
4. Local: delete post → verify removed from dashboard + public
5. Local: logout → try `/admin` → verify redirect to login
6. Deploy Netlify preview branch → repeat 1-5
7. Verify old `.md` posts still render normally in `/blog` + `/blog/[slug]`

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Prisma Postgres direct URL unavailable | Fallback to Neon/Supabase/Netlify DB (spec covers this) |
| Cold start latency on Netlify Functions | Cache headers on `/blog` (60s CDN cache) absorb repeat traffic |
| DB connection exhaustion (serverless) | `postgres-js` with `max: 1` per function invocation |
| XSS from markdown body | `isomorphic-dompurify` sanitizes DB-rendered HTML |
| Session token leak | HttpOnly + Secure + SameSite=Lax, DB-backed revoke on logout |
| Slug collision between `.md` and DB | Enforced in `slugExists()` at form validation |
| Lost admin password | Regenerate hash via script, update env var, redeploy |

## Out of Scope (future)

- Image upload for DB posts (add later if needed)
- Draft preview URL (drafts currently only visible in dashboard)
- Post scheduling (`pubDate` in future)
- Full-text search
- Comments
- Analytics
- Migrating old `.md` posts to DB
