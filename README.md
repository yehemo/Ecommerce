# Ecommerce

First-version ecommerce platform built with Laravel and Next.js.

This version covers:
- storefront browsing, search, cart, checkout, and customer account pages
- admin catalog, orders, fulfillment, inventory, and dashboard reporting
- seeded demo data for products, categories, and accounts

This version does **not** include a real payment gateway yet.

## Stack

- Backend: Laravel 13, Sanctum, PHPUnit
- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Database: PostgreSQL through Laravel Sail
- Local backend runtime: Laravel Sail

## Project Structure

- `backend/` Laravel API, auth, admin APIs, seeders, tests
- `frontend/` Next.js storefront and admin UI
## Current Features

### Storefront

- category and product browsing
- product detail pages
- header search
- cart management
- checkout and order creation
- customer order history
- customer account page with profile, password, and saved addresses

### Admin

- product CRUD with variants and images
- category CRUD
- order management
- shipment and fulfillment tracking
- inventory management with stock adjustments and movement history
- business reporting on the admin dashboard

## First-Time Setup

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate --seed
./vendor/bin/sail artisan storage:link
```

Notes:
- `backend/.env.example` uses `APP_URL=http://localhost`
- `FRONTEND_URL=http://localhost:3000` is included for local CORS setup
- the backend runs against the `pgsql` Sail service by default
- the default backend database config is:
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=pgsql`
  - `DB_PORT=5432`
  - `DB_DATABASE=laravel`
  - `DB_USERNAME=sail`
  - `DB_PASSWORD=password`
- if you switch between multiple local clones of the same project, stop the previous Sail stack first:
  ```bash
  ./vendor/bin/sail down
  ./vendor/bin/sail up -d
  ```
- keep the backend reachable at the same host you use from the frontend

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Default frontend env:

```env
NEXT_PUBLIC_API_URL=http://localhost
```

## Run The App

Backend API:

```bash
cd backend
./vendor/bin/sail up -d
```

Frontend app:

```bash
cd frontend
npm run dev
```

Main local URLs:
- Store: `http://localhost:3000/store`
- Admin UI: `http://localhost:3000/admin`
- Backend API base: `http://localhost`

## Seeded Demo Accounts

After `migrate --seed`:

- Admin
  - email: `admin@example.com`
  - password: `password`
- Customer
  - email: `user@example.com`
  - password: `password`

## Useful Commands

Backend tests:

```bash
cd backend
./vendor/bin/sail artisan test
```

Targeted backend test:

```bash
./vendor/bin/sail artisan test --filter=AdminApiAuthorizationTest
```

Frontend production build check:

```bash
cd frontend
npm run build
```

## Important Notes

- Authentication uses Laravel Sanctum with session and CSRF cookies.
- Product and category reads are public, but admin writes require an authenticated admin account.
- Image upload exists for admin product management.
- The first release should be treated as **non-payment** for real-world deployment until a real gateway is integrated.

## Known First-Version Gaps

- no real payment gateway integration
- no coupon, tax, or advanced shipping fee logic
- no refund or return flow
- no email or push notification system
- deployment and operations setup still need separate production preparation
