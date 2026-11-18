import { configured, supabase } from './config.js';

export async function requireAuth() {
  if (!configured) {
    location.replace('login.html?error=config');
    throw new Error('Supabase is not configured');
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) {
    const next = encodeURIComponent(location.pathname.split('/').pop() || 'pos.html');
    location.replace(`login.html?next=${next}`);
    throw new Error('Unauthorized');
  }
  return session.user;
}

export async function login(email, password) {
  if (!configured) throw new Error('กรุณาตั้งค่า Supabase ใน js/config.js ก่อน');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const requested = new URLSearchParams(location.search).get('next');
  const safeNext = requested && /^[a-z0-9-]+\.html$/i.test(requested) ? requested : 'pos.html';
  location.replace(safeNext);
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  location.replace('login.html');
}
