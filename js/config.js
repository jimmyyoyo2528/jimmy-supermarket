import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const SUPABASE_URL='https://mboghhwvlgegsibsclwl.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_wLuPZ9ygGxNs8LuWg9zhlg_bAE8wNud';
export const configured=!SUPABASE_URL.includes('YOUR_PROJECT')&&!SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
export const money=n=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',minimumFractionDigits:0}).format(Number(n)||0);
export function toast(text){let e=document.querySelector('.toast');if(!e){e=document.createElement('div');e.className='toast';document.body.appendChild(e)}e.textContent=text;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
export function bottomNav(active){return `<nav class="bottom-nav"><a class="nav-item ${active==='pos'?'active':''}" href="pos.html"><span>⌂</span>ขาย</a><a class="nav-item ${active==='stock'?'active':''}" href="products.html"><span>▣</span>สต๊อก</a><a class="nav-item ${active==='reports'?'active':''}" href="reports.html"><span>▥</span>รายงาน</a><a class="nav-item ${active==='settings'?'active':''}" href="settings.html"><span>⚙</span>ตั้งค่า</a></nav>`}
export function ensureConfigured(){if(!configured){alert('กรุณาใส่ SUPABASE_URL และ Publishable/Anon key ใน js/config.js');location.href='settings.html';return false}return true}
