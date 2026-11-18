import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://easmruesazdgbaorqaok.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iK4_1nnvAzDBrW_o7MtAoQ_8FWlq_iN';
export const configured = /^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL)
  && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const money = value => new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 2
}).format(Number(value) || 0);

export const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

export function safeImageUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value), location.href);
    return ['http:', 'https:', 'blob:', 'data:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

let toastTimer;
export function toast(text) {
  let element = document.querySelector('.toast');
  if (!element) {
    element = document.createElement('div');
    element.className = 'toast';
    element.setAttribute('aria-live', 'polite');
    document.body.appendChild(element);
  }
  clearTimeout(toastTimer);
  element.textContent = String(text || 'เกิดข้อผิดพลาด');
  element.classList.add('show');
  toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
}

export function bottomNav(active) {
  const items = [
    ['pos', 'pos.html', 'ขาย', '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>'],
    ['stock', 'products.html', 'สต๊อก', '<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 8 4 8-4"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>'],
    ['reports', 'reports.html', 'รายงาน', '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'],
    ['settings', 'settings.html', 'ตั้งค่า', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.93V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.07V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.93 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>']
  ];
  return `<nav class="bottom-nav" aria-label="เมนูหลัก">${items.map(([key, href, label, paths]) => `
    <a class="nav-item ${active === key ? 'active' : ''}" href="${href}" ${active === key ? 'aria-current="page"' : ''}>
      <span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg></span>
      <span class="nav-label">${label}</span>
    </a>`).join('')}</nav>`;
}

export function renderBottomNav(active) {
  const host = document.querySelector('#nav');
  if (host) host.innerHTML = bottomNav(active);
}

export function ensureConfigured() {
  if (configured) return true;
  toast('กรุณาตั้งค่า Supabase URL และ Publishable key ใน js/config.js');
  return false;
}
