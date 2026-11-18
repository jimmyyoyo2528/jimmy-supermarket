import { renderBottomNav, supabase, toast } from './config.js';
import { logout, requireAuth } from './auth.js';

const user = await requireAuth();
renderBottomNav('settings');
const $ = selector => document.querySelector(selector);
$('#userEmail').textContent = user.email || '';

$('#logout').addEventListener('click', async () => {
  try { await logout(); } catch (error) { toast(error.message); }
});

let selectedFile = null;
let currentUrl = null;
let temporaryPreviewUrl = null;

function preview(source) {
  const host = $('#qrPreview');
  if (!source) {
    host.textContent = 'ยังไม่มี QR รับเงิน';
    return;
  }
  const image = new Image();
  image.src = source;
  image.alt = 'QR รับเงิน';
  host.replaceChildren(image);
}

const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
if (error) toast(error.message);
if (data) {
  currentUrl = data.payment_qr_url;
  $('#accountName').value = data.payment_account_name || '';
  $('#bankName').value = data.payment_bank_name || '';
  preview(currentUrl);
}

$('#qrInput').addEventListener('change', event => {
  selectedFile = event.target.files?.[0] || null;
  if (!selectedFile) return;
  if (!selectedFile.type.startsWith('image/')) return toast('กรุณาเลือกรูปภาพ');
  if (selectedFile.size > 6 * 1024 * 1024) return toast('รูปต้องไม่เกิน 6 MB');
  if (temporaryPreviewUrl) URL.revokeObjectURL(temporaryPreviewUrl);
  temporaryPreviewUrl = URL.createObjectURL(selectedFile);
  preview(temporaryPreviewUrl);
});

async function upload() {
  if (!selectedFile) return currentUrl;
  const extension = (selectedFile.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const path = `qr/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('payment-qr').upload(path, selectedFile, { contentType: selectedFile.type });
  if (uploadError) throw uploadError;
  return supabase.storage.from('payment-qr').getPublicUrl(path).data.publicUrl;
}

$('#saveQr').addEventListener('click', async () => {
  const button = $('#saveQr');
  button.disabled = true;
  try {
    currentUrl = await upload();
    if (!currentUrl) throw new Error('กรุณาเลือกรูป QR');
    const { error: saveError } = await supabase.from('app_settings').upsert({
      id: 1,
      payment_qr_url: currentUrl,
      payment_account_name: $('#accountName').value.trim(),
      payment_bank_name: $('#bankName').value.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString()
    });
    if (saveError) throw saveError;
    selectedFile = null;
    if (temporaryPreviewUrl) URL.revokeObjectURL(temporaryPreviewUrl);
    temporaryPreviewUrl = null;
    preview(currentUrl);
    toast('บันทึก QR สำเร็จ');
  } catch (saveError) {
    toast(saveError.message);
  } finally {
    button.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  if (temporaryPreviewUrl) URL.revokeObjectURL(temporaryPreviewUrl);
});
