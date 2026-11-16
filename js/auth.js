import {toast} from './config.js';
export function requireAuth(){if(!localStorage.getItem('shop_user')) location.href='login.html'}
export function login(email,password){if(!email||!password){toast('กรุณากรอกอีเมลและรหัสผ่าน');return false}localStorage.setItem('shop_user',JSON.stringify({email,name:'BAY-Auto Shop'}));location.href='pos.html';return true}
export function logout(){localStorage.removeItem('shop_user');location.href='login.html'}
