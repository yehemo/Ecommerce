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

Important:
- the current `composer.lock` was resolved with some PHP 8.4-only packages, so the first `composer install` is safest on a PHP 8.4 host
- if a teammate is on PHP 8.3 and `composer install` fails, they need either:
  - local PHP 8.4 for the install step, or
  - a refreshed lock file generated from a PHP 8.3-compatible environment:
    ```bash
    composer update
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

Optional PayWay sandbox env for QR payment branches:

```env
PAYWAY_BASE_URL=https://checkout-sandbox.payway.com.kh
PAYWAY_MERCHANT_ID=your-merchant-id
PAYWAY_PUBLIC_KEY=your-public-key
PAYWAY_PAYMENT_OPTION=abapay_khqr
PAYWAY_QR_IMAGE_TEMPLATE=template3_color
PAYWAY_TIMEOUT=15
```

Notes:
- create the sandbox account at `https://developer.payway.com.kh/`
- ABA sends the sandbox credentials by email after registration
- this project currently uses the emailed `merchant id` and `public key`
- the default app flow uses QR generation plus frontend polling and backend `check-transaction`, so no callback URL is required
- the callback endpoint is still present in the backend for future provider-driven confirmation
- ABA support confirmed that the real ABA app cannot complete sandbox QR payments; you need their simulator app for full sandbox payment testing
- request the simulator app by emailing `DigitalSupport@ababank.com` with:
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
- This branch/version is still not a production-ready payment release by default.
