import { toast } from './config.js';

let scanner = null;
let loading = null;
let scanning = false;

function loadLibrary() {
  if (window.Html5Qrcode) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('โหลดตัวสแกนไม่สำเร็จ'));
    document.head.appendChild(script);
  });

  return loading;
}

function ensureReaderHost() {
  const box = document.querySelector('#scannerModal .scanner-box');
  const oldVideo = document.querySelector('#scannerVideo');

  if (!box) throw new Error('ไม่พบ scanner-box');

  oldVideo?.classList.add('hidden');

  let host = document.querySelector('#html5QrReader');
  if (!host) {
    host = document.createElement('div');
    host.id = 'html5QrReader';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.overflow = 'hidden';
    host.style.borderRadius = '18px';
    box.prepend(host);
  }

  host.innerHTML = '';
  return host;
}

export async function openScanner(onCode) {
  const modal = document.querySelector('#scannerModal');
  if (!modal) return toast('ไม่พบหน้าต่างสแกน');

  // รองรับ CSS ทั้งแบบ .modal.show และ .modal.open
  modal.classList.add('show', 'open');

  try {
    await loadLibrary();
    ensureReaderHost();

    const H = window.Html5QrcodeSupportedFormats;

    scanner = new window.Html5Qrcode('html5QrReader', {
      formatsToSupport: [
        H.QR_CODE,
        H.EAN_13,
        H.EAN_8,
        H.UPC_A,
        H.UPC_E,
        H.CODE_128,
        H.CODE_39,
        H.CODE_93,
        H.ITF,
        H.CODABAR
      ],
      useBarCodeDetectorIfSupported: true,
      verbose: false
    });

    scanning = true;

    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 20,
        qrbox: (w, h) => ({
          width: Math.floor(w * 0.92),
          height: Math.min(Math.floor(h * 0.36), Math.floor(w * 0.45))
        }),
        aspectRatio: 4 / 3,
        disableFlip: true
      },
      async (decodedText) => {
        const code = String(decodedText || '').trim();
        if (!code || !scanning) return;

        scanning = false;

        try {
          navigator.vibrate?.(80);
        } catch (_) {}

        try {
          await onCode?.(code);
        } catch (err) {
          console.error('Scanner callback error:', err);
        }

        await closeScanner();
        toast('สแกนสำเร็จ: ' + code);
      },
      () => {}
    );
  } catch (err) {
    console.error('Scanner error:', err);
    await closeScanner();
    toast('เปิดกล้องไม่ได้ กรุณาอนุญาต Camera ให้เบราว์เซอร์');
  }
}

export async function closeScanner() {
  scanning = false;

  if (scanner) {
    try {
      const state = scanner.getState?.();
      if (state === 2 || state === 3) await scanner.stop();
    } catch (_) {}

    try {
      scanner.clear();
    } catch (_) {}

    scanner = null;
  }

  const host = document.querySelector('#html5QrReader');
  if (host) host.innerHTML = '';

  document.querySelector('#scannerVideo')?.classList.remove('hidden');
  document.querySelector('#scannerModal')?.classList.remove('show', 'open');
}
