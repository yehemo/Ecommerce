## PayWay KHQR Payment Integration Progress Log

Date: 2026-06-08  
Project: `Ecommerce`

### Summary

This report captures the first ABA PayWay KHQR payment slice added to the project.

The main outcome is that the previous manual placeholder pay action has been replaced by a real QR-based payment preparation flow using the PayWay sandbox API.

The current implementation now supports:
- creating orders with a pending `payway` payment record
- generating a PayWay KHQR payment QR for pending unpaid orders
- showing the QR on:
  - `/store/checkout`
  - `/store/orders`
- polling order status from the storefront while waiting for payment confirmation
- receiving a PayWay callback on the backend
- verifying the transaction with PayWay before marking the order paid

The existing lifecycle behavior remains intact:
- the 10-minute action window still controls pending unpaid orders
- overdue unpaid orders still auto-cancel
- stock restoration still happens only on cancellation or expiry

### Backend Changes

#### `backend/app/Services/Payments/PayWayService.php`

Changed:
- added the main PayWay service layer for:
  - QR generation
  - transaction checking
  - callback reconciliation
  - local payment/order state updates
- uses PayWay QR API and Check Transaction API
- generates the required PayWay hash using:
  - HMAC SHA-512
  - base64-encoded output
  - the PayWay public key
- stores:
  - transaction id
  - QR string
  - QR image
  - deeplink
  - provider status
  - approval code
  - verification timestamps

Why:
- the PayWay integration needed a dedicated payment service instead of scattering provider logic through the order controller

#### `backend/app/Http/Controllers/Api/OrderController.php`

Changed:
- `POST /api/orders/{order}/pay` no longer force-marks an order as paid
- it now prepares or refreshes the PayWay QR for a valid pending unpaid order
- `GET /api/orders/{order}` now attempts PayWay reconciliation for pending PayWay payments before returning the order

Why:
- the old action was only a placeholder for manual payment success
- the new flow must wait for provider verification before moving the order to `processing`

#### `backend/app/Http/Controllers/Api/PayWayCallbackController.php`
#### `backend/routes/api.php`

Changed:
- added public callback endpoint:
  - `POST /api/payments/payway/callback`
- callback payload is accepted from PayWay and passed into the PayWay service for verification and reconciliation

Why:
- PayWay needs a backend webhook target to notify the merchant system after payment

#### `backend/app/Services/Checkout/CheckoutService.php`

Changed:
- checkout now creates a pending payment with:
  - `provider = payway`
  - `status = pending`

Why:
- the order should be born into the PayWay payment lifecycle directly instead of using a fake manual provider

#### `backend/app/Services/Checkout/OrderLifecycleService.php`

Changed:
- added `markPaidFromProvider()`
- supports setting provider verification details when payment success comes from PayWay
- existing `markPaid()` now delegates to the provider-aware path

Why:
- provider-confirmed payment needs to update the order and payment in one consistent lifecycle path

#### `backend/app/Models/Payment.php`
#### `backend/database/migrations/2026_06_08_000000_add_payway_fields_to_payments_table.php`

Changed:
- extended `payments` with PayWay-specific metadata:
  - `provider_status`
  - `provider_approval_code`
  - `qr_string`
  - `qr_image`
  - `deeplink`
  - `callback_payload`
  - `expires_at`
  - `verified_at`
- updated the model casts and fillable fields to support the new metadata

Why:
- the existing payment table was too small for QR-based provider flows
- storing the QR/payment metadata on the main payment row keeps the integration simpler than adding a second provider table

#### `backend/config/services.php`
#### `backend/.env.example`

Changed:
- added PayWay config entries:
  - `PAYWAY_BASE_URL`
  - `PAYWAY_MERCHANT_ID`
  - `PAYWAY_PUBLIC_KEY`
  - `PAYWAY_CALLBACK_URL`
  - `PAYWAY_PAYMENT_OPTION`
  - `PAYWAY_QR_IMAGE_TEMPLATE`
  - `PAYWAY_TIMEOUT`

Why:
- the provider values need to live in configuration, not in controllers or source files

#### `backend/tests/Feature/CheckoutApiTest.php`
#### `backend/tests/Feature/OrderLifecycleApiTest.php`
#### `backend/tests/Feature/PayWayPaymentApiTest.php`

Changed:
- updated checkout expectations from `manual` to `payway`
- updated lifecycle expectations so `/pay` now prepares QR instead of force-marking paid
- added focused PayWay payment coverage for:
  - QR generation
  - order reconciliation from provider check
  - callback-driven payment confirmation

Why:
- the old tests represented the temporary manual-payment behavior
- the new slice needed direct regression coverage for the provider-backed QR flow

### Frontend Changes

#### `frontend/src/app/store/checkout/page.tsx`

Changed:
- after checkout creates an order, the page now prepares a PayWay QR automatically for a still-actionable pending order
- added PayWay payment display with:
  - QR image
  - deeplink button
  - transaction reference
  - expiration message
- added polling against `GET /api/orders/{id}` while the QR is active
- changed copy from placeholder manual payment language to PayWay KHQR payment language
- changed the payment action button label from `Pay now` to:
  - `Get QR`
  - `Refresh QR`

Why:
- the completed checkout screen is now the first place a customer should see and use the QR

#### `frontend/src/app/store/orders/page.tsx`

Changed:
- pending unpaid orders now prepare QR instead of instantly marking paid
- expanded order details can show:
  - PayWay QR
  - deeplink
  - transaction reference
  - expiration message
- added polling for a selected pending order while its QR is active
- updated button label from `Pay now` to:
  - `Get QR`
  - `Refresh QR`

Why:
- the customer order page needs to support retrying or reopening payment for valid pending unpaid orders

#### `frontend/src/components/store/cart-provider.tsx`

Changed:
- extended `OrderPayment` type with PayWay metadata:
  - `provider_status`
  - `provider_approval_code`
  - `qr_string`
  - `qr_image`
  - `deeplink`
  - `expires_at`
  - `verified_at`

Why:
- the storefront payment UI needs typed access to the new payment fields

### Local Configuration Applied

The local backend environment was updated with:
- `PAYWAY_MERCHANT_ID=ec475938`
- the PayWay public key from the sandbox credential file
- `PAYWAY_CALLBACK_URL=http://localhost/api/payments/payway/callback`

Current limitation:
- `http://localhost/...` is only a local placeholder
- real PayWay callback testing still requires a public HTTPS tunnel such as ngrok or Cloudflare Tunnel

### Verification

Completed:
- `npm run build`
- PHP syntax checks on the new PayWay backend files

Current limitation:
- focused backend PayWay test execution still hits the existing PostgreSQL testing database reset issue already present in this environment
- because of that, the new PayWay feature tests were added and partially exercised, but not fully verified end-to-end in this environment

### Result

The project now has a real KHQR payment initiation path using ABA PayWay:
- orders stay pending until provider verification succeeds
- customers can scan a QR from checkout or order history
- the backend can confirm payment through callback and transaction verification
- the old manual “mark paid” shortcut has been replaced by a provider-backed payment flow
