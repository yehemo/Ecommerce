# Frontend

Next.js storefront and admin UI for the Ecommerce project.

For full project setup, seeded accounts, and feature scope, see the root [README](../README.md).

## Frontend Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Default local API target:

```env
NEXT_PUBLIC_API_URL=http://localhost
```

## Useful Commands

Development:

```bash
npm run dev
```

Production build check:

```bash
npm run build
```

## Notes

- Storefront lives under `/store`
- Admin UI lives under `/admin`
- The frontend expects the Laravel backend to handle Sanctum cookies and CSRF at the API base URL
- The storefront includes PayWay KHQR sandbox QR payment support, but production-ready live payment setup still needs separate credentials and release validation
