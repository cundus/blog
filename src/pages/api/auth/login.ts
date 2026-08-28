import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { createSession } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  try {
    const form = await request.formData();
    const password = String(form.get('password') ?? '');

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
      console.error('ADMIN_PASSWORD_HASH env var missing');
      return redirect('/admin/login?error=1', 303);
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 500));
      return redirect('/admin/login?error=1', 303);
    }

    await createSession(cookies);
    return redirect('/admin', 303);
  } catch (err) {
    console.error('login error', err);
    return redirect('/admin/login?error=1', 303);
  }
};
