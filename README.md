# Ecommerce

Ecommerce platform built with Laravel and Next.js for storefront, admin, checkout, inventory, and PayWay KHQR sandbox payment flow.

## Primary Testing

This project should be tested primarily in the local environment.

Why local is the primary test target:
- Laravel Sanctum session and CSRF auth are configured and verified mainly for local development
- checkout, account, admin, and payment flows are expected to work most reliably through the local Sail + Next.js setup
- seeded demo accounts and the database workflow are designed around local `migrate --seed`

Use the hosted deployment as a visual demo only:
- Frontend demo: `https://ecommerce-two-hazel-vqx631jz4e.vercel.app`
- Backend demo: `https://ecommerce-production-9b3f.up.railway.app`

Important:
- the hosted deployment is not the primary QA environment
- login, register, and other authenticated flows may not work perfectly there
- production hosting should be treated as view-only unless the auth/domain setup is finished properly

## Project Status

Current state of the project:
- storefront browsing, cart, checkout, account, and order history are implemented
- admin product, category, order, shipment, inventory, and reporting flows are implemented
- PayWay KHQR sandbox QR flow is implemented
- recent UI fixes improved behavior on small and medium screen sizes
- local setup is the source of truth for feature validation

## Stack

- Backend: Laravel 13, Sanctum, PHPUnit
- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Database: PostgreSQL
- Local backend runtime: Laravel Sail
- Payment sandbox: ABA PayWay KHQR

## Project Structure

- `backend/` Laravel API, auth, admin APIs, seeders, tests, Sail runtime config
- `frontend/` Next.js storefront and admin UI

## Features

### Storefront

- category and product browsing
- product detail pages
- search
- cart management
- checkout and order creation
- customer order history
- customer account page with profile, password, and saved addresses
- QR payment flow for PayWay sandbox orders

### Admin

- product CRUD with variants and images
- category CRUD
- order management
- shipment and fulfillment tracking
- inventory management with stock adjustments and movement history
- business reporting dashboard

### Payment

- PayWay KHQR sandbox QR generation
- QR display on checkout and customer orders pages
- backend payment-status reconciliation
- larger QR rendering for easier scanning

## Local Setup

### Backend

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
- `composer.json` allows `^8.3`, but the current `composer.lock` was resolved with PHP 8.4-only Symfony packages
- if local PHP 8.3 fails on `composer install`, either:
  - upgrade local PHP to 8.4 first
  - or regenerate the backend lock file from a PHP 8.3-compatible environment:
    ```bash
    cd backend
    composer update
    ```
- default backend local env values are based on Sail:
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=pgsql`
  - `DB_PORT=5432`
  - `DB_DATABASE=laravel`
  - `DB_USERNAME=sail`
  - `DB_PASSWORD=password`
- `backend/.env.example` uses `APP_URL=http://localhost`
- `FRONTEND_URL=http://localhost:3000` is included for local CORS setup

If you switch between multiple local clones, stop the previous stack first:

```bash
cd backend
./vendor/bin/sail down
./vendor/bin/sail up -d
```

### Frontend

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

## Local Run

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

Primary local URLs:
- Store: `http://localhost:3000/store`
- Admin UI: `http://localhost:3000/admin`
- Backend API base: `http://localhost`

## Seeded Demo Accounts

After local `migrate --seed`:

- Admin
  - email: `admin@example.com`
  - password: `password`
- Customer
  - email: `user@example.com`
  - password: `password`

## PayWay Sandbox Setup

Optional local PayWay sandbox setup:

1. Create a sandbox account at `https://developer.payway.com.kh/`
2. Wait for ABA to send sandbox credentials by email
3. Put these values in `backend/.env`

Minimum env values used by this project:

```env
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh
PAYWAY_MERCHANT_ID=your-merchant-id
PAYWAY_PUBLIC_KEY=your-public-key
PAYWAY_PAYMENT_OPTION=abapay_khqr
PAYWAY_QR_IMAGE_TEMPLATE=template3_color
PAYWAY_TIMEOUT=15
```

Current sandbox flow:
- backend generates QR through PayWay
- frontend displays the QR
- frontend and backend reconcile payment status through provider status checks
- callback support exists in the backend, but it is not required for the current default flow

For payer-side sandbox testing:
- the real ABA app cannot be used for sandbox QR payments
- request the ABA simulator app from `DigitalSupport@ababank.com`

Suggested request template:

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
Your Name
```

## Useful Commands

Backend tests:

```bash
cd backend
./vendor/bin/sail artisan test
```

Targeted backend test:

```bash
cd backend
./vendor/bin/sail artisan test --filter=AdminApiAuthorizationTest
```

Frontend production build check:

```bash
cd frontend
npm run build
```

## Hosting Note

The hosted deployment is for presentation only, not primary validation.

Use the hosted links to:
- view the UI
- share the project visually
- inspect general navigation and layout

Do not treat the hosted deployment as the primary place to validate:
- login and register
- Sanctum cookie auth
- admin session workflows
- full end-to-end QA

The local environment remains the primary test environment for this project.

## Known Gaps

- hosted auth flow is not treated as fully reliable
- no production-ready live payment deployment
- no coupon, tax, or advanced shipping fee logic
- no refund or return flow
- no email or push notification system
- production deployment and operations still need separate hardening if this project is ever taken beyond demo use
