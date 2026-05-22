# Fix Back User Schema Log

## Metadata

- Date: `2026-05-22`
- Branch: `fix/back-user-schema`
- Target merge branch: `dev`

## Problem Summary

This fix branch addresses three backend schema issues discovered after the earlier ecommerce schema merge:

1. `users.role` was too open as a plain string and needed to be restricted to `customer` and `admin`
2. several migration files ran in the wrong order because Laravel sorted same-second timestamps alphabetically
3. PostgreSQL failed on the self-referencing `categories.parent_id` foreign key when it was defined directly during `Schema::create()`

## Main Fixes

### 1. User role hardening

Files:

- `backend/app/Enums/UserRole.php`
- `backend/app/Models/User.php`
- `backend/database/migrations/0001_01_01_000000_create_users_table.php`
- `backend/database/factories/UserFactory.php`
- `backend/database/seeders/DatabaseSeeder.php`

Outcome:

- `users.role` is now restricted to:
  - `customer`
  - `admin`
- Laravel code uses a PHP enum instead of raw role strings

### 2. Migration dependency order fix

Affected migration ordering:

- `categories`
- `products`
- `product_option_types`
- `product_option_values`
- `product_variants`
- `product_images`
- `product_variant_option_values`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_addresses`
- `payments`

Outcome:

- parent tables now run before child tables with foreign keys
- `migrate:fresh` should no longer fail because of missing referenced tables

### 3. PostgreSQL categories self-reference fix

File:

- `backend/database/migrations/2026_05_21_141943_create_categories_table.php`

Outcome:

- `categories` is created first
- the `parent_id -> categories.id` foreign key is added in a second schema step
- this avoids the PostgreSQL self-reference migration error

## Validation Commands

Run from `backend`:

```bash
./vendor/bin/sail artisan migrate:fresh --seed
./vendor/bin/sail artisan test
```

Expected result:

- migrations complete successfully
- admin and customer seed records are created
- test suite runs against the repaired schema

## Notes

This log is separate from the earlier handoff report and records the schema repair pass after the first merge of ecommerce backend branches.
