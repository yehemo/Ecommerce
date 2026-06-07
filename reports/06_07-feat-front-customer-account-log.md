## Customer Account Expansion Progress Log

Date: 2026-06-07  
Project: `Ecommerce`

### Summary

This report captures the first customer-account expansion slice completed today.

The main outcome is that the storefront now has a dedicated account page at `/store/account` for every authenticated user, including admin accounts using their own storefront identity.

This slice adds:
- a dedicated account entry point from the user name in the navbar
- a profile form for updating:
  - `name`
  - `email`
- a lightweight account overview with quick links to:
  - orders
  - store browsing
  - admin dashboard for admin users
- reusable saved-address management moved into the account area
- a cleaner `/store/orders` page focused only on order history and order-specific actions

### Backend Changes

#### `backend/app/Http/Controllers/Api/CurrentUserController.php`
#### `backend/app/Http/Requests/UpdateCurrentUserRequest.php`
#### `backend/routes/api.php`

Changed:
- added `PATCH /api/user`
- allows the authenticated user to update their own:
  - `name`
  - `email`
- validates:
  - required `name`
  - required unique `email`, ignoring the current user
- returns the refreshed updated user record

Why:
- the storefront had a current-user read endpoint, but no matching profile update endpoint for a customer account page

#### `backend/tests/Feature/CurrentUserApiTest.php`

Changed:
- added coverage for:
  - successful profile update
  - duplicate email rejection
  - guest rejection for `PATCH /api/user`

Why:
- the new account profile API needed direct regression coverage

### Frontend Changes

#### `frontend/src/app/store/account/page.tsx`

Changed:
- added the new `/store/account` page
- includes:
  - account overview card
  - profile update form
  - saved address management section
- admin users also see a shortcut to `/admin`

Why:
- the storefront needed a dedicated account surface instead of treating `/store/orders` as the only personal account page

#### `frontend/src/components/store/header.tsx`

Changed:
- the user name in the desktop navbar now links to `/store/account`
- the mobile menu now includes an `Account` action
- the greeting in the mobile menu also links into the account page

Why:
- the user requested the account entry point to be attached to the user name in the navbar

#### `frontend/src/components/store/address-fields.tsx`
#### `frontend/src/components/store/saved-addresses-manager.tsx`

Changed:
- extracted reusable saved-address UI into shared storefront components
- supports:
  - add
  - edit
  - delete
  - set default
- keeps the saved-address behavior already used by the storefront, but moves ownership of that feature into the account page

Why:
- saved-address management should be reusable and should no longer live inline inside the orders page

#### `frontend/src/app/store/orders/page.tsx`

Changed:
- removed saved-address management from `/store/orders`
- kept order history behavior intact:
  - order tabs
  - shipment info
  - payment/cancel actions
  - order snapshot address editing
- updated copy so the page is clearly order-focused

Why:
- reusable account data and order-specific historical data should be separated
- saved addresses belong in the account page, while order snapshot edits still belong with the order itself

#### `frontend/src/hooks/useAuth.ts`

Changed:
- exposed `refreshUser`

Why:
- after saving profile changes, the navbar greeting and account summary should update immediately without waiting for a later refetch

### Verification

Completed:
- `./vendor/bin/sail artisan test --filter=CurrentUserApiTest`
- `npm run build`
- PHP syntax checks for the new backend files

### Result

The storefront now has a clearer personal-account structure:
- `/store/account` manages reusable account data
- `/store/orders` focuses on order history and order-level actions
- the navbar user name now acts as the direct account entry point
