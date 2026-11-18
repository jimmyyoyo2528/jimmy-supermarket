import { supabase, renderBottomNav, toast, escapeHtml, money, safeImageUrl } from './config.js';
import { requireAuth } from './auth.js';
import { openScanner, closeScanner } from './scanner.js';

await requireAuth();
renderBottomNav('stock');
const $ = selector => document.querySelector(selector);
let selectedProduct = null;

async function choose(codeValue) {
  const barcode = String(codeValue || '').trim();
  if (!barcode) return toast('กรุณากรอกบาร์โค้ด');
  const { data, error } = await supabase.from('products').select('*').eq('barcode', barcode).maybeSingle();
  if (error) return toast(error.message);
  if (!data) {
    location.href = `product-form.html?barcode=${encodeURIComponent(barcode)}`;
    return;
  }
  selectedProduct = data;
  const image = safeImageUrl(data.image_url);
  const visual = image ? `<img class="thumb" src="${escapeHtml(image)}" alt="">` : `<span class="thumb" aria-hidden="true">${escapeHtml(data.icon || '📦')}</span>`;
  $('#selected').innerHTML = `<div class="list-row">${visual}<div class="grow"><b>${escapeHtml(data.name)}</b><span class="muted">${escapeHtml(data.barcode)} • ต้นทุน ${money(data.cost)}</span></div><b>${Number(data.stock) || 0} ชิ้น</b></div>`;
  $('#cost').value = Number(data.cost) || '';
  $('#stockForm').hidden = false;
  $('#qty').focus();
}

$('#scanBtn').addEventListener('click', () => openScanner(choose));
$('#closeScanner').addEventListener('click', closeScanner);
$('#codeForm').addEventListener('submit', event => {
  event.preventDefault();
  choose($('#code').value);
});
$('#stockForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!selectedProduct) return toast('กรุณาเลือกสินค้าก่อน');
  const quantity = Number($('#qty').value);
  if (!Number.isInteger(quantity) || quantity <= 0) return toast('จำนวนรับเข้าต้องเป็นจำนวนเต็มมากกว่า 0');
  const button = event.submitter;
  button.disabled = true;
  const { error } = await supabase.rpc('stock_receive', {
    p_product_id: selectedProduct.id,
    p_quantity: quantity,
    p_cost: $('#cost').value === '' ? null : Number($('#cost').value),
    p_note: $('#note').value.trim()
  });
  button.disabled = false;
  if (error) return toast(error.message);
  toast('เพิ่มสต๊อกสำเร็จ');
  setTimeout(() => location.href = 'products.html', 650);
});
