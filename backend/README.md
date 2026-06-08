# Backend

Laravel API for the Ecommerce project.

For full project setup, demo accounts, feature scope, and local run instructions, see the root [README](../README.md).

## Backend Setup

```bash
composer install
cp .env.example .env
./vendor/bin/sail up -d
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate --seed
./vendor/bin/sail artisan storage:link
```

Default local database setup uses the PostgreSQL Sail container:

```env
FRONTEND_URL=http://localhost:3000
DB_CONNECTION=pgsql
DB_HOST=pgsql
DB_PORT=5432
DB_DATABASE=laravel
DB_USERNAME=sail
DB_PASSWORD=password
```

If you switch between multiple local clones of this project, stop the previous Sail stack before starting the next one:

```bash
./vendor/bin/sail down
./vendor/bin/sail up -d
```

## Useful Commands

Run backend tests:

```bash
./vendor/bin/sail artisan test
```

Run one test file or filter:

```bash
./vendor/bin/sail artisan test --filter=CheckoutApiTest
```

## Notes

- Auth uses Laravel Sanctum session cookies.
- Public catalog reads stay open.
- Admin write routes require `auth:sanctum` plus admin role middleware.
- This branch/version does not include a real payment gateway yet.
