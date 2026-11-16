import{configured,supabase,toast}from'./config.js';
export async function requireAuth(){if(!configured){location.href='settings.html';throw new Error('Supabase not configured')}const{data:{session}}=await supabase.auth.getSession();if(!session){location.href='login.html';throw new Error('Unauthorized')}return session.user}
export async function login(email,password){if(!configured)return toast('ตั้งค่า Supabase ใน js/config.js ก่อน');const{error}=await supabase.auth.signInWithPassword({email,password});if(error)return toast(error.message);location.href='pos.html'}
export async function logout(){await supabase.auth.signOut();location.href='login.html'}
