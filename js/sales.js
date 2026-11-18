import { supabase, money, renderBottomNav, toast, escapeHtml } from './config.js';
import { requireAuth } from './auth.js';

await requireAuth();
renderBottomNav('reports');

const list = document.querySelector('#salesList');
list.innerHTML = '<div class="empty">กำลังโหลดประวัติการขาย...</div>';
const { data, error } = await supabase
  .from('sales')
  .select('*,sale_items(id)')
  .order('created_at', { ascending: false })
  .limit(100);

if (error) {
  list.innerHTML = '<div class="empty">โหลดประวัติการขายไม่สำเร็จ</div>';
  toast(error.message);
} else {
  list.innerHTML = (data || []).map(sale => {
    const date = new Date(sale.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    const count = Array.isArray(sale.sale_items) ? sale.sale_items.length : 0;
    return `<div class="list-row"><div class="grow"><b class="receipt-no">${escapeHtml(sale.sale_no)}</b><span class="muted">${escapeHtml(date)} • ${count} รายการ</span></div><b>${money(sale.total)}</b></div>`;
  }).join('') || '<div class="empty card">ยังไม่มีประวัติการขาย</div>';
}
