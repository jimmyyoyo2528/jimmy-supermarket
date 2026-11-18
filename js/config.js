import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://easmruesazdgbaorqaok.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iK4_1nnvAzDBrW_o7MtAoQ_8FWlq_iN';

export const configured =
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const money = n =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(Number(n) || 0);

export function toast(text) {
  let e = document.querySelector('.toast');

  if (!e) {
    e = document.createElement('div');
    e.className = 'toast';
    document.body.appendChild(e);
  }

  e.textContent = text;
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 2200);
}

export function bottomNav(active) {
  return `
    <nav class="bottom-nav">
      <a class="nav-item ${active === 'pos' ? 'active' : ''}" href="pos.html">
        <span class="nav-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5"/>
            <path d="M5 9.5V21h14V9.5"/>
            <path d="M9 21v-7h6v7"/>
          </svg>
        </span>
        <span class="nav-label">ขาย</span>
      </a>

      <a class="nav-item ${active === 'stock' ? 'active' : ''}" href="products.html">
        <span class="nav-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 7 8-4 8 4-8 4-8-4Z"/>
            <path d="m4 7 8 4 8-4"/>
            <path d="M4 7v10l8 4 8-4V7"/>
            <path d="M12 11v10"/>
          </svg>
        </span>
        <span class="nav-label">สต๊อก</span>
      </a>

      <a class="nav-item ${active === 'reports' ? 'active' : ''}" href="reports.html">
        <span class="nav-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20V10"/>
            <path d="M10 20V4"/>
            <path d="M16 20v-7"/>
            <path d="M22 20H2"/>
          </svg>
        </span>
        <span class="nav-label">รายงาน</span>
      </a>

      <a class="nav-item ${active === 'settings' ? 'active' : ''}" href="settings.html">
        <span class="nav-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.07V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.93 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>
          </svg>
        </span>
        <span class="nav-label">ตั้งค่า</span>
      </a>
    </nav>
  `;
}

export function ensureConfigured() {
  if (!configured) {
    alert('กรุณาใส่ SUPABASE_URL และ Publishable/Anon key ใน js/config.js');
    location.href = 'settings.html';
    return false;
  }

  return true;
}
