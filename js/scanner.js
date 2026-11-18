import { toast } from './config.js';

let scanner = null;
let libraryPromise = null;
let scanning = false;

function loadLibrary() {
  if (window.Html5Qrcode) return Promise.resolve();
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('โหลดตัวสแกนไม่สำเร็จ'));
    document.head.appendChild(script);
  });
  return libraryPromise;
}

function ensureReaderHost() {
  const box = document.querySelector('#scannerModal .scanner-box');
  if (!box) throw new Error('ไม่พบพื้นที่แสดงกล้อง');
  document.querySelector('#scannerVideo')?.classList.add('hidden');
  let host = document.querySelector('#html5QrReader');
  if (!host) {
    host = document.createElement('div');
    host.id = 'html5QrReader';
    box.prepend(host);
  }
  host.replaceChildren();
  return host;
}

export async function openScanner(onCode) {
  const modal = document.querySelector('#scannerModal');
  if (!modal) return toast('ไม่พบหน้าต่างสแกน');
  if (scanning || scanner) await closeScanner();
  modal.classList.add('show', 'open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  try {
    await loadLibrary();
    ensureReaderHost();
    const formats = window.Html5QrcodeSupportedFormats;
    scanner = new window.Html5Qrcode('html5QrReader', {
      formatsToSupport: formats ? [formats.QR_CODE, formats.EAN_13, formats.EAN_8, formats.UPC_A, formats.UPC_E, formats.CODE_128, formats.CODE_39, formats.CODE_93, formats.ITF, formats.CODABAR] : undefined,
      useBarCodeDetectorIfSupported: true,
      verbose: false
    });
    scanning = true;
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 15, qrbox: (width, height) => ({ width: Math.floor(width * .9), height: Math.min(Math.floor(height * .34), Math.floor(width * .42)) }), aspectRatio: 4 / 3, disableFlip: true },
      async decodedText => {
        const code = String(decodedText || '').trim();
        if (!code || !scanning) return;
        scanning = false;
        try { navigator.vibrate?.(80); } catch {}
        await closeScanner();
        try { await onCode?.(code); } catch (error) { console.error('Scanner callback error:', error); }
        toast(`สแกนสำเร็จ: ${code}`);
      },
      () => {}
    );
  } catch (error) {
    console.error('Scanner error:', error);
    await closeScanner();
    if (error?.name === 'NotAllowedError') toast('กรุณาอนุญาต Camera ให้เบราว์เซอร์');
    else if (error?.name === 'NotFoundError') toast('ไม่พบกล้องบนอุปกรณ์');
    else toast(error?.message || 'เปิดกล้องไม่ได้');
  }
}

export async function closeScanner() {
  scanning = false;
  if (scanner) {
    try {
      const state = scanner.getState?.();
      if (state === 2 || state === 3) await scanner.stop();
    } catch {}
    try { scanner.clear(); } catch {}
    scanner = null;
  }
  document.querySelector('#html5QrReader')?.replaceChildren();
  document.querySelector('#scannerVideo')?.classList.remove('hidden');
  const modal = document.querySelector('#scannerModal');
  modal?.classList.remove('show', 'open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

window.addEventListener('pagehide', closeScanner);
document.addEventListener('visibilitychange', () => { if (document.hidden && scanning) closeScanner(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && scanner) closeScanner(); });
document.querySelector('#scannerModal')?.addEventListener('click', event => {
  if (event.target.id === 'scannerModal') closeScanner();
});
