# Front Admin Progress Log

Date: 2026-06-01  
Branch: `feat/front-admin`

## Summary
This report captures the recent work for the first admin slice:
- admin-only authorization for product and category write APIs
- a new `/admin` frontend area with dashboard and product management pages
- follow-up support for editing existing product variants such as SKU, price, stock, and status

The main goal of this change set is to make admin access real at both layers:
- backend now rejects non-admin write requests
- frontend now exposes a dedicated admin UI for authenticated admins

## Backend Changes

### [backend/app/Http/Middleware/EnsureUserIsAdmin.php](/home/yehemo/code%20project/Ecommerce/backend/app/Http/Middleware/EnsureUserIsAdmin.php)
- New middleware file.
- Checks the authenticated user and aborts with `403` unless the user is an admin.
- This centralizes admin authorization instead of repeating role checks in each controller.

### [backend/bootstrap/app.php](/home/yehemo/code%20project/Ecommerce/backend/bootstrap/app.php)
- Added the `admin` middleware alias.
- This lets routes use a readable middleware name such as `['auth:sanctum', 'admin']`.
- The change makes route protection easier to maintain.

### [backend/app/Models/User.php](/home/yehemo/code%20project/Ecommerce/backend/app/Models/User.php)
- Added `isAdmin()`.
- This method returns whether the user role is `UserRole::ADMIN`.
- It gives middleware and future policies a clean reusable role check.

### [backend/routes/api.php](/home/yehemo/code%20project/Ecommerce/backend/routes/api.php)
- Split product and category routing into:
  - public read routes
  - admin-only write routes
- Public reads remain available:
  - `GET /api/products`
  - `GET /api/products/{product}`
  - `GET /api/categories`
  - `GET /api/categories/{category}`
- Admin-only writes now require `auth:sanctum` and `admin`:
  - `POST`, `PATCH`, `DELETE` for products
  - `POST`, `PATCH`, `DELETE` for categories
- This preserves store browsing while protecting catalog management.

### [backend/tests/Feature/AdminApiAuthorizationTest.php](/home/yehemo/code%20project/Ecommerce/backend/tests/Feature/AdminApiAuthorizationTest.php)
- New feature test file.
- Covers:
  - public reads stay available
  - guests cannot create products
  - customers cannot create, update, or delete products
  - admins can create, update, and delete products
  - customers cannot write categories
  - admins can write categories
  - admins can update existing product variants
- This is the main regression protection for admin authorization behavior.

### [backend/app/Http/Requests/UpdateProductRequest.php](/home/yehemo/code%20project/Ecommerce/backend/app/Http/Requests/UpdateProductRequest.php)
- Extended product update validation to accept `variants` during edit.
- Added validation for:
  - `variants.*.id`
  - `variants.*.sku`
  - `variants.*.price_minor`
  - `variants.*.stock_qty`
  - `variants.*.status`
- Also removed the broken `Rule::unique(...)` usage that caused the Laravel test failure.
- This file now matches the backend update behavior for variant editing.

### [backend/app/Http/Controllers/Api/ProductController.php](/home/yehemo/code%20project/Ecommerce/backend/app/Http/Controllers/Api/ProductController.php)
- Expanded the `update()` method.
- Previous behavior:
  - only updated product base fields such as name, category, description, and status
  - ignored variant edits completely
- Current behavior:
  - still updates base product fields
  - updates existing variants when an `id` is provided
  - allows adding new variants during product edit
  - checks SKU uniqueness during update
  - returns refreshed product data with variants and option values loaded
- This is the core backend change that makes variant editing possible.

## Frontend Changes

### [frontend/src/hooks/useAuth.ts](/home/yehemo/code%20project/Ecommerce/frontend/src/hooks/useAuth.ts)
- Added an `AuthUser` interface.
- Typed the `/api/user` response with `role` and related fields.
- Exposed `error` along with the existing auth helpers.
- This gives the admin UI a stable user shape for role-based gating.

### [frontend/src/components/store/header.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/store/header.tsx)
- Added an `Admin` link for logged-in admin users.
- Added the same admin link to the mobile menu.
- This gives admins a direct path from the store UI into the admin area.

### [frontend/src/components/ui/input.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/ui/input.tsx)
- Fixed the `cn` import to come from `@/lib/utils` instead of `@/lib/axios`.
- This was an unrelated existing issue, but it blocked the frontend build.
- The fix was needed so the admin work could build cleanly.

## New Admin Route Files

### [frontend/src/app/admin/layout.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/layout.tsx)
- New admin route layout.
- Wraps all admin pages in the shared admin shell.

### [frontend/src/app/admin/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/page.tsx)
- New admin dashboard entry page.
- Uses the dashboard overview component.

### [frontend/src/app/admin/products/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/products/page.tsx)
- New admin product list page.
- Hosts the product table management UI.

### [frontend/src/app/admin/products/new/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/products/new/page.tsx)
- New product creation page for admins.
- Reuses the shared product editor in create mode.

### [frontend/src/app/admin/products/[productId]/edit/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/products/[productId]/edit/page.tsx)
- New product edit page for admins.
- Reuses the shared product editor in edit mode.

## New Admin Components

### [frontend/src/components/admin/admin-shell.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/admin-shell.tsx)
- New shared admin shell.
- Handles:
  - client-side admin access check
  - redirect to `/store` for non-admin users
  - admin sidebar navigation
  - logout and back-to-store actions
- This is the main admin layout and access wrapper for the frontend.

### [frontend/src/components/admin/dashboard-overview.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/dashboard-overview.tsx)
- New dashboard summary component.
- Pulls product and category totals from the API.
- Gives admins a landing page instead of dropping them directly into CRUD views.

### [frontend/src/components/admin/products-table.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/products-table.tsx)
- New product management list component.
- Loads products from the API and shows key fields such as:
  - name
  - status
  - category
  - first variant price
  - total stock
- Includes edit and delete actions.
- This is the main catalog management table for the first admin slice.

### [frontend/src/components/admin/product-editor.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/product-editor.tsx)
- New shared admin product form component.
- Supports both create and edit modes.
- Create mode:
  - base product fields
  - option creation
  - variant creation
- Edit mode:
  - base product fields
  - editable variants
  - option structure shown as read-only reference
- After the follow-up fix, edit mode now supports changing:
  - variant SKU
  - variant price
  - variant stock quantity
  - variant status
- This file is the main frontend implementation for admin product CRUD.

## Variant Edit Follow-Up

The first admin UI version exposed product edit, but variant fields were only shown as a snapshot. That happened because:
- the frontend edit form did not send variant changes
- the backend product update endpoint did not validate or persist variant updates

The follow-up change resolved that by:
- extending `UpdateProductRequest`
- extending `ProductController::update()`
- rewriting `product-editor.tsx` so edit mode loads variants into form fields and sends them back on save

Current edit support includes:
- update existing variant SKU
- update existing variant price
- update existing variant stock quantity
- update existing variant status
- add new variants during edit

Current remaining limitation:
- option structure and variant-to-option mapping are still read-only during edit

## Verification

Completed:
- frontend `npm run build` passed
- PHP syntax checks passed for the changed backend files

Pending in local Docker/Sail environment:
- `sail artisan test --filter=AdminApiAuthorizationTest`

The last backend test failure was caused by a stale `Rule::unique(...)` line in `UpdateProductRequest.php`, and that line has now been removed.
