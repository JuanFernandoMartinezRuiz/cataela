# Cataela Velas Artesanales

Web dinamica hecha con React + Vite + Tailwind para el emprendimiento Cataela, conectada a Supabase para autenticacion, base de datos y almacenamiento de imagenes.

## Stack

- React + Vite
- Tailwind CSS
- React Router DOM
- Recharts
- Supabase Auth
- Supabase Database
- Supabase Storage

## Rutas

- `/` pagina publica
- `/catalogo` catalogo publico
- `/producto/:slug` detalle publico
- `/admin/login` login admin
- `/admin` dashboard admin
- `/admin/productos` lista de productos
- `/admin/productos/nuevo` crear producto
- `/admin/productos/:id` editar producto
- `/admin/esencias` gestion de aromas disponibles
- `/admin/pedidos` calendario y gestion de pedidos
- `/admin/finanzas` gestion financiera
- `/admin/rifas` gestion de rifas

## Variables de entorno

1. Copia `.env.example` a `.env`.
2. Completa:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
RESEND_API_KEY=tu-resend-api-key
ORDER_REMINDER_EMAILS=admin1@tu-dominio.com,admin2@tu-dominio.com
CRON_SECRET=tu-cron-secret
```

El cliente de Supabase esta en `src/lib/supabaseClient.js` y nunca quema credenciales reales en el codigo.
Para el cron de recordatorios en Vercel, usa `SUPABASE_SERVICE_ROLE_KEY` para leer y marcar pedidos sin depender de RLS del frontend.

## Instalacion

```bash
npm install
npm run dev
```

Para compilar:

```bash
npm run build
```

## Configuracion de Supabase

### 1. Crear tablas

Ejecuta el SQL de [supabase/schema.sql](/e:/Cataela/supabase/schema.sql) en el SQL Editor de Supabase.

Ese archivo crea:

- `categories`
- `products`
- `product_images`
- `raffles`
- `raffle_numbers`
- `raffle_images`
- `essences`
- `orders`
- `order_items`
- `finance_transactions`
- `finance_payments`
- `finance_transaction_items`
- `finance_categories`

Para el ajuste visual de la foto principal del catalogo, `products` tambien debe tener:

- `image_position_x numeric not null default 50`
- `image_position_y numeric not null default 50`
- `image_zoom numeric not null default 1`

Si tu tabla `products` ya existia antes, ejecuta tambien estos `alter table`:

```sql
alter table public.products add column if not exists image_position_x numeric not null default 50;
alter table public.products add column if not exists image_position_y numeric not null default 50;
alter table public.products add column if not exists image_zoom numeric not null default 1;
```

Para vincular ingresos con productos del catalogo, `finance_transactions` tambien debe tener:

- `product_id uuid references public.products(id) on delete set null`
- `quantity integer`
- `buyer_name text`
- `selected_scents text[] not null default '{}'::text[]`

Si tu tabla `finance_transactions` ya existia antes, ejecuta tambien:

```sql
alter table public.finance_transactions
  add column if not exists product_id uuid references public.products(id) on delete set null;

alter table public.finance_transactions
  add column if not exists quantity integer;

alter table public.finance_transactions
  add column if not exists buyer_name text;

alter table public.finance_transactions
  add column if not exists selected_scents text[] not null default '{}'::text[];
```

Para pedidos futuros, `orders` tambien debe tener:

- `payment_method text not null default 'Sin metodo'`
- `finance_transaction_id uuid references public.finance_transactions(id) on delete set null`
- `reminder_7_days_sent boolean not null default false`
- `reminder_1_day_sent boolean not null default false`
- `selected_scents text[] not null default '{}'::text[]`

Si tu tabla `orders` ya existia antes, ejecuta tambien:

```sql
alter table public.orders
  add column if not exists payment_method text not null default 'Sin metodo';

alter table public.orders
  add column if not exists finance_transaction_id uuid references public.finance_transactions(id) on delete set null;

alter table public.orders
  add column if not exists reminder_7_days_sent boolean not null default false;

alter table public.orders
  add column if not exists reminder_1_day_sent boolean not null default false;

alter table public.orders
  add column if not exists selected_scents text[] not null default '{}'::text[];
