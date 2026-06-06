## Checkout Order Window Progress Log

Date: 2026-06-06  
Project: `Ecommerce`

### Summary

This report captures today's checkout and order-lifecycle work across backend and frontend.

The main outcome is a full post-checkout pending-order flow with a 10-minute action window:
- checkout now creates an order with a placeholder payment
- the customer can pay or cancel the order within 10 minutes
- unpaid overdue orders are cancelled automatically
- order addresses can only be edited while the order is still actionable
- stock is reserved immediately at checkout and restored on unpaid cancel or expiry
- the checkout frontend restores and updates the completed order state correctly, including the continue-shopping case after cancellation

### Backend Changes

#### `backend/app/Services/Checkout/CheckoutService.php`

Changed:
- added a dedicated checkout service for creating orders from the authenticated user's active cart
- validates active cart items and locks both the cart and related product variants
- creates order items, order addresses, and a placeholder manual payment in one transaction
- sets `placed_at` and initializes the order as `pending` with `payment_status = unpaid`
- decrements `product_variants.stock_qty` at checkout time to reserve inventory immediately
- marks the active cart as `completed` after successful checkout

Why:
- checkout should be atomic and race-safe
- stock must be reserved during the 10-minute pending window to avoid overselling

#### `backend/app/Services/Checkout/OrderLifecycleService.php`

Changed:
- added shared lifecycle logic for:
  - syncing expired orders
  - checking whether an order is still actionable
  - marking an order as paid
  - cancelling an order
  - expiring overdue unpaid orders
- marks the placeholder payment as `paid` and sets `paid_at` when the customer pays
- moves paid orders to `processing` with `payment_status = paid`
- cancels overdue or customer-cancelled unpaid orders
- restores reserved stock from `order_items` when an unpaid order is cancelled or expired
- blocks address edits once the order is no longer actionable

Why:
- the action window rules should live in one place
- pay, cancel, expiry, and editability must stay consistent

#### `backend/app/Http/Controllers/Api/CheckoutController.php`

Changed:
- added authenticated checkout endpoint handling for order creation

Why:
- checkout API now routes through the dedicated service instead of keeping order logic inline

#### `backend/app/Http/Controllers/Api/OrderController.php`

Changed:
- added authenticated customer order endpoints for:
  - `GET /api/orders/{order}`
  - `POST /api/orders/{order}/pay`
  - `POST /api/orders/{order}/cancel`
- customer responses include current order, payment, and lifecycle state for frontend rendering

Why:
- the frontend needs a supported way to restore, pay, cancel, and refresh the current completed order

#### `backend/app/Http/Controllers/Api/OrderAddressController.php`

Changed:
- added order-address update handling for post-checkout address edits
- enforces lifecycle restrictions through the shared order lifecycle service

Why:
- order addresses must stop being editable after pay, cancel, or expiry

#### `backend/app/Http/Controllers/Api/AddressController.php`

Changed:
- added authenticated saved-address CRUD support used by checkout

Why:
- the checkout flow now supports selecting and maintaining saved customer addresses

#### `backend/app/Http/Requests/CheckoutRequest.php`
#### `backend/app/Http/Requests/UpdateOrderAddressesRequest.php`
#### `backend/app/Http/Requests/StoreAddressRequest.php`
#### `backend/app/Http/Requests/UpdateAddressRequest.php`

Changed:
- added and refined validation for checkout payloads, order address edits, and saved address create/update requests
- aligned address validation with the simplified address shape used in checkout and order addresses

Why:
- the checkout, saved-address, and edit-address flows all need consistent request validation

#### `backend/app/Console/Commands/ExpireUnpaidOrders.php`
#### `backend/routes/console.php`

Changed:
- added the `orders:expire-unpaid` command
- scheduled the command to run automatically

Why:
- unpaid pending orders must be cancelled by the backend after the 10-minute window even if the UI is closed

#### `backend/routes/api.php`

Changed:
- added authenticated routes for:
  - checkout
  - saved addresses
  - order fetch
  - order pay
  - order cancel
  - order address update

Why:
- the new checkout lifecycle requires first-class API endpoints

#### `backend/app/Models/Order.php`

Changed:
- added shared order action-window support used to calculate the 10-minute deadline

Why:
- the deadline is reused across pay, cancel, expiry, and address-edit checks

### Frontend Changes

#### `frontend/src/app/store/checkout/page.tsx`

Changed:
- added the full customer checkout page for:
  - manual address entry
  - saved address selection
  - billing same-as-shipping support
  - saved-address editing
  - order submission
- added completed-order restoration from session storage and backend refresh via `GET /api/orders/{id}`
- added a 10-minute countdown after successful checkout
- shows `Pay now`, `Cancel order`, and `Edit addresses` only while the order is still actionable and unpaid
- switches the UI to paid or cancelled state after lifecycle changes
- refreshes expired orders from the backend
- clears stale completed-order state when the customer continues shopping with a new active cart after a cancelled or expired order

