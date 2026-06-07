## Customer Account Expansion Progress Log

Date: 2026-06-07  
Project: `Ecommerce`

### Summary

This report captures the customer-account expansion and follow-up polish completed today.

The main outcome is that the storefront now has a dedicated account page at `/store/account` for every authenticated user, including admin accounts using their own storefront identity.

The first slice added:
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

The follow-up polish adds:
- a tabbed account layout inside `/store/account`
- a dedicated in-account password change flow
- clearer separation between:
  - overview
  - profile editing
  - password settings
  - saved addresses

### Backend Changes

#### `backend/app/Http/Controllers/Api/CurrentUserController.php`
#### `backend/app/Http/Requests/UpdateCurrentUserRequest.php`
#### `backend/app/Http/Requests/UpdateCurrentUserPasswordRequest.php`
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
- added `PATCH /api/user/password`
- validates:
  - required `current_password`
  - required confirmed new password
  - Laravel default password rules
- updates the stored password and rotates the remember token

Why:
- the storefront had a current-user read endpoint, but no matching profile update endpoint for a customer account page
- the account area also needed a proper signed-in password settings flow instead of sending users through forgot-password behavior

#### `backend/tests/Feature/CurrentUserApiTest.php`

Changed:
- added coverage for:
  - successful profile update
  - duplicate email rejection
  - guest rejection for `PATCH /api/user`
  - successful password change
  - invalid current password rejection
  - password confirmation mismatch rejection
  - guest rejection for `PATCH /api/user/password`

Why:
- the account profile and password APIs both needed direct regression coverage

### Frontend Changes

#### `frontend/src/app/store/account/page.tsx`

Changed:
- added the new `/store/account` page
- expanded it into a tabbed account page with:
  - `Overview`
  - `Profile`
  - `Password`
  - `Addresses`
- includes:
  - account overview card
  - profile update form
  - password update form
  - saved address management section inside its own tab
- admin users also see a shortcut to `/admin`

Why:
- the storefront needed a dedicated account surface instead of treating `/store/orders` as the only personal account page
- once profile, password, and address settings all lived there, the page needed clearer structure than one long mixed form

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

### Current Account Support

The storefront account area now supports:
- viewing account overview details
- editing:
  - `name`
  - `email`
- changing password with:
  - current password
  - new password
  - confirmation
- managing reusable saved addresses
- quick navigation into:
  - orders
  - shopping
  - admin dashboard for admin users

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
