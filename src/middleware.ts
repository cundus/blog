import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth';

const PUBLIC_PATHS = ['/admin/login', '/api/auth/login', '/api/auth/logout'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const needsAuth =
    (pathname.startsWith('/admin') || pathname.startsWith('/api/posts')) &&
    !PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!needsAuth) return next();

  const session = await getSession(context.cookies);
  if (session) {
    context.locals.session = session;
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return context.redirect('/admin/login', 303);
});
