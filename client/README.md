# MGU Store Client

React + Vite frontend for players and admin dashboard operators.

This app provides:

- Player purchase and rankup flows
- Success page with order status polling
- Admin login
- Admin dashboard for monitoring and operations

## Requirements

- Node.js 18+

## Local setup

1. Install dependencies

```bash
cd client
npm install
```

2. Configure env file

```bash
cp .env.example .env
```

Required values:

- `VITE_API_BASE_URL` (example `http://localhost:5000`)
- `VITE_CASHFREE_MODE` (`sandbox` or `production`)

3. Start dev server

```bash
npm run dev -- --host
```

## Build and deploy

Build:

```bash
npm run build
```

Output:

- `client/dist`

Deploy options:

- Vercel
- Netlify
- Nginx/Apache static hosting
- Any CDN/static host

Important:

- `VITE_API_BASE_URL` must point to your deployed backend API.

## Player flow

1. User chooses product and enters Minecraft username.
2. Client calls backend buy endpoint with `productCode`.
3. Backend returns `paymentSessionId`.
4. Client opens Cashfree checkout.
5. On success return, page polls backend order status until completed.

Client does not decide final payment status or grant behavior.

## Admin routes

- `/admin` login page
- `/admin/dashboard` operations dashboard

## Dashboard modules

### Overview

- Revenue KPI cards
- Proxy connectivity status + connectivity test
- Player search

### Subscriptions

- Active subscriptions
- Expired subscriptions

### Permanent Ranks

- Active permanent owners (from current ownership table)
- Permanent purchase transaction log

### Postpurchase Actions

- Create action by product + server + commands
- Edit existing action
- Delete action
- Revoke action mode via checkbox (`Revoke Action`)

### Tools

- Manual grant with confirmation prompt
- Manual revoke with confirmation prompt
- Optional revoke-action execution selector

## Operator notes

### Manual grant expectations

- Creates/updates ownership in backend
- Inserts payment transaction with order id `manual_<randomhex>`
- Dispatches configured actions if available

### Manual revoke expectations

- Removes ownership row
- Optionally dispatches configured revoke actions

## Common issues

### Dashboard not loading

- Check `VITE_API_BASE_URL`
- Check backend CORS config
- Check admin token expiry

### Proxy server dropdown empty

- Proxy may be offline/unreachable
- Verify backend proxy env config

### Changes not visible after deploy

- Hard refresh browser
- Clear CDN cache
- Ensure latest `dist` was published
