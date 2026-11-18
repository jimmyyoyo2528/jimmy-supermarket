import { configured } from './config.js';
import { login } from './auth.js';

const $ = selector => document.querySelector(selector);
const form = $('#loginForm');
const email = $('#email');
const password = $('#password');
const togglePassword = $('#togglePassword');
const loginButton = $('#loginButton');
const loginButtonText = $('#loginButtonText');
const loginButtonIcon = $('#loginButtonIcon');
const loginSpinner = $('#loginSpinner');
const loginMessage = $('#loginMessage');

if (!configured || new URLSearchParams(location.search).get('error') === 'config') {
  showMessage('กรุณาตั้งค่า Supabase URL และ Publishable key ใน js/config.js', 'error');
  loginButton.disabled = true;
}

togglePassword.addEventListener('click', () => {
  const hidden = password.type === 'password';
  password.type = hidden ? 'text' : 'password';
  togglePassword.textContent = hidden ? '🙈' : '👁';
  togglePassword.setAttribute('aria-label', hidden ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  if (!emailValue || !passwordValue) return showMessage('กรุณากรอกอีเมลและรหัสผ่าน', 'error');

  setLoading(true);
  showMessage('');
  try {
    await login(emailValue, passwordValue);
  } catch (error) {
    showMessage(getLoginErrorMessage(error), 'error');
  } finally {
    setLoading(false);
  }
});

$('#forgotPassword').addEventListener('click', () => {
  showMessage('กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน', 'info');
});

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginSpinner.classList.toggle('show', isLoading);
  loginButtonIcon.hidden = isLoading;
  loginButtonText.textContent = isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ';
}

function showMessage(text, type = '') {
  loginMessage.textContent = text;
  loginMessage.className = `login-message${type ? ` ${type}` : ''}`;
}

function getLoginErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (message.includes('email not confirmed')) return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
  if (message.includes('failed to fetch')) return 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต';
  return error?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
}
