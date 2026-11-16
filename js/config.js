export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
export const DEMO_MODE = SUPABASE_URL.includes('YOUR_PROJECT');
export const DB = {
  get(key, fallback = []) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  seed() {
    if (!localStorage.getItem('products')) this.set('products', [
      {id:'p1',barcode:'8851234567890',name:'น้ำดื่ม ตราคริสตัล',category:'เครื่องดื่ม',price:10,cost:8,stock:24,min:5,icon:'💧',active:true},
      {id:'p2',barcode:'8850987100012',name:'มาม่า รสหมูสับ',category:'อาหาร',price:6,cost:4.5,stock:50,min:10,icon:'🍜',active:true},
      {id:'p3',barcode:'8850718801234',name:'เลย์ รสซอลท์',category:'ขนม',price:20,cost:12,stock:5,min:5,icon:'🥔',active:true},
      {id:'p4',barcode:'8851959132018',name:'โค้ก 325ml',category:'เครื่องดื่ม',price:15,cost:10,stock:0,min:5,icon:'🥤',active:true},
      {id:'p5',barcode:'8850001234567',name:'นมสด โฟร์โมสต์',category:'เครื่องดื่ม',price:25,cost:19,stock:12,min:5,icon:'🥛',active:true},
      {id:'p6',barcode:'8850123456789',name:'ขนมปังฟาร์มเฮ้าส์',category:'เบเกอรี่',price:18,cost:13,stock:8,min:5,icon:'🍞',active:true}
    ]);
  }
};
DB.seed();
export const money = n => new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',minimumFractionDigits:0}).format(Number(n)||0);
export function toast(text){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
export function bottomNav(active){return `<nav class="bottom-nav"><a class="nav-item ${active==='pos'?'active':''}" href="pos.html"><span>⌂</span>ขาย</a><a class="nav-item ${active==='stock'?'active':''}" href="products.html"><span>▣</span>สต๊อก</a><a class="nav-item ${active==='reports'?'active':''}" href="reports.html"><span>▥</span>รายงาน</a><a class="nav-item ${active==='settings'?'active':''}" href="settings.html"><span>⚙</span>ตั้งค่า</a></nav>`}
