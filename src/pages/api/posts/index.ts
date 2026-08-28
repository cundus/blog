import type { APIRoute } from 'astro';
import { db } from '../../../db/client';
import { posts } from '../../../db/schema';
import { postSchema } from '../../../lib/validators';
import { slugExists } from '../../../lib/posts';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const form = await request.formData();
    const parsed = postSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (await slugExists(parsed.data.slug)) {
      return new Response(JSON.stringify({ error: 'slug already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.insert(posts).values({
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      body: parsed.data.body,
      published: parsed.data.published ?? false,
    });

    return redirect('/admin', 303);
  } catch (err) {
    console.error('POST /api/posts error', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
