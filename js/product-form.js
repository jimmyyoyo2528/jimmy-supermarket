import { supabase, toast, renderBottomNav } from './config.js';
import { requireAuth } from './auth.js';

await requireAuth();
renderBottomNav('stock');

const $ = id => document.getElementById(id);
const elements = {
  form: $('form'), title: $('title'), icon: $('icon'), name: $('name'), barcode: $('barcode'),
  category: $('category'), price: $('price'), cost: $('cost'), stock: $('stock'), min: $('min'),
  photoInput: $('photoInput'), photoGrid: $('photoGrid'), photoButton: $('photoButton'),
  saveButton: $('saveButton'), scanButton: $('scanBarcodeButton'), scannerModal: $('scannerModal'),
  scannerVideo: $('scannerVideo'), closeScanner: $('closeScanner')
};

const params = new URLSearchParams(location.search);
const productId = params.get('id');
let product = null;
let currentImages = [];
let selectedPhotos = [];
let previewUrls = [];
let scannerStream = null;
let scannerRunning = false;
let detector = null;
let scanTimer = null;

function renderPhotos() {
  previewUrls.forEach(URL.revokeObjectURL);
  previewUrls = [];
  elements.photoGrid.replaceChildren();
  const items = [
    ...currentImages.map((url, index) => ({ type: 'existing', url, index })),
    ...selectedPhotos.map((file, index) => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      return { type: 'new', url, index };
    })
  ];

  if (!items.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'photo-placeholder';
    placeholder.textContent = '📦';
    elements.photoGrid.appendChild(placeholder);
  }

  items.forEach(item => {
    const box = document.createElement('div');
    box.className = 'photo-tile';
    const image = new Image();
    image.src = item.url;
    image.alt = 'รูปสินค้า';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'photo-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'ลบรูป');
    remove.addEventListener('click', () => {
      if (item.type === 'existing') currentImages.splice(item.index, 1);
      else selectedPhotos.splice(item.index, 1);
      renderPhotos();
    });
    box.append(image, remove);
    elements.photoGrid.appendChild(box);
  });
  elements.photoButton.hidden = currentImages.length + selectedPhotos.length >= 3;
}

function fillForm(data) {
  product = data;
  elements.title.textContent = 'แก้ไขสินค้า';
  elements.icon.value = data.icon || '📦';
  elements.name.value = data.name ?? '';
  elements.barcode.value = data.barcode ?? '';
  elements.category.value = data.category ?? '';
  elements.price.value = data.price ?? 0;
  elements.cost.value = data.cost ?? 0;
  elements.stock.value = data.stock ?? 0;
  elements.min.value = data.min_stock ?? 5;
  currentImages = Array.isArray(data.image_urls) && data.image_urls.length
    ? data.image_urls.slice(0, 3)
    : data.image_url ? [data.image_url] : [];
  renderPhotos();
}

async function loadProduct() {
  if (!productId) {
    elements.barcode.value = params.get('barcode') || '';
    renderPhotos();
    return;
  }
  setSaving(true, 'กำลังโหลด...');
  const { data, error } = await supabase.from('products')
    .select('id,barcode,name,category,icon,image_url,image_urls,cost,price,stock,min_stock,active')
    .eq('id', productId).maybeSingle();
  setSaving(false);
  if (error) return toast(`โหลดสินค้าไม่สำเร็จ: ${error.message}`);
  if (!data) return toast('ไม่พบข้อมูลสินค้า');
  fillForm(data);
}

async function makeBarcodeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  const supported = await BarcodeDetector.getSupportedFormats();
  const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code', 'data_matrix', 'pdf417']
    .filter(format => supported.includes(format));
  return new BarcodeDetector(formats.length ? { formats } : undefined);
}

async function readBarcodeFromFile(file) {
  try {
    const fileDetector = await makeBarcodeDetector();
    if (fileDetector) {
      const source = await createImageBitmap(file);
      try {
        const codes = await fileDetector.detect(source);
        if (codes.length) return String(codes[0].rawValue || '').trim() || null;
      } finally {
        source.close?.();
      }
    }
  } catch (error) {
    console.warn('Native image barcode:', error);
  }

  try {
    if (!window.ZXingBrowser) return null;
    const reader = new ZXingBrowser.BrowserMultiFormatReader();
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const result = await reader.decodeFromImageElement(image);
      return result?.getText?.() || result?.text || null;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn('ZXing image barcode:', error);
    return null;
  }
}

async function autoFillBarcodeFromFiles(files) {
  if (elements.barcode.value.trim()) return;
  for (const file of files) {
    const value = await readBarcodeFromFile(file);
    if (value) {
      elements.barcode.value = value;
      toast(`อ่านบาร์โค้ดจากรูปแล้ว: ${value}`);
      return;
    }
  }
}