Why:
- the storefront needs a complete customer-facing flow for the new pending-order lifecycle

#### `frontend/src/components/store/cart-provider.tsx`

Changed:
- extended shared cart and checkout types to include order, payment, and saved-address response data
- added client helpers for address and order lifecycle payloads used by the checkout page

Why:
- the checkout page needs typed shared structures for API responses and mutations

#### `frontend/src/app/store/cart/page.tsx`

Changed:
- updated cart-to-checkout behavior to work with the new checkout route and completed-order flow

Why:
- cart and checkout now operate as one continuous reservation flow

#### `frontend/src/app/store/(auth)/login/page.tsx`
#### `frontend/src/components/auth/LoginForm.tsx`

Changed:
- updated login redirect handling so customers can authenticate and return to checkout cleanly

Why:
- checkout is now protected and must preserve the user's next destination

#### `frontend/src/app/store/orders/page.tsx`

Changed:
- added a protected customer orders page at `/store/orders`
- shows saved account addresses at the top with:
  - create
  - edit
  - delete
  - set default
- added tabbed order browsing for:
  - all orders
  - pending payment
  - pending shipping
  - cancelled
- added inline expandable order cards showing:
  - order items
  - totals
  - payment state
  - shipping and billing snapshot addresses
- reused the existing pay, cancel, and order-address edit actions directly inside the order cards when the order is still actionable

Why:
- customers now need a real account-level place to manage saved addresses and review their order history beyond the single completed-checkout state

#### `frontend/src/components/store/header.tsx`

Changed:
- added an `Orders` link for authenticated users in both desktop and mobile navigation

Why:
- the new customer orders page needs to be directly reachable from the storefront navigation

#### `frontend/src/components/store/cart-provider.tsx`

Changed:
- expanded shared storefront types to support:
  - orders tabs
  - order address snapshots
  - payment summary data
- kept the checkout and order page using the same API response shapes

Why:
- checkout and the new orders page should share one consistent client-side order contract

### Customer Orders API Follow-Up

#### `backend/app/Http/Controllers/Api/OrderController.php`

Changed:
- added authenticated `GET /api/orders`
- returns only the signed-in user's orders
- syncs expired pending orders before returning them
- supports customer-facing tab filters:
  - `all`
  - `pending_payment`
  - `pending_shipping`
  - `cancelled`

Why:
- the new `/store/orders` page needs a list endpoint rather than only single-order fetches
- expired unpaid orders should not appear under the wrong tab because of stale state

#### `backend/routes/api.php`

Changed:
- added authenticated order list route:
  - `GET /api/orders`

Why:
- the storefront now needs a first-class customer order history endpoint

### Test Coverage

#### `backend/tests/Feature/AddressApiTest.php`

Added:
- coverage for authenticated saved-address CRUD behavior

#### `backend/tests/Feature/CheckoutApiTest.php`

Added:
- checkout order creation coverage
- placeholder payment creation coverage
- stock reservation coverage
- insufficient stock rollback coverage

#### `backend/tests/Feature/OrderLifecycleApiTest.php`

Added:
- pay and cancel authorization coverage
- action-window timing coverage
- paid and cancelled state protection
- auto-expiry coverage
- stock restoration coverage for unpaid cancel and expiry

#### `backend/tests/Feature/OrderAddressEditApiTest.php`

Added:
- order-address editing coverage within the action window
- edit blocking coverage after pay, cancel, or expiry

#### `backend/tests/Feature/OrderListApiTest.php`

Added:
- order list ownership coverage
- customer-facing tab filter coverage
- expired-order sync coverage before list responses are returned

Why:
- the new customer order page depends on correct user scoping and correct tab grouping for pending payment, pending shipping, and cancelled orders

### Data and Policy Changes

#### `backend/database/migrations/2026_06_06_000001_drop_state_and_country_code_from_addresses_tables.php`

Changed:
- removed unused address fields from persisted address tables to align with the current checkout payload shape

Why:
- the current storefront and order flows do not collect these fields

#### `backend/app/Models/Address.php`
#### `backend/app/Models/OrderAddress.php`
#### `backend/database/factories/AddressFactory.php`
#### `backend/database/factories/OrderAddressFactory.php`

Changed:
- aligned model and factory data with the simplified address schema

Why:
- model fillable fields and test factories must match the new address structure

#### `backend/app/Policies/AddressPolicy.php`
#### `backend/app/Policies/OrderPolicy.php`
#### `backend/app/Http/Controllers/Controller.php`

Changed:
- aligned authorization handling with customer-owned address and order actions

Why:
- saved addresses and order lifecycle mutations must remain scoped to the owning customer

### Verification

Completed:
- backend test suite passed in Sail:
  - `./vendor/bin/sail artisan test`
  - result: `55` tests passed
- frontend production build passed:
  - `npm run build`

### Notes

Current scope does not yet include:
- real payment gateway integration
- refunds or returns
- admin post-payment cancellation flows
- scheduler/server deployment setup outside the codebase
- admin-all-orders management across every customer account
