import { supabase, money, renderBottomNav, toast, escapeHtml, safeImageUrl } from './config.js';
import { requireAuth } from './auth.js';

await requireAuth();
renderBottomNav('stock');

const search = document.querySelector('#search');
const productList = document.querySelector('#productList');
let products = [];

async function load() {
  productList.innerHTML = '<div class="empty">กำลังโหลดสินค้า...</div>';
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) {
    productList.innerHTML = '<div class="empty">โหลดสินค้าไม่สำเร็จ</div>';
    return toast(error.message);
  }
  products = data || [];
  render();
}

function render(query = '') {
  const normalized = query.toLocaleLowerCase('th');
  const rows = products.filter(product =>
    String(product.name || '').toLocaleLowerCase('th').includes(normalized)
    || String(product.barcode || '').includes(normalized)
  );
  productList.innerHTML = rows.map(product => {
    const image = safeImageUrl(product.image_url);
    const visual = image
      ? `<img class="thumb" src="${escapeHtml(image)}" alt="">`
      : `<span class="thumb" aria-hidden="true">${escapeHtml(product.icon || '📦')}</span>`;
    const stock = Number(product.stock) || 0;
    const state = stock === 0 ? 'out' : stock <= Number(product.min_stock || 0) ? 'low' : 'ok';
    return `<a class="list-row" href="product-form.html?id=${encodeURIComponent(product.id)}">${visual}<span class="grow"><b>${escapeHtml(product.name)}</b><span class="muted">${money(product.price)} • คงเหลือ ${stock} ชิ้น</span></span><i class="stock-dot ${state}" aria-label="สถานะสต๊อก"></i></a>`;
  }).join('') || '<div class="empty">ไม่พบสินค้า</div>';
}

search.addEventListener('input', event => render(event.target.value.trim()));
await load();
