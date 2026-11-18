import { supabase, money, renderBottomNav, toast, escapeHtml, safeImageUrl } from './config.js';
import { requireAuth } from './auth.js';
import { openScanner, closeScanner } from './scanner.js';

await requireAuth();
renderBottomNav('pos');
const $ = selector => document.querySelector(selector);
let products = [];
let cart = [];
let settings = null;

const totalAmount = () => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

async function load() {
  $('#productGrid').innerHTML = '<div class="empty">กำลังโหลดสินค้า...</div>';
  const [productResult, settingResult] = await Promise.all([
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
  ]);
  if (productResult.error) {
    $('#productGrid').innerHTML = '<div class="empty">โหลดสินค้าไม่สำเร็จ</div>';
    return toast(productResult.error.message);
  }
  if (settingResult.error) toast(settingResult.error.message);
  products = productResult.data || [];
  settings = settingResult.data || null;
  renderProducts();
  renderCart();
}

function productVisual(product, className = '') {
  const image = safeImageUrl(product.image_url);
  return image
    ? `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}">`
    : `<span class="${className || 'emoji-img'}" aria-hidden="true">${escapeHtml(product.icon || '📦')}</span>`;
}

function renderProducts(query = '') {
  const normalized = query.toLocaleLowerCase('th');
  const filtered = products.filter(product =>
    Number(product.stock) > 0
    && (String(product.name || '').toLocaleLowerCase('th').includes(normalized)
      || String(product.barcode || '').includes(normalized))
  );
  $('#productGrid').innerHTML = filtered.map(product => `
    <button class="product-card" type="button" data-id="${escapeHtml(product.id)}">
      ${productVisual(product)}<b>${escapeHtml(product.name)}</b><small>${money(product.price)}</small>
    </button>`).join('') || '<div class="empty">ไม่พบสินค้า</div>';
  $('#productGrid').querySelectorAll('[data-id]').forEach(button => {
    button.addEventListener('click', () => add(button.dataset.id));
  });
}

function add(id) {
  const product = products.find(item => item.id === id);
  const row = cart.find(item => item.id === id);
  if (!product || Number(product.stock) < 1) return toast('สินค้าหมด');
  if (row) {
    if (row.qty >= Number(product.stock)) return toast('จำนวนเกินสต๊อก');
    row.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  $('#cartList').innerHTML = cart.map(item => `
    <div class="list-row">
      ${productVisual(item, 'thumb')}
      <div class="grow"><b>${escapeHtml(item.name)}</b><span class="muted">${money(item.price)} / ชิ้น</span>
        <div class="qty"><button type="button" data-action="minus" data-id="${escapeHtml(item.id)}" aria-label="ลดจำนวน">−</button><b>${item.qty}</b><button type="button" data-action="plus" data-id="${escapeHtml(item.id)}" aria-label="เพิ่มจำนวน">+</button></div>
      </div>
      <b>${money(Number(item.price) * item.qty)}</b>
    </div>`).join('') || '<div class="empty">ยังไม่มีสินค้าในตะกร้า</div>';

  $('#pieceCount').textContent = String(cart.reduce((sum, item) => sum + item.qty, 0));
  $('#total').textContent = money(totalAmount());
  $('#cartList').querySelectorAll('button[data-id]').forEach(button => {
    button.addEventListener('click', () => changeQuantity(button.dataset.id, button.dataset.action));
  });
}

function changeQuantity(id, action) {
  const row = cart.find(item => item.id === id);
  const product = products.find(item => item.id === id);
  if (!row || !product) return;
  row.qty += action === 'plus' ? 1 : -1;
  if (row.qty > Number(product.stock)) {
    row.qty = Number(product.stock);
    toast('จำนวนเกินสต๊อก');
  }
  if (row.qty <= 0) cart = cart.filter(item => item.id !== id);
  renderCart();
}

$('#search').addEventListener('input', event => renderProducts(event.target.value.trim()));
$('#manualForm').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#manualCode');
  const product = products.find(item => String(item.barcode) === input.value.trim());
  if (product) {
    add(product.id);
    input.value = '';
  } else {
    toast('ไม่พบบาร์โค้ดนี้');
  }
});
$('#scanBtn').addEventListener('click', () => openScanner(code => {
  const product = products.find(item => String(item.barcode) === String(code).trim());
  product ? add(product.id) : toast('ไม่พบสินค้า');
}));
$('#closeScanner').addEventListener('click', closeScanner);

