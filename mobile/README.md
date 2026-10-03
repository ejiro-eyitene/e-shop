# e-shop Mobile (Expo)

Cross-platform iOS/Android app for the e-shop storefront, talking to the
Next.js backend at **https://e-shop-alpha-ashy.vercel.app**.

Stack: React Native · Expo SDK 57 · Expo Router · NativeWind (Tailwind) ·
expo-secure-store.

## Running

```bash
npm install
npm run start      # then press a / i, or scan the QR with Expo Go
npm run android
npm run ios        # requires macOS or Xcode
npm run typecheck
```

## How sign-in works

Auth.js keeps the web session in an **httpOnly cookie**, which React Native
cannot read — and Android does not persist auth-session cookies across
processes, so there is nothing for the app to store directly. The flow avoids
that entirely:

1. The app opens `/mobile/authorize` in a browser tab (`WebBrowser.openAuthSessionAsync`).
2. The shopper signs in with Google. Auth.js sets its cookie on the web origin.
3. That page mints a **single-use code** (5-minute TTL) and deep-links back to
   `eshop://auth?code=…`.
4. The app posts the code to `/api/mobile/token`, which returns a bearer token.
5. The token is stored in the **keychain** via `expo-secure-store` and sent as
   `Authorization: Bearer …` on every request.

Only the one-time code travels through the URL — never the token — so a leaked
deep link cannot be replayed. Tokens are HMAC-signed with `AUTH_SECRET`, live 30
days, and are re-checked against the database on every request so a deleted
account stops working immediately.

## Cart behaviour

| State | Storage |
|---|---|
| Guest | AsyncStorage (`lib/guestCart.ts`) |
| Signed in | Postgres `cart_items` via `/api/cart` |

`CartContext` exposes one API (`addItem` / `setQuantity` / `removeItem`) for
both, so no screen branches on auth state. On sign-in, the guest cart is posted
to `/api/cart/merge`, which sums quantities per product and **clamps them to
current stock**, reporting anything it could not honour in `skipped`.

AsyncStorage is used for the guest cart rather than SecureStore on purpose: it
holds no credentials, only product ids and quantities.

## API

Base URL is `lib/api.ts`, overridable with `EXPO_PUBLIC_API_URL`.

| Endpoint | Method | Auth |
|---|---|---|
| `/api/products` | GET | public |
| `/api/cart` | GET, POST, DELETE | bearer |
| `/api/cart/merge` | POST | bearer |

`/api/products` supports `category`, `q`, `sort` (`newest`, `price-asc`,
`price-desc`, `name`) and `limit` (capped at 200).

## Layout

```
app/
  _layout.tsx            providers + stack
  (tabs)/                Shop · Cart · Account
  product/[slug].tsx     detail + add to cart
components/ProductCard.tsx
context/
  AuthContext.tsx        sign-in, token persistence, guest merge
  CartContext.tsx        guest/server cart behind one interface
lib/
  api.ts                 typed fetch wrapper
  guestCart.ts           AsyncStorage cart
  secureSession.ts       expo-secure-store token storage
  format.ts              naira() + badge count
```

## Notes

- Prices are **kobo** (₦1 = 100 kobo) end to end, matching Paystack's minor
  unit and the web app.
- The native app is excluded from the Next.js build via `.vercelignore` (root
  anchored `/mobile`) and from `tsc` via `tsconfig.json` `exclude`.
- Checkout is not wired up in the app yet — the cart is complete, but sending
  the order requires a Paystack-capable mobile checkout, which is still pending
  the Paystack API keys.
