import { supabase, money, renderBottomNav, toast } from './config.js';
import { requireAuth } from './auth.js';

await requireAuth();
renderBottomNav('reports');

const $ = selector => document.querySelector(selector);
const start = new Date();
start.setHours(0, 0, 0, 0);

const [{ data: sales, error: salesError }, { data: products, error: productsError }] = await Promise.all([
  supabase.from('sales').select('*,sale_items(*)').gte('created_at', start.toISOString()).order('created_at'),
  supabase.from('products').select('stock,min_stock')
]);

if (salesError || productsError) toast((salesError || productsError).message);
const dailySales = sales || [];
const productRows = products || [];
const revenue = dailySales.reduce((total, sale) => total + Number(sale.total || 0), 0);
const cost = dailySales.reduce((total, sale) => total + (sale.sale_items || []).reduce(
  (subtotal, item) => subtotal + Number(item.unit_cost || 0) * Number(item.quantity || 0), 0
), 0);

$('#revenue').textContent = money(revenue);
$('#bills').textContent = String(dailySales.length);
$('#profit').textContent = money(revenue - cost);
$('#low').textContent = String(productRows.filter(product => Number(product.stock) <= Number(product.min_stock)).length);

const buckets = Array(12).fill(0);
dailySales.forEach(sale => {
  const index = Math.min(11, Math.floor(new Date(sale.created_at).getHours() / 2));
  buckets[index] += Number(sale.total || 0);
});
const maximum = Math.max(...buckets, 1);
$('#chart').innerHTML = buckets.map((value, index) =>
  `<div class="bar" style="height:${Math.max(4, (value / maximum) * 100)}%" title="${index * 2}:00–${index * 2 + 2}:00 ${money(value)}"></div>`
).join('');