elements.photoInput.addEventListener('change', async event => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const remaining = 3 - currentImages.length - selectedPhotos.length;
  if (remaining <= 0) return toast('เลือกรูปได้สูงสุด 3 รูป');

  const accepted = [];
  for (const file of files.slice(0, remaining)) {
    if (!file.type.startsWith('image/')) { toast('กรุณาเลือกเฉพาะไฟล์รูปภาพ'); continue; }
    if (file.size > 6 * 1024 * 1024) { toast('แต่ละรูปต้องไม่เกิน 6 MB'); continue; }
    selectedPhotos.push(file);
    accepted.push(file);
  }
  if (files.length > remaining) toast('เลือกรูปได้สูงสุด 3 รูป');
  elements.photoInput.value = '';
  renderPhotos();
  if (accepted.length) await autoFillBarcodeFromFiles(accepted);
});

async function uploadPhotos() {
  const uploaded = [];
  for (const file of selectedPhotos) {
    const extension = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const path = `products/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    uploaded.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
  }
  return [...currentImages, ...uploaded].slice(0, 3);
}

async function startScanner() {
  if (!navigator.mediaDevices?.getUserMedia) return toast('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    elements.scannerVideo.srcObject = scannerStream;
    await elements.scannerVideo.play();
    elements.scannerModal.classList.add('open');
    elements.scannerModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    scannerRunning = true;

    detector = await makeBarcodeDetector();
    if (detector) return scanLoop();
    if (!window.ZXingBrowser) throw new Error('ไม่พบตัวอ่านบาร์โค้ด');
    const reader = new ZXingBrowser.BrowserMultiFormatReader();
    window.__barcodeScannerControls = await reader.decodeFromVideoElement(elements.scannerVideo, result => {
      const value = String(result?.getText?.() || result?.text || '').trim();
      if (value) acceptBarcode(value);
    });
  } catch (error) {
    stopScanner();
    if (error?.name === 'NotAllowedError') toast('กรุณาอนุญาต Camera ในเบราว์เซอร์');
    else if (error?.name === 'NotFoundError') toast('ไม่พบกล้องบนอุปกรณ์');
    else toast(`เปิดเครื่องสแกนไม่สำเร็จ: ${error?.message || 'Unknown error'}`);
  }
}

async function scanLoop() {
  if (!scannerRunning || !detector) return;
  try {
    if (elements.scannerVideo.readyState >= 2) {
      const codes = await detector.detect(elements.scannerVideo);
      const value = String(codes[0]?.rawValue || '').trim();
      if (value) return acceptBarcode(value);
    }
  } catch (error) {
    console.warn('Barcode scan:', error);
  }
  scanTimer = setTimeout(scanLoop, 180);
}

function acceptBarcode(value) {
  elements.barcode.value = value;
  stopScanner();
  toast(`อ่านบาร์โค้ดแล้ว: ${value}`);
  elements.barcode.focus();
}

function stopScanner() {
  scannerRunning = false;
  try { window.__barcodeScannerControls?.stop?.(); } catch {}
  window.__barcodeScannerControls = null;
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = null;
  scannerStream?.getTracks().forEach(track => track.stop());
  scannerStream = null;
  elements.scannerVideo.srcObject = null;
  elements.scannerModal.classList.remove('open');
  elements.scannerModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

elements.scanButton.addEventListener('click', startScanner);
elements.closeScanner.addEventListener('click', stopScanner);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && scannerRunning) stopScanner(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopScanner(); });
window.addEventListener('pagehide', stopScanner);
window.addEventListener('beforeunload', () => previewUrls.forEach(URL.revokeObjectURL));

function setSaving(saving, label = 'กำลังบันทึก...') {
  elements.saveButton.disabled = saving;
  elements.saveButton.textContent = saving ? label : 'บันทึก';
}

elements.form.addEventListener('submit', async event => {
  event.preventDefault();
  setSaving(true);
  try {
    const imageUrls = await uploadPhotos();
    const payload = {
      icon: String(elements.icon.value || '📦'), image_urls: imageUrls, image_url: imageUrls[0] || null,
      name: elements.name.value.trim(), barcode: elements.barcode.value.trim(), category: elements.category.value.trim(),
      price: Number(elements.price.value || 0), cost: Number(elements.cost.value || 0),
      stock: Number(elements.stock.value || 0), min_stock: Number(elements.min.value || 0), active: true
    };
    if (!payload.name) throw new Error('กรุณากรอกชื่อสินค้า');
    if (!payload.barcode) throw new Error('กรุณากรอกบาร์โค้ด');
    if (payload.price < 0 || payload.cost < 0 || payload.stock < 0 || payload.min_stock < 0) throw new Error('ตัวเลขต้องไม่ติดลบ');

    const result = product?.id
      ? await supabase.from('products').update(payload).eq('id', product.id).select().single()
      : await supabase.from('products').insert(payload).select().single();
    if (result.error) throw result.error;
    toast(product ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ');
    setTimeout(() => location.href = 'products.html', 700);
  } catch (error) {
    const message = String(error?.message || 'บันทึกไม่สำเร็จ');
    toast(message.includes('products_barcode_key') ? 'บาร์โค้ดนี้มีสินค้าอยู่แล้ว' : message);
    setSaving(false);
  }
});

await loadProduct();