function renderCashOptions() {
  const total = totalAmount();
  const standard = [10, 20, 50, 100, 500, 1000];
  const options = [...new Set([total, ...standard.filter(amount => amount > total)])]
    .filter(amount => amount > 0).sort((a, b) => a - b);
  $('#cashShortcuts').innerHTML = options.map(amount => `<button type="button" class="btn btn-secondary cash-option" data-cash="${amount}">${amount === total ? `${money(amount)} พอดี` : money(amount)}</button>`).join('');
  $('#cashShortcuts').querySelectorAll('[data-cash]').forEach(button => {
    button.addEventListener('click', () => {
      $('#received').value = button.dataset.cash;
      $('#cashShortcuts').querySelectorAll('.cash-option').forEach(option => option.classList.remove('active'));
      button.classList.add('active');
      updatePayment();
    });
  });
}

function updatePayment() {
  const total = totalAmount();
  const received = Number($('#received').value || 0);
  $('#payTotal').textContent = money(total);
  $('#change').textContent = received >= total ? money(received - total) : `ขาด ${money(total - received)}`;
  $('#change').classList.toggle('money-negative', received < total);
}

function paymentView() {
  const transfer = $('input[name="pay"]:checked').value === 'transfer';
  $('#cashPanel').hidden = transfer;
  $('#qrPanel').hidden = !transfer;
  $('#confirmPay').textContent = transfer ? 'ยืนยันว่ารับเงินแล้ว' : 'ยืนยันการชำระเงิน';
  if (!transfer) {
    $('#received').value = totalAmount();
    renderCashOptions();
  } else {
    const qrUrl = safeImageUrl(settings?.payment_qr_url);
    if (qrUrl) {
      const image = new Image();
      image.src = qrUrl;
      image.alt = 'QR รับเงิน';
      $('#paymentQr').replaceChildren(image);
    } else {
      $('#paymentQr').textContent = 'ยังไม่ได้ตั้งค่า QR';
    }
    $('#qrAccount').textContent = settings?.payment_account_name || '';
    $('#qrBank').textContent = settings?.payment_bank_name || '';
  }
  updatePayment();
}

function closePayment() {
  $('#paymentModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

$('#checkout').addEventListener('click', () => {
  if (!cart.length) return toast('กรุณาเพิ่มสินค้า');
  $('#paymentModal').classList.add('show');
  document.body.classList.add('modal-open');
  paymentView();
});
$('#closePayment').addEventListener('click', closePayment);
$('#received').addEventListener('input', () => {
  $('#cashShortcuts').querySelectorAll('.cash-option').forEach(option => option.classList.remove('active'));
  updatePayment();
});
document.querySelectorAll('input[name="pay"]').forEach(radio => radio.addEventListener('change', paymentView));

$('#confirmPay').addEventListener('click', async () => {
  const method = $('input[name="pay"]:checked').value;
  const total = totalAmount();
  const received = Number($('#received').value || 0);
  if (method === 'cash' && received < total) return toast(`รับเงินไม่พอ ขาด ${money(total - received)}`);
  if (method === 'transfer' && !safeImageUrl(settings?.payment_qr_url)) return toast('กรุณาตั้งค่า QR รับเงินก่อน');

  const button = $('#confirmPay');
  button.disabled = true;
  const { data, error } = await supabase.rpc('sale_checkout', {
    p_items: cart.map(item => ({ product_id: item.id, quantity: item.qty })),
    p_payment_method: method,
    p_received: method === 'cash' ? received : total
  });
  if (error) {
    button.disabled = false;
    return toast(error.message);
  }
  cart = [];
  toast(`ชำระสำเร็จ ${data?.sale_no || ''}`);
  setTimeout(() => location.href = 'sales.html', 750);
});

$('#paymentModal').addEventListener('click', event => { if (event.target.id === 'paymentModal') closePayment(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closePayment();
    closeScanner();
  }
});

await load();
