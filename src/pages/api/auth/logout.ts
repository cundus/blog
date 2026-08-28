import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await deleteSession(cookies);
  return redirect('/admin/login', 303);
};
