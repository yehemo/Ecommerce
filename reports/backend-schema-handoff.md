# Backend Schema Handoff Report

## Overview

Backend ecommerce schema work was split into three feature branches:

- `feat/back-account-schema`
- `feat/back-catalog-schema`
- `feat/back-order-schema`

Recent commits:

- `2d0cb8e` feat(back): implement account schema with uuid users and addresses
- `d622477` feat(back): implement catalog schema with products and variants
- `b7c3775` feat(back): implement order schema with carts and payments

This work established the backend data contract for the ecommerce system using UUID primary keys, Laravel models, migrations, factories, and seeders.

## Main Backend Decisions

- All business IDs use UUID.
- Admin and customer share the `users` table.
- `users` includes `role` and `status`.
- Product data supports variants.
- `order_items` and `order_addresses` store snapshots for order history.
- Raw card details are not stored.

## Branch Summary

### 1. feat/back-account-schema

Main purpose:

- establish UUID user foundation
- support admin and customer in one table
- add saved addresses

Important files:

- `backend/app/Models/Concerns/HasPrimaryUuid.php`
  - shared UUID model behavior for Eloquent models
- `backend/app/Models/User.php`
  - user model with UUID, `role`, `status`, and relationships
- `backend/app/Models/Address.php`
  - saved address model linked to users
- `backend/database/migrations/0001_01_01_000000_create_users_table.php`
  - converts `users.id` to UUID and adds account fields
- `backend/database/migrations/2026_05_21_060807_create_personal_access_tokens_table.php`
  - makes Sanctum token ownership compatible with UUID users
- `backend/database/migrations/2026_05_21_141942_create_addresses_table.php`
  - creates address storage for users
- `backend/database/factories/UserFactory.php`
  - seeds customer/admin-ready users
- `backend/database/seeders/DatabaseSeeder.php`
  - seeds one admin and one customer

### 2. feat/back-catalog-schema

Main purpose:

- create product catalog structure
- support categories, options, values, variants, and images

Important files:

- `backend/app/Models/Category.php`
  - category tree structure using parent-child relation
- `backend/app/Models/Product.php`
  - base product data
- `backend/app/Models/ProductOptionType.php`
  - option groups like size or color
- `backend/app/Models/ProductOptionValue.php`
  - option values like red or large
- `backend/app/Models/ProductVariant.php`
  - actual sellable SKU records
- `backend/app/Models/ProductVariantOptionValue.php`
  - pivot between variants and option values
- `backend/app/Models/ProductImage.php`
  - product and optional variant images
- `backend/database/migrations/2026_05_21_141942_create_categories_table.php`
- `backend/database/migrations/2026_05_21_141942_create_products_table.php`
- `backend/database/migrations/2026_05_21_141942_create_product_option_types_table.php`
- `backend/database/migrations/2026_05_21_141942_create_product_option_values_table.php`
- `backend/database/migrations/2026_05_21_141943_create_product_variants_table.php`
- `backend/database/migrations/2026_05_21_141943_create_product_variant_option_values_table.php`
- `backend/database/migrations/2026_05_21_141943_create_product_images_table.php`
  - these define the full catalog schema with UUID FKs and unique `slug`/`sku`

### 3. feat/back-order-schema

Main purpose:

- create cart, checkout, order, and payment storage

Important files:

- `backend/app/Models/Cart.php`
  - shopping cart container per user
- `backend/app/Models/CartItem.php`
  - items inside the cart linked to variants
- `backend/app/Models/Order.php`
  - order header and totals
- `backend/app/Models/OrderItem.php`
  - order item snapshot data
- `backend/app/Models/OrderAddress.php`
  - billing/shipping snapshot data
- `backend/app/Models/Payment.php`
  - payment records linked to orders
- `backend/database/migrations/2026_05_21_141943_create_carts_table.php`
- `backend/database/migrations/2026_05_21_141943_create_cart_items_table.php`
- `backend/database/migrations/2026_05_21_141943_create_orders_table.php`
- `backend/database/migrations/2026_05_21_141944_create_order_items_table.php`
- `backend/database/migrations/2026_05_21_141944_create_order_addresses_table.php`
- `backend/database/migrations/2026_05_21_141944_create_payments_table.php`
  - these define cart, order, payment, and snapshot persistence rules

## About Generated Extra Files

Laravel `make:model --all` also generated:

- `backend/app/Http/Controllers/*`
- `backend/app/Http/Requests/*`
- `backend/app/Policies/*`

Main point:

- Controllers are future CRUD/API entry points.
- Form Requests are future validation classes.
- Policies are future authorization classes.

These are scaffolding files and not the core schema contract.

## Core Backend Contract

The most important backend files for teammates are:

- `backend/app/Models/*`
- `backend/database/migrations/*`
- `backend/database/factories/*`
- `backend/database/seeders/*`

These define:

- table structure
- relationships
- UUID usage
- sample development data

## Validation Status

- Git branches were created successfully for the 3 schema layers.
- PHP syntax checks passed on the edited backend files.
- Full backend tests did not complete in the local host PHP environment because the PostgreSQL driver was missing there.

## Handoff Steps

1. Review and merge branches in this order:
   - `feat/back-account-schema`
   - `feat/back-catalog-schema`
   - `feat/back-order-schema`
2. From the `backend` directory, run:

```bash
./vendor/bin/sail artisan migrate:fresh --seed
./vendor/bin/sail artisan test
```

3. API and frontend teammates should integrate against:
   - UUID-based model IDs
   - shared `users` table with `role`
   - product/category/variant relationships
   - order snapshot tables

## Report Purpose

This report exists so the team has one shared place outside `backend` and `frontend` for backend schema handoff notes and implementation history.
