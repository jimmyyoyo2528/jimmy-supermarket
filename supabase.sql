-- Small Shop POS: run this entire file in Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  category text default '',
  icon text default '📦',
  image_url text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 5 check (min_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_no text not null unique default ('S' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null check (payment_method in ('cash','transfer')),
  received numeric(12,2) not null default 0,
  change_amount numeric(12,2) not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  barcode text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type text not null check (movement_type in ('receive','sale','adjust','return')),
  quantity integer not null,
  balance_before integer not null,
  balance_after integer not null,
  reference_id uuid,
  note text default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists products_auth_all on public.products;
create policy products_auth_all on public.products for all to authenticated using (true) with check (true);
drop policy if exists sales_auth_select on public.sales;
create policy sales_auth_select on public.sales for select to authenticated using (true);
drop policy if exists items_auth_select on public.sale_items;
create policy items_auth_select on public.sale_items for select to authenticated using (true);
drop policy if exists movements_auth_select on public.stock_movements;
create policy movements_auth_select on public.stock_movements for select to authenticated using (true);

grant select,insert,update,delete on public.products to authenticated;
grant select on public.sales, public.sale_items, public.stock_movements to authenticated;

create or replace function public.stock_receive(p_product_id uuid,p_quantity integer,p_cost numeric default null,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.products; b integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  select * into p from products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  b:=p.stock;
  update products set stock=stock+p_quantity,cost=coalesce(p_cost,cost),updated_at=now() where id=p_product_id returning * into p;
  insert into stock_movements(product_id,movement_type,quantity,balance_before,balance_after,note)
  values(p.id,'receive',p_quantity,b,p.stock,coalesce(p_note,''));
  return to_jsonb(p);
end$$;

grant execute on function public.stock_receive(uuid,integer,numeric,text) to authenticated;

create or replace function public.sale_checkout(p_items jsonb,p_payment_method text,p_received numeric default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare i jsonb; p public.products; s public.sales; qty integer; total_amount numeric:=0; computed_line numeric;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_payment_method not in ('cash','transfer') then raise exception 'Invalid payment method'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'Cart is empty'; end if;
  for i in select * from jsonb_array_elements(p_items) loop
    qty:=(i->>'quantity')::integer;
    if qty<=0 then raise exception 'Invalid quantity'; end if;
    select * into p from products where id=(i->>'product_id')::uuid for update;
    if not found then raise exception 'Product not found'; end if;
    if p.stock<qty then raise exception 'Insufficient stock: %',p.name; end if;
    total_amount:=total_amount+(p.price*qty);
  end loop;
  if p_payment_method='cash' and p_received<total_amount then raise exception 'Received amount is insufficient'; end if;
  insert into sales(total,payment_method,received,change_amount)
  values(total_amount,p_payment_method,p_received,greatest(0,p_received-total_amount)) returning * into s;
  for i in select * from jsonb_array_elements(p_items) loop
    qty:=(i->>'quantity')::integer;
    select * into p from products where id=(i->>'product_id')::uuid for update;
    computed_line:=p.price*qty;
    insert into sale_items(sale_id,product_id,product_name,barcode,quantity,unit_price,unit_cost,line_total)
    values(s.id,p.id,p.name,p.barcode,qty,p.price,p.cost,computed_line);
    update products set stock=stock-qty,updated_at=now() where id=p.id;
    insert into stock_movements(product_id,movement_type,quantity,balance_before,balance_after,reference_id,note)
    values(p.id,'sale',-qty,p.stock,p.stock-qty,s.id,s.sale_no);
  end loop;
  return jsonb_build_object('id',s.id,'sale_no',s.sale_no,'total',s.total,'change',s.change_amount);
end$$;
grant execute on function public.sale_checkout(jsonb,text,numeric) to authenticated;

insert into public.products(barcode,name,category,icon,cost,price,stock,min_stock)
values
('8851234567890','น้ำดื่ม ตราคริสตัล','เครื่องดื่ม','💧',8,10,24,5),
('8850987100012','มาม่า รสหมูสับ','อาหาร','🍜',4.5,6,50,10),
('8850718801234','เลย์ รสซอลท์','ขนม','🥔',12,20,5,5)
on conflict(barcode) do nothing;

-- QR payment settings (run this section once for an existing project)
create table if not exists public.app_settings (
 id integer primary key default 1 check(id=1), payment_qr_url text,
 payment_account_name text default '', payment_bank_name text default '',
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_authenticated_all on public.app_settings;
create policy app_settings_authenticated_all on public.app_settings for all to authenticated using(true) with check(true);
grant select,insert,update on public.app_settings to authenticated;
insert into public.app_settings(id) values(1) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('payment-qr','payment-qr',true) on conflict(id) do update set public=true;
drop policy if exists authenticated_upload_payment_qr on storage.objects;
create policy authenticated_upload_payment_qr on storage.objects for insert to authenticated with check(bucket_id='payment-qr');
drop policy if exists authenticated_update_payment_qr on storage.objects;
create policy authenticated_update_payment_qr on storage.objects for update to authenticated using(bucket_id='payment-qr') with check(bucket_id='payment-qr');
drop policy if exists authenticated_delete_payment_qr on storage.objects;
create policy authenticated_delete_payment_qr on storage.objects for delete to authenticated using(bucket_id='payment-qr');