```

Para pagos multiples, crea tambien la tabla `finance_payments`:

```sql
create table if not exists public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  payment_method text not null,
  amount numeric not null default 0,
  payment_date date not null,
  note text,
  created_at timestamptz not null default now()
);
```

Para rifas conectadas con finanzas, `raffle_numbers` tambien debe tener:

- `payment_method text`
- `finance_transaction_id uuid references public.finance_transactions(id) on delete set null`

Si tu tabla `raffle_numbers` ya existia antes, ejecuta tambien:

```sql
alter table public.raffle_numbers
  add column if not exists payment_method text;

alter table public.raffle_numbers
  add column if not exists finance_transaction_id uuid references public.finance_transactions(id) on delete set null;
```

Para ventas con multiples productos, crea tambien la tabla `finance_transaction_items`:

```sql
create table if not exists public.finance_transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  subtotal numeric generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);
```

Para organizar entregas futuras, crea tambien las tablas `orders` y `order_items`:

```sql
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  delivery_date date not null,
  delivery_time time,
  delivery_address text,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric not null default 0,
  quantity integer not null default 1,
  subtotal numeric generated always as (unit_price * quantity) stored,
  custom_description text
);
```

Para gestionar aromas en todo el panel, crea tambien la tabla `essences`:

```sql
create table if not exists public.essences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_available boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
```

Tambien agrega:

- `uuid` por defecto con `gen_random_uuid()`
- slugs unicos para categorias y productos
- `on delete cascade` para imagenes y numeros de rifa

### 2. Crear bucket de Storage

Crea un bucket publico llamado `product-images`.

Ese bucket guarda:

- foto principal del producto
- imagenes adicionales del producto

Crea tambien un bucket publico llamado `raffles`.

Ese bucket guarda:

- foto principal del premio de la rifa
- imagenes adicionales del sorteo

### 3. Crear usuario admin

Desde Supabase Auth:

1. Ve a `Authentication > Users`
2. Crea manualmente el usuario admin
3. Usa ese correo y contrasena en `/admin/login`

### 4. Politicas sugeridas

Si vas a usar RLS, una configuracion minima comun es:

- lectura publica para `categories`, `products` activos, `product_images`, `raffles` activas y `raffle_numbers`
- escritura solo para usuarios autenticados

Puedes adaptar las politicas segun tus roles reales de administracion.

## Buckets y operaciones

- `src/services/productService.js`: CRUD de productos
- `src/services/imageService.js`: subidas y borrado de imagenes en Storage
- `src/services/raffleService.js`: CRUD de rifas y numeros
- `src/services/imageService.js`: tambien gestiona imagenes de rifas y sorteos
- `src/services/orderService.js`: CRUD de pedidos y calendario interno
- `src/services/essenceService.js`: CRUD de esencias y disponibilidad de aromas
- `src/services/financeService.js`: CRUD de ingresos, egresos y pendientes
- `src/services/authService.js`: login, sesion y logout
- `api/cron/order-reminders.js`: cron diario para recordatorios de pedidos con Resend

Hay comentarios puntuales en los servicios donde se conectan las operaciones reales a Supabase.

## Flujo de productos

1. El admin inicia sesion en `/admin/login`
2. Crea o edita productos en `/admin/productos`
3. El formulario guarda datos base en `products`
4. La foto principal y galeria se suben a `product-images`
5. Las URLs publicas se guardan en `products` y `product_images`
6. El catalogo publico las consume automaticamente desde Supabase

## Flujo de rifas

1. El admin crea una rifa en `/admin/rifas`
2. Se generan automaticamente los numeros `00` al `99`
3. El admin actualiza estado, comprador y telefono
4. La rifa activa aparece en la pagina publica

## Notas

- Si no configuras las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la app mostrara errores controlados al intentar usar los datos.
- Si vas a usar recordatorios por correo, configura tambien `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ORDER_REMINDER_EMAILS` y `CRON_SECRET` en Vercel.
- `vercel.json` ya incluye el cron diario `0 13 * * *` apuntando a `/api/cron/order-reminders`.
- El endpoint cron omite pedidos `delivered` y `cancelled`, y marca `reminder_7_days_sent` o `reminder_1_day_sent` solo despues de un envio exitoso.
- Si no existen categorias en la tabla `categories`, el formulario de productos no tendra opciones para seleccionar.
- Si quieres una separacion mas estricta de permisos admin/public, agrega politicas RLS por rol o por lista de usuarios administradores.
