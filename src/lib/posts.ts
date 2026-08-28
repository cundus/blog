import { getCollection, type CollectionEntry } from 'astro:content';
import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '../db/client';
import { posts, type Post } from '../db/schema';

export type UnifiedPost = {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  // ImageMetadata from astro:assets — kept loose to avoid image() narrowing pain.
  heroImage?: unknown;
  source: 'markdown' | 'db';
  body: string;
  entry?: CollectionEntry<'blog'>;
};

function fromMarkdown(entry: CollectionEntry<'blog'>): UnifiedPost {
  return {
    slug: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    pubDate: entry.data.pubDate,
    updatedDate: entry.data.updatedDate,
    heroImage: entry.data.heroImage,
    source: 'markdown',
    body: entry.body ?? '',
    entry,
  };
}

function fromDbRow(row: Post): UnifiedPost {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    pubDate: row.pubDate,
    updatedDate: row.updatedDate ?? undefined,
    heroImage: undefined,
    source: 'db',
    body: row.body,
  };
}

export async function getAllPosts(): Promise<UnifiedPost[]> {
  const [mdEntries, dbRows] = await Promise.all([
    getCollection('blog'),
    db
      .select()
      .from(posts)
      .where(eq(posts.published, true))
      .orderBy(desc(posts.pubDate)),
  ]);

  const merged: UnifiedPost[] = [
    ...mdEntries.map(fromMarkdown),
    ...dbRows.map(fromDbRow),
  ];

  return merged.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
}

export async function getPostBySlug(slug: string): Promise<UnifiedPost | null> {
  // Try markdown first — legacy wins on collision.
  const mdEntries = await getCollection('blog', (e) => e.id === slug);
  if (mdEntries.length > 0) return fromMarkdown(mdEntries[0]);

  const rows = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.published, true)))
    .limit(1);
  if (rows[0]) return fromDbRow(rows[0]);

  return null;
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const mdEntries = await getCollection('blog', (e) => e.id === slug);
  if (mdEntries.length > 0) return true;

  const whereClause = excludeId
    ? and(eq(posts.slug, slug), ne(posts.id, excludeId))
    : eq(posts.slug, slug);
  const rows = await db.select({ id: posts.id }).from(posts).where(whereClause).limit(1);

  return rows.length > 0;
}
