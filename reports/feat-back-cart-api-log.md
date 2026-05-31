# Cart API Progress Log

## Metadata

- Date: `2026-05-31`
- Branch: `feat/back-cart-api`
- Area: `backend cart API and seeding`

## Summary

This branch starts the first working backend cart flow on top of the existing cart schema.

The earlier schema already had:

- `carts`
- `cart_items`
- `Cart` model
- `CartItem` model

But the API layer was still only scaffolding:

- cart routes were not exposed in `api.php`
- cart controllers were empty
- cart request validation returned `false`
- no cart feature tests existed
- cart seeders were empty

This work turns that into a usable authenticated cart API.

## Main Changes

### 1. Cart routes added

File:

- `backend/routes/api.php`

Added authenticated routes:

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/{cartItem}`
- `DELETE /api/cart/items/{cartItem}`

These routes are protected by `auth:sanctum`.

### 2. Cart controller implemented

File:

- `backend/app/Http/Controllers/Api/CartController.php`

Main behavior:

- returns the authenticated user's active cart
- creates the cart automatically if it does not exist
- loads cart items with related product variant and product data

### 3. Cart item controller implemented

File:

- `backend/app/Http/Controllers/Api/CartItemController.php`

Main behavior:

- add a variant to the authenticated user's active cart
- if the same variant already exists in the cart, increment quantity instead of inserting a duplicate row
- copy `unit_price_minor` from the current product variant price
- update cart item quantity
- remove cart item
- block users from updating or deleting another user's cart item
- reject requests that exceed available stock

## Validation Layer

Files:

- `backend/app/Http/Requests/StoreCartItemRequest.php`
- `backend/app/Http/Requests/UpdateCartItemRequest.php`

Changes:

- `authorize()` now allows authenticated users
- add validation rules for:
  - `product_variant_id`
  - `quantity`

## Seeder Work

Files:

- `backend/database/seeders/CartSeeder.php`
- `backend/database/seeders/CartItemSeeder.php`
- `backend/database/seeders/DatabaseSeeder.php`

Main behavior:

- create active carts for customer users
- fill carts with real product variants
- copy item price from `product_variants.price_minor`
- only use variants with available stock
- call cart seeders from `DatabaseSeeder`

Current seed flow becomes:

1. `CategorySeeder`
2. `ProductSeeder`
3. users
4. `CartSeeder`
5. `CartItemSeeder`

## Test Coverage Added

File:

- `backend/tests/Feature/CartApiTest.php`

Coverage added:

- authenticated user can fetch active cart
- authenticated user can add item to cart
- adding the same variant twice increments quantity
- user cannot update another user's cart item
- user can remove their own cart item

## Validation Status

Completed:

- PHP syntax checks passed for:
  - cart controllers
  - cart request classes
  - cart feature test
  - cart seeders

Pending local runtime validation:

```bash
cd backend
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate:fresh --seed
./vendor/bin/sail artisan test --filter=CartApiTest
```

Note:

- Sail test execution could not be completed during this pass because Docker/Podman was not running in the environment at that moment.

## Next Steps

1. Run the cart feature test in Sail.
2. Connect frontend cart UI to:
   - `GET /api/cart`
   - `POST /api/cart/items`
   - `PATCH /api/cart/items/{cartItem}`
   - `DELETE /api/cart/items/{cartItem}`
3. Decide whether old non-API cart controllers should be removed in this branch or handled in a cleanup branch.

## Notes

This report is focused only on cart API implementation progress and should be read alongside:

- `reports/backend-schema-handoff.md`
- `reports/fix-back-user-schema-log.md`
