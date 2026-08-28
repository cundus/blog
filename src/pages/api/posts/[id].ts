import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { posts } from '../../../db/schema';
import { postUpdateSchema } from '../../../lib/validators';
import { slugExists } from '../../../lib/posts';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id;
  if (!id) return new Response('missing id', { status: 400 });
  try {
    const form = await request.formData();
    const parsed = postUpdateSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (parsed.data.slug && (await slugExists(parsed.data.slug, id))) {
      return new Response(JSON.stringify({ error: 'slug already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db
      .update(posts)
      .set({
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        ...(parsed.data.published !== undefined ? { published: parsed.data.published } : {}),
      })
      .where(eq(posts.id, id));

    return redirect('/admin', 303);
  } catch (err) {
    console.error('PATCH /api/posts/[id] error', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response('missing id', { status: 400 });
  try {
    await db.delete(posts).where(eq(posts.id, id));
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/posts/[id] error', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
