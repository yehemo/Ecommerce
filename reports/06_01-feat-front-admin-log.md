# Front Admin Progress Log

Date: 2026-06-01  
Branch: `feat/front-admin`

## Summary
This report captures the recent work for the admin area:
- admin-only authorization for product and category write APIs
- a dedicated `/admin` frontend area with dashboard, product management, and category management pages
- support for editing existing product variants, option structures, and variant option mappings
- product image URL management
- automatic SKU generation from product name and selected option values

The main goal of this change set is to make admin management usable across both backend and frontend:
- backend now protects write access and supports richer product updates
- frontend now exposes management screens for products and categories

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

### [backend/app/Http/Requests/StoreProductRequest.php](/home/yehemo/code%20project/Ecommerce/backend/app/Http/Requests/StoreProductRequest.php)
- Extended product creation validation.
- Added support for:
  - variant `status`
  - product `images`
  - product image URL validation
- This allows the admin product form to submit images and non-default variant states during create.

### [backend/app/Http/Requests/UpdateProductRequest.php](/home/yehemo/code%20project/Ecommerce/backend/app/Http/Requests/UpdateProductRequest.php)
- Extended product update validation beyond base fields.
- Added validation for:
  - `options`
  - `variants.*.id`
  - `variants.*.sku`
  - `variants.*.price_minor`
  - `variants.*.stock_qty`
  - `variants.*.status`
  - `variants.*.options`
  - `images`
- This file now matches the richer backend update behavior for variants, option mappings, and product images.

### [backend/app/Http/Controllers/Api/ProductController.php](/home/yehemo/code%20project/Ecommerce/backend/app/Http/Controllers/Api/ProductController.php)
- Expanded both product create and update behavior.
- Product create now:
  - saves variant status
  - saves product-level images
  - returns images in the response payload
- Product update now:
  - updates base product fields
  - updates existing variants when an `id` is provided
  - allows adding new variants during edit
  - rebuilds option types and values when `options` are submitted
  - syncs variant option mappings from submitted selections
  - removes variants that are omitted from the submitted variant list
  - replaces product images when `images` are submitted
  - loads `variants.optionValues.optionType` in responses
- This is the core backend change that makes full variant-option editing possible after product creation.

### [backend/tests/Feature/AdminApiAuthorizationTest.php](/home/yehemo/code%20project/Ecommerce/backend/tests/Feature/AdminApiAuthorizationTest.php)
- New feature test file for admin write behavior.
- Covers:
  - public reads stay available
  - guests cannot create products
  - customers cannot create, update, or delete products
  - admins can create, update, and delete products
  - admins can update existing product variants
  - admins can replace product images
  - admins can update product options and variant selections
  - customers cannot write categories
  - admins can write categories
- This is the main regression protection for admin authorization and richer product edit behavior.

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

### [frontend/src/app/admin/categories/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/categories/page.tsx)
- New admin category list page.
- Hosts the category management table.

### [frontend/src/app/admin/categories/new/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/categories/new/page.tsx)
- New category creation page for admins.
- Reuses the shared category editor in create mode.

### [frontend/src/app/admin/categories/[categoryId]/edit/page.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/app/admin/categories/[categoryId]/edit/page.tsx)
- New category edit page for admins.
- Reuses the shared category editor in edit mode.

## New Admin Components

### [frontend/src/components/admin/admin-shell.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/admin-shell.tsx)
- Shared admin shell for all admin pages.
- Handles:
  - client-side admin access check
  - redirect to `/store` for non-admin users
  - admin sidebar navigation
  - logout and back-to-store actions
- Also fixed the sidebar active-state logic:
  - `Dashboard` is active only on `/admin`
  - nested pages no longer incorrectly mark `Dashboard` as active
- Added `Categories` to the admin navigation.

### [frontend/src/components/admin/dashboard-overview.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/dashboard-overview.tsx)
- Dashboard summary component for admins.
- Pulls product and category totals from the API.
- Added a shortcut to the category admin area from the dashboard actions.

### [frontend/src/components/admin/products-table.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/products-table.tsx)
- Product management list component.
- Loads products from the API and shows key fields such as:
  - name
  - status
  - category
  - first variant price
  - total stock
- Includes edit and delete actions.

### [frontend/src/components/admin/categories-table.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/categories-table.tsx)
- New category management list component.
- Loads categories from the API and shows:
  - category name
  - active state
  - parent category
  - number of child categories
- Includes edit and delete actions.
- Surfaces delete errors when a category still has assigned products.

### [frontend/src/components/admin/category-editor.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/category-editor.tsx)
- Shared category form component for create and edit.
- Supports:
  - category name
  - parent category selection
  - active/inactive state
- This is the main category admin form for the current slice.

### [frontend/src/components/admin/product-editor.tsx](/home/yehemo/code%20project/Ecommerce/frontend/src/components/admin/product-editor.tsx)
- Shared admin product form component.
- Supports both create and edit modes.
- Product support includes:
  - base product fields
  - editable option structure
  - editable variants
  - product image URL management
- Variant support includes:
  - price
  - stock quantity
  - status
  - option selectors under each variant
- SKU behavior changed:
  - manual SKU input was removed
  - SKU is now generated automatically from product name + selected option values + variant index
- Existing variant selections now load from the backend in edit mode and can be updated after creation.
- This file is the main frontend implementation for product CRUD, variant option editing, and generated SKU behavior.

## Follow-Up Expansion

The first admin product editor only supported:
- basic product fields
- variant edits for price, stock, and status
- read-only option structure after creation

The later follow-up expanded this into a fuller admin workflow by adding:
- editable product option structure after create
- editable variant option mappings after create
- generated SKU behavior
- category admin UI
- product image URL management
- corrected dashboard active-state behavior in the admin sidebar

## Current Support Includes

- create, edit, and delete categories
- parent category selection in category forms
- create and edit product option structure after creation
- create and edit variant option selections after creation
- automatic SKU generation
- product image URL management
- editable variant price, stock, and status
- admin dashboard, products page, and categories page

## Current Remaining Limitations

- SKU is generated automatically, so manual SKU override is not currently available
- image management is URL-based only
- variant-specific image assignment is still not exposed in the admin UI

## Verification

Completed:
- frontend `npm run build` passed
- PHP syntax checks passed for the changed backend files

Pending in local Docker/Sail environment:
- `sail artisan test --filter=AdminApiAuthorizationTest`

Recommended manual checks:
- edit product option structure after creation
- change variant selections and confirm generated SKU updates
- add, edit, and remove product image URLs
- open `/admin`, `/admin/products`, and `/admin/categories` and confirm the sidebar active state is correct
