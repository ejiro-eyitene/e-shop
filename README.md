# e-shop — Next.js + daisyUI + Neon + Paystack + Mailgun

e-shop is a Nigerian e-commerce storefront: product catalogue, cart, Paystack
checkout, Google sign-in, and email receipts via Mailgun.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), TypeScript |
| UI | Tailwind CSS v4 + daisyUI 5 |
| Database | Neon (serverless Postgres) + Drizzle ORM |
| Auth | Auth.js v5 (`next-auth@beta`) with Google OAuth |
| Payments | Paystack REST API |
| Email | Mailgun |

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

Fill in every value in `.env.local`, then restart the dev server.

#### Neon
Console → **Connection Details** → copy the **pooled** connection string into
`DATABASE_URL`. Use the pooled URL (`-pooler.`); it works in serverless runtimes.

#### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. Enable the **Google People API** (needed for profile info).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
4. Authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID / Client Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Add your production domain to the redirect URIs before deploying.

#### Mailgun
1. [Mailgun](https://www.mailgun.com/) → add/verify your sending domain.
2. **Sending → Domain settings** → copy the API key and the sending domain
   (e.g. `sandboxa8ac73e67dbb48d09c1c3e4a8149863e.mailgun.org`).

> **Sandbox domains cannot deliver to Gmail.** Mailgun's free sandbox domains
> are not DMARC-aligned with the `From:` domain, so Gmail rejects them with
> `550 5.7.40` (*"From: header isn't aligned with the authenticated SPF or DKIM
> organizational domain"*) — even for authorized recipients.
>
> This means order confirmation emails **will not reach customers** on a
> sandbox domain. You have three options:
>
> 1. **Use a real domain with Mailgun (recommended).** Add a domain you own,
>    point the DNS records Mailgun gives you, wait for verification, then set
>    `MAILGUN_DOMAIN` and `MAILGUN_FROM` to it. Required for production.
> 2. **Switch providers** — Resend, Brevo and SendGrid all give a real sending
>    domain on a free tier.
> 3. **Keep the sandbox for local dev only**, and send real receipts through
>    another provider once you go live.
>
> You can add test recipients with:
>
> ```bash
> curl -u "api:$MAILGUN_API_KEY" -X POST \
>   https://api.mailgun.net/v5/sandbox/auth_recipients \
>   -F email="you@email.com"
> ```

#### Paystack
[Paystack dashboard](https://dashboard.paystack.com/) → **Settings → API Keys**.
Test keys start with `sk_test_` / `pk_test_`.

Generate `AUTH_SECRET` with:

```bash
npx auth secret
```

#### `AUTH_URL` — the most common sign-in failure

Auth.js **trusts `AUTH_URL` over the real request origin**. If it points at a
different port than the one you are serving on, Google redirects the browser to
a dead address and sign-in fails with a **404 that explains nothing**.

```env
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```

That value must exactly match the authorized redirect URI in Google Cloud
Console. So locally, always run on the default port:

```bash
npm run dev        # must be http://localhost:3000
```

If you need another port, change `AUTH_URL` *and* add the new callback URL in
Google Cloud Console.

> If a shell or CI already exports `AUTH_URL`, it will override `.env.local`
> unless `.env.local` also sets it — `loadLocalEnv()` deletes the inherited
> value when the file doesn't define one.

### 3. Create the tables

```bash
npm run db:push     # apply schema to Neon
npm run db:seed     # load 6 demo products
```

### 4. Run

```bash
npm run dev         # http://localhost:3000
```

## Payments and the callback

Checkout redirects to Paystack's hosted page, then returns to
`/checkout/verify?reference=...`. That route **verifies the transaction with
Paystack's API** before marking an order paid — the browser redirect alone is
never trusted. Only after a verified payment does it send the Mailgun receipt.

Amounts are always recomputed from the database server-side; the client never
supplies prices.

### Using a real domain locally

Paystack must redirect back to a URL it can reach. To test properly:

```bash
ngrok http 3000
```

Then add the `ngrok` callback URL to Paystack and set `NEXT_PUBLIC_APP_URL`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate a SQL migration from the schema |
| `npm run db:push` | Push the schema to Neon |
| `npm run db:seed` | Insert demo products |

## Project layout

```
src/
  auth.ts                 Auth.js config + Google provider
  db/
    schema.ts             Drizzle tables (users, accounts, sessions,
                          verificationTokens, products, orders, orderItems)
    index.ts              Neon client
    seed.ts               Demo catalogue
  lib/
    paystack.ts           initialize + verify payment (REST)
    mailgun.ts            Order confirmation email
    formatters.ts         Kobo -> Naira
    dbFallback.ts         Graceful degradation when the DB is unreachable
  components/
    cart/CartProvider.tsx Client cart (localStorage) + reducer
    layout/Navbar.tsx     Nav with auth state and cart badge
    product/              Add-to-cart button
  app/
    page.tsx              Home: hero, category chips, featured products
    products/page.tsx     Full catalogue + search + filters
    products/[slug]/      Product detail
    cart/                 Cart
    checkout/             Checkout form
    checkout/verify/      Server-side payment verification
    checkout/success/     Receipt page
    login/                Google sign-in
    auth/error/           Friendly Auth.js failure page
    orders/               Order history (requires sign-in)
    api/auth/[...nextauth]/
    api/orders/           Creates the order, starts Paystack payment
  lib/
    products.ts           Catalogue queries: search, price range, sort
  instrumentation.ts      Loads .env.local before any module evaluates
```

## Search and filtering

`/products` supports keyword search, a category filter, a price range and
sorting. All of it runs through **server-side** queries against Neon, and the
form is a plain `GET` form — so search works with JavaScript disabled, URLs are
shareable, and the whole catalogue is never shipped to the browser.

| Filter | Query param | Notes |
| --- | --- | --- |
| Keyword | `?q=` | Case-insensitive match on name, description and category |
| Category | `?category=` | e.g. `?category=Gaming` (URL-encode `&`) |
| Min / max price | `?min=` `?max=` | In **naira**, converted to kobo server-side |
| Sort | `?sort=` | `newest`, `price-asc`, `price-desc`, `name` |

Examples:

```
/products?q=laptop
/products?category=Home%20Appliances
/products?min=100000&max=500000
/products?q=fryer&sort=price-asc
```

Filters combine, so `/products?category=Gaming&max=300000` works. Invalid or
inverted ranges simply return the "No products matched" state.

## Why `instrumentation.ts` exists

Next.js was not populating `process.env` from `.env.local` in this setup, and
`@auth/core/providers/google` reads `AUTH_GOOGLE_ID` **when it is first
imported**. `src/instrumentation.ts` calls `loadLocalEnv()` on server boot so
the variables are guaranteed to exist before any application module evaluates.

`loadLocalEnv()` also parses the file itself rather than using
`process.loadEnvFile()`, because the latter refuses to overwrite variables that
already exist — and some shells/CI define `AUTH_GOOGLE_ID`, `AUTH_SECRET` and
friends as empty strings, which silently breaks OAuth.

## Notes and limitations

- **Guest checkout is supported.** `orders.user_id` is non-null, so guest
  checkouts reuse/create a `users` row keyed by email. Those accounts cannot
  sign in with Google, but if the same email later signs in, orders are linked.
- **Stock is not decremented.** The order flow validates stock availability but
  does not decrement it. Add a transaction to decrement on payment success
  before running real sales.
- **`next-auth@beta`** is Auth.js v5, still published under the `beta` tag.
- The storefront degrades to an empty catalogue rather than a 500 if Neon is
  unreachable (`src/lib/dbFallback.ts`).