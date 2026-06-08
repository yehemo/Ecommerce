# Ecommerce

First-version ecommerce platform built with Laravel and Next.js.

This version covers:
- storefront browsing, search, cart, checkout, and customer account pages
- admin catalog, orders, fulfillment, inventory, and dashboard reporting
- seeded demo data for products, categories, and accounts

This version does **not** include a production-ready payment gateway yet.

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
- local bootstrap currently expects PHP 8.4 on the host machine for the first `composer install`
- reason: `composer.json` allows `^8.3`, but the current `composer.lock` was resolved with some PHP 8.4-only Symfony packages
- if your machine is on PHP 8.3 and `composer install` fails, use one of these options:
  - upgrade local PHP to 8.4, then run `composer install`
  - or regenerate the lock on a PHP 8.3-compatible environment before sharing it with other machines:
    ```bash
    cd backend
    composer update
    ```
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

Optional PayWay sandbox setup for QR payment branches:
- create a sandbox account at `https://developer.payway.com.kh/`
- after registration, ABA sends sandbox credentials by email
- the minimum values this project uses are:
  - `PAYWAY_MERCHANT_ID`
  - `PAYWAY_PUBLIC_KEY`
- put those values in `backend/.env`
- example:
  ```env
  PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh
  PAYWAY_MERCHANT_ID=your-merchant-id
  PAYWAY_PUBLIC_KEY=your-public-key
  PAYWAY_CALLBACK_URL=
  PAYWAY_PAYMENT_OPTION=abapay_khqr
  PAYWAY_QR_IMAGE_TEMPLATE=template3_color
  PAYWAY_TIMEOUT=15
  ```
- if you want PayWay callback testing, set `PAYWAY_CALLBACK_URL` to a public `https://...` URL such as an ngrok tunnel
- ABA confirmed the real ABA app cannot be used to complete sandbox QR payments; for full sandbox payment simulation you need their simulator app
- to request the simulator app, email `DigitalSupport@ababank.com` with:
  ```text
  Dear Digital Support Team,

  Thank you for your reply.

  I would like to request the simulator app for testing ABA
  PayWay sandbox transactions.

  First name:
  Last name:
  Phone number:
  Email:

  Please let me know the next steps for installation and
  testing.

  Thank you.

  Best regards,
  You Name
  ```
- wait for ABA to reply with the simulator download link and the simulator-account registration steps before trying payer-side QR testing

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
- PayWay QR setup depends on sandbox credentials from ABA and is only relevant on branches that include the PayWay integration.
- The backend dependency lock is currently safest on PHP 8.4 hosts; if the team wants PHP 8.3 installs to work consistently, the backend lock file needs to be regenerated on a PHP 8.3-compatible environment.

## Known First-Version Gaps

- no production-ready payment gateway integration
- no coupon, tax, or advanced shipping fee logic
- no refund or return flow
- no email or push notification system
- deployment and operations setup still need separate production preparation
