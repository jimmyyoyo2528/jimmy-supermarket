import { toast } from './config.js';

let scanner = null;
let loading = null;
let scanning = false;
let lastCode = '';
let lastScanAt = 0;


/* =========================
   LOAD HTML5-QRCODE
========================= */

function loadLibrary() {
  if (window.Html5Qrcode) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.src =
      'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

    script.onload = resolve;

    script.onerror = () =>
      reject(new Error('โหลดตัวสแกนไม่สำเร็จ'));

    document.head.appendChild(script);
  });

  return loading;
}


/* =========================
   CREATE SCANNER AREA
========================= */

function ensureReaderHost() {
  const box =
    document.querySelector('#scannerModal .scanner-box');

  const oldVideo =
    document.querySelector('#scannerVideo');

  if (!box) {
    throw new Error('ไม่พบ scanner-box');
  }

  oldVideo?.classList.add('hidden');

  let host =
    document.querySelector('#html5QrReader');

  if (!host) {
    host = document.createElement('div');
    host.id = 'html5QrReader';

    Object.assign(host.style, {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: '18px',
      background: '#000'
    });

    box.prepend(host);
  }

  host.innerHTML = '';

  return host;
}


/* =========================
   BARCODE SCAN AREA
========================= */

function scanBox(viewfinderWidth, viewfinderHeight) {
  const width = Math.floor(viewfinderWidth * 0.92);

  const height = Math.min(
    Math.floor(viewfinderHeight * 0.36),
    Math.floor(width * 0.48)
  );

  return {
    width,
    height
  };
}


/* =========================
   OPEN SCANNER
========================= */

export async function openScanner(onCode) {
  const modal =
    document.querySelector('#scannerModal');

  if (!modal) {
    toast('ไม่พบหน้าต่างสแกน');
    return;
  }

  /*
   * กันเปิดกล้องซ้อน
   */
  if (scanner) {
    try {
      await closeScanner();
    } catch (_) {}
  }

  modal.classList.add('show');

  lastCode = '';
  lastScanAt = 0;

  try {

    await loadLibrary();

    ensureReaderHost();

    const H =
      window.Html5QrcodeSupportedFormats;


    /* =========================
       CREATE SCANNER
    ========================= */

    scanner = new window.Html5Qrcode(
      'html5QrReader',
      {
        /*
         * Format ที่ใช้จริงกับ POS
         * ลดจำนวน Decoder เพื่อให้จับเร็วขึ้น
         */
        formatsToSupport: [
          H.EAN_13,
          H.EAN_8,
          H.UPC_A,
          H.UPC_E,
          H.CODE_128,
          H.QR_CODE
        ],

        useBarCodeDetectorIfSupported: true,

        verbose: false
      }
    );


    scanning = true;


    /* =========================
       START CAMERA
    ========================= */

    await scanner.start(

      /*
       * ใช้กล้องหลัง
       */
      {
        facingMode: {
          ideal: 'environment'
        }
      },


      /*
       * SCANNER CONFIG
       */
      {
        /*
         * เพิ่ม FPS
         * ช่วยตอนขยับสินค้าเข้าหากล้อง
         */
        fps: 20,

        /*
         * กรอบแบบกว้าง เหมาะกับ Barcode
         */
        qrbox: scanBox,

        /*
         * กล้องมือถือทั่วไป
         */
        aspectRatio: 4 / 3,

        /*
         * กล้องหลังไม่ต้องกลับภาพ
         */
        disableFlip: true
      },


      /* =========================
         SCAN SUCCESS
      ========================= */

      async (decodedText) => {

        const code =
          String(decodedText || '').trim();

        if (!code || !scanning) {
          return;
        }


        /*
         * กันยิง Barcode เดิมซ้ำ
         */
        const now = Date.now();

        if (
          code === lastCode &&
          now - lastScanAt < 1500
        ) {
          return;
        }

        lastCode = code;
        lastScanAt = now;


        /*
         * Lock scanner ทันที
         */
        scanning = false;


        /*
         * สั่นเมื่ออ่านสำเร็จ
         */
        try {
          navigator.vibrate?.(80);
        } catch (_) {}


        /*
         * ส่ง Barcode กลับไปหน้า POS
         */
        try {
          await onCode?.(code);
        } catch (err) {
          console.error(
            'Scanner callback error:',
            err
          );
        }


        /*
         * ปิดกล้อง
         */
        await closeScanner();


        toast(
          'สแกนสำเร็จ: ' + code
        );
      },


      /* =========================
         SCAN FAILED FRAME
      ========================= */

      () => {
        /*
         * ปล่อยว่างไว้
         *
         * ห้าม console.log ตรงนี้
         * เพราะ Scanner เรียกหลายครั้ง/วินาที
         */
      }
    );


    /* =========================
       VIDEO STYLE
    ========================= */

    requestAnimationFrame(() => {

      const video =
        document.querySelector(
          '#html5QrReader video'
        );

      if (!video) return;

      Object.assign(video.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      });

    });


  } catch (err) {

    console.error(
      'Scanner error:',
      err
    );

    await closeScanner();

    toast(
      'เปิดกล้องไม่ได้ กรุณาอนุญาต Camera'
    );
  }
}


/* =========================
   CLOSE SCANNER
========================= */

export async function closeScanner() {

  scanning = false;


  if (scanner) {

    try {

      const state =
        scanner.getState?.();

      /*
       * 2 = scanning
       * 3 = paused
       */
      if (
        state === 2 ||
        state === 3
      ) {
        await scanner.stop();
      }

    } catch (err) {

      console.warn(
        'scanner.stop:',
        err
      );

    }


    try {
      scanner.clear();
    } catch (_) {}


    scanner = null;
  }


  /*
   * Clear scanner HTML
   */
  const host =
    document.querySelector(
      '#html5QrReader'
    );

  if (host) {
    host.innerHTML = '';
  }


  /*
   * Restore old video
   */
  document
    .querySelector('#scannerVideo')
    ?.classList
    .remove('hidden');


  /*
   * Close modal
   */
  document
    .querySelector('#scannerModal')
    ?.classList
    .remove('show');
}