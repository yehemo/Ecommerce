## Admin Inventory Management Progress Log

Date: 2026-06-07  
Project: `Ecommerce`

### Summary

This report captures the inventory-management work completed today.

The main outcome is that inventory now has a first real audit layer and a dedicated admin workflow:
- admin can open `/admin/inventory`
- stock is still stored on `product_variants.stock_qty`, but every important stock change is now recorded
- checkout reservations now create inventory ledger entries
- actionable pending-order cancellations and expiries now restore stock through the same ledger
- admin can search variants by SKU or product name
- admin can filter inventory by:
  - `All Stock`
  - `Low Stock`
  - `Out of Stock`
- admin can manually:
  - set exact stock
  - increase stock
  - decrease stock
- the inventory page was refined so the selected variant expands inline and shows stock controls directly under that variant instead of at the bottom of the page
- the inventory page theme was aligned with the rest of the admin UI instead of using a separate accent-heavy style

### Backend Changes

#### `backend/database/migrations/2026_06_07_000001_create_inventory_movements_table.php`

Changed:
- added the `inventory_movements` table
- stores:
  - `product_variant_id`
  - `actor_user_id`
  - `order_id`
  - `reason`
  - `quantity_delta`
  - `quantity_before`
  - `quantity_after`

Why:
- inventory changes needed an auditable movement ledger instead of only updating `stock_qty`

#### `backend/app/Models/InventoryMovement.php`
#### `backend/database/factories/InventoryMovementFactory.php`
#### `backend/app/Models/ProductVariant.php`

Changed:
- introduced the `InventoryMovement` model
- added the `inventoryMovements()` relation on product variants
- added a matching factory for tests and seeded-style model creation

Why:
- variants now need first-class movement history attached to them

#### `backend/app/Services/Inventory/InventoryService.php`

Changed:
- added a dedicated inventory service as the single stock writer
- supports:
  - checkout reservation reductions
  - cancellation restores
  - manual admin adjustments
- tracks a fixed movement reason list:
  - `manual_adjustment`
  - `restock`
  - `damage`
  - `correction`
  - `checkout_reservation`
  - `cancellation_restore`
- applies a global low-stock threshold of `5`

Why:
- stock writes and stock-history logging should happen in one place so checkout, cancellation, and manual edits cannot drift apart

#### `backend/app/Services/Checkout/CheckoutService.php`
#### `backend/app/Services/Checkout/OrderLifecycleService.php`

Changed:
- checkout no longer decrements stock directly with `decrement()`
- pending-order cancellation/expiry no longer restores stock directly with `increment()`
- both now use `InventoryService`

Why:
- stock mutations from the order flow needed to become ledger-backed inventory events

#### `backend/app/Http/Controllers/Api/AdminInventoryController.php`
#### `backend/app/Http/Requests/AdminInventoryIndexRequest.php`
#### `backend/app/Http/Requests/AdminAdjustInventoryRequest.php`
#### `backend/routes/api.php`

Changed:
- added admin inventory endpoints:
  - `GET /api/admin/inventory`
  - `GET /api/admin/inventory/{variant}`
  - `POST /api/admin/inventory/{variant}/adjust`
- added validation for:
  - stock-state tab filtering
  - inventory search
  - stock adjustment action, quantity, and reason

Why:
- admin needed a dedicated API surface for reviewing and adjusting stock safely

#### `backend/tests/Feature/AdminInventoryManagementApiTest.php`

Changed:
- added coverage for:
  - admin-only access
  - low-stock and out-of-stock filtering
  - search by SKU/product
  - set/increment/decrement adjustments
  - preventing stock from dropping below zero
  - checkout reservation ledger entries
  - cancellation restore ledger entries

Why:
- the inventory ledger and admin adjustment behavior needed focused regression protection

### Frontend Changes

#### `frontend/src/app/admin/inventory/page.tsx`
#### `frontend/src/components/admin/inventory-management.tsx`

Changed:
- added the dedicated `/admin/inventory` page
- supports:
  - inventory search
  - stock-state tabs
  - variant list with stock-state badges
  - inline expansion for the selected variant
  - movement history under the selected variant
  - stock-adjustment controls directly under the selected variant
- the old detached lower-page stock form pattern was replaced with inline expansion for better medium/small-screen usability
- the page theme was revised to match the neutral dark admin look used by the other admin pages

Why:
- admin needed an inventory workflow that is both operationally clear and usable on smaller screens

#### `frontend/src/components/admin/admin-shell.tsx`
#### `frontend/src/components/admin/dashboard-overview.tsx`

Changed:
- added `Inventory` to the admin navigation
- updated the admin shell copy to mention inventory
- updated dashboard shortcuts and summary cards to surface low-stock visibility and a link into inventory management

Why:
- inventory is now a first-class admin function and should be reachable from the same navigation/dashboard system as products and orders

### Verification

Completed:
- `./vendor/bin/sail artisan test --filter=AdminInventoryManagementApiTest`
- `npm run build`
- PHP syntax checks for the new backend files

Note:
- the new inventory migration must be applied before the admin inventory endpoints can be used:

```bash
cd backend
./vendor/bin/sail artisan migrate
```

- broader `CheckoutApiTest` and `OrderLifecycleApiTest` still hit the existing PostgreSQL testing database reset issue; the new inventory-focused suite itself passed
