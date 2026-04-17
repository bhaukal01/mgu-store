# MGU Store Wiki

Complete deployment and operations manual for the MGU Store stack.

This guide is written so a new operator can deploy, configure, secure, and run the system without prior project context.

## 1. System overview

MGU Store consists of 5 layers:

1. Frontend (React/Vite) for players and admins
2. Backend API (Node/Express) for payment verification and business logic
3. MySQL database for ownership, transactions, actions, and admin users
4. Proxy plugin (Waterfall/Bungee) for secure backend command bridge
5. Spigot plugin (on game servers) for command execution

High-level flow:

1. Player starts purchase on frontend
2. Backend creates Cashfree order from server-side catalog
3. Cashfree confirms payment
4. Backend verifies order server-to-server
5. Backend writes transaction + ownership
6. Backend dispatches payload actions to proxy plugin
7. Proxy sends actions to target backend server(s)
8. Spigot plugin verifies and executes commands

## 2. Prerequisites

### Accounts

- Cashfree account (sandbox for testing, production for live)

### Software

- Node.js 18+ (Node.js 22 recommended)
- MySQL 8+ or MariaDB
- Java runtime required by your proxy/server jars
- Maven (for plugin build)

### Infrastructure

- Backend host (API)
- Proxy host (Waterfall/Bungee)
- One or more Minecraft backend servers (Spigot/Paper)

For production, separate hosts are recommended.

## 3. Repository map

- Backend: `backend/`
- Frontend: `client/`
- Plugins root: `minecraft-plugins/`
- Proxy plugin: `minecraft-plugins/mgu-store-proxy/`
- Spigot plugin: `minecraft-plugins/mgu-store-spigot/`

## 4. Database setup

### 4.1 Create database

```sql
CREATE DATABASE mgu_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4.2 Apply schema

Run SQL file:

- `backend/sql/single_table_player_ranks.sql`

This creates:

- `player_ranks`
- `payment_transactions`
- `expired_subscriptions`
- `postpurchase_actions`
- `admins`

### 4.3 Create initial admin user

Generate bcrypt hash:

```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync('CHANGE_ME_STRONG_PASSWORD', 10))"
```

Insert admin row:

```sql
INSERT INTO admins (email, password)
VALUES ('admin@example.com', '<paste_bcrypt_hash_here>');
```

## 5. Backend setup

### 5.1 Install dependencies

```bash
cd backend
npm install
```

### 5.2 Configure env

Create `.env` from `.env.example`.

Required keys:

- `PORT`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`
- `CASHFREE_TEST_MODE`

Proxy integration keys:

- `PROXY_PLUGIN_HOST`
- `PROXY_PLUGIN_PORT`
- `PROXY_PLUGIN_KEY`
- `PROXY_PLUGIN_AUTH_MODE=hmac`
- `PROXY_PLUGIN_TIMEOUT_MS`

CORS:

- `CORS_ORIGIN` (comma-separated allowed frontend origins)

### 5.3 Run backend

```bash
node app.js
```

Health endpoint:

- `GET /health`

### 5.4 Recommended production run

Use PM2:

```bash
npm install -g pm2
pm2 start app.js --name mgu-store-backend
pm2 save
```

## 6. Cashfree webhook setup

Set webhook URL in Cashfree dashboard:

- `https://<your-backend-domain>/api/purchase/cashfree-webhook`

Rules:

- Backend verifies payment status from Cashfree API before processing
- Webhook payload alone is not trusted

If testing locally, use an HTTPS tunnel (for example ngrok) and set webhook URL to tunnel domain.

## 7. Frontend setup

### 7.1 Install

```bash
cd client
npm install
```

### 7.2 Configure env

Create `client/.env`:

- `VITE_API_BASE_URL=https://<your-backend-domain>`
- `VITE_CASHFREE_MODE=sandbox` (or `production`)

### 7.3 Local run

```bash
npm run dev -- --host
```

### 7.4 Production build

```bash
npm run build
```

Deploy `client/dist` to static hosting.

## 8. Proxy plugin setup

### 8.1 Build

```bash
cd minecraft-plugins/mgu-store-proxy
mvn -DskipTests package
```

Artifact:

- `target/mgu-store-proxy-1.0.0.jar`

### 8.2 Install

Copy jar to proxy plugins folder and start proxy.

Generated files:

- `plugins/MGUStoreProxy/config.yml`
- `plugins/MGUStoreProxy/key/key.txt`

### 8.3 Key distribution

Copy the key content from `key.txt` to:

- backend `.env` -> `PROXY_PLUGIN_KEY`
- each spigot server `plugins/MGUStoreSpigot/config.yml` -> `messaging.key`

### 8.4 Harden listener

In proxy config:

- Set private bind host if possible
- Set strict `allowedIps` to backend host IP

In firewall:

- Allow listener port only from backend IP

## 9. Spigot plugin setup

### 9.1 Build

```bash
cd minecraft-plugins/mgu-store-spigot
mvn -DskipTests package
```

Artifact:

- `target/mgu-store-spigot-1.0.0-shaded.jar`

### 9.2 Install

Copy jar to every backend server `plugins/` and start server once.

Generated config:

- `plugins/MGUStoreSpigot/config.yml`

### 9.3 Configure messaging

Set:

- `messaging.key` = proxy key
- `messaging.channel` = same channel as proxy

Restart server after config change.

### 9.4 Optional command allowlist

Use `commandAllowlistPrefixes` to restrict executable commands.

## 10. First-time operator checklist

1. Backend up and `/health` returns OK
2. Frontend can hit backend API
3. Proxy plugin loaded and key generated
4. Spigot plugin loaded on all target servers
5. Backend env has correct proxy host/port/key
6. Admin login works
7. Product catalog appears in dashboard
8. Proxy server list appears in dashboard

## 11. Dashboard usage guide

## 11.1 Overview tab

Use for real-time checks:

- Revenue KPIs (today, 7 days, 30 days)
- Proxy status
- Proxy connectivity test
- Player rank search

## 11.2 Subscriptions tab

Contains only subscription data:

- Active subscriptions
- Expired subscriptions

## 11.3 Permanent Ranks tab

Contains permanent rank views:

- Active permanent owners (from `player_ranks`)
- Permanent purchase transaction log (from `payment_transactions`)

Revoked users are not shown in active owners table.

## 11.4 Postpurchase Actions tab

Manage command actions that backend dispatches after grant/revoke.

Standard grant action fields:

- Product
- Server
- Commands (one per line)
- Active toggle

Revoke action mode:

- Tick `Revoke Action`
- Product select is not required
- Action is saved with special product code `__REVOKE__`

Edit support:

- Existing actions can be edited and saved

## 11.5 Tools tab

### Manual grant

- Enter username + product
- Confirmation prompt appears
- Backend inserts transaction with `manual_<randomhex>` order id
- Ownership updates immediately
- Grant actions dispatch if configured

### Manual revoke

- Enter username
- Optional `Apply Revoke Action` checkbox
- Optional revoke action selector (single action or all)
- Confirmation prompt appears
- Ownership row removed
- Revoke action payload dispatches if selected/configured

## 12. Data model behavior

### `player_ranks`

Current source of truth for active ownership.

- One row per username
- Permanent and subscription both stored
- Revoke removes row

### `payment_transactions`

Ledger for paid/manual events.

Used by dashboard revenue and purchase history.

### `expired_subscriptions`

Historical archive for expired subscription entries.

### `postpurchase_actions`

Command automation table.

Supports both:

- Product-specific grant actions
- Revoke actions (`product_code = __REVOKE__`)

## 13. Operations runbook

### Daily checks

- Dashboard proxy status online
- Revenue KPIs updating
- No spike in failed manual operations

### Weekly checks

- Review inactive/obsolete actions
- Validate revoke action mappings
- Validate server names still match proxy registry

### Monthly checks

- Rotate secrets if required by policy
- Verify webhook endpoint availability/certificate validity
- Backup DB tables

## 14. Troubleshooting guide

### Issue: player paid but rank not granted

1. Check Cashfree order status is `PAID`
2. Check backend logs for mismatch or verification errors
3. Check proxy connectivity from dashboard
4. Check postpurchase action exists for product and server
5. Check spigot logs for signature/channel errors

### Issue: manual grant successful but no in-game command

1. Confirm action exists for selected product
2. Confirm action server name exists on proxy
3. Confirm proxy and spigot keys match
4. Confirm target server has spigot plugin installed

### Issue: manual revoke does not execute command

1. Confirm `Apply Revoke Action` is enabled
2. Confirm at least one revoke action exists (`Revoke Action` checkbox on action form)
3. Confirm selected revoke action is active

### Issue: permanent active list missing players

- Active list comes from `player_ranks` permanent rows only
- If user revoked, row is removed by design

### Issue: dashboard API 401

- Admin token expired
- Re-login on `/admin`

### Issue: CORS errors

- Update backend `CORS_ORIGIN` to include frontend origin

## 15. Security best practices

- Keep all secrets out of repo
- Use least-privilege DB user
- Restrict proxy listener by IP + firewall
- Keep TLS on public endpoints
- Use `hmac` auth mode for backend-proxy communication
- Rotate shared key and JWT secret periodically

## 16. Backup and recovery

Minimum backup set:

- DB dump (`player_ranks`, `payment_transactions`, `postpurchase_actions`, `expired_subscriptions`, `admins`)
- backend `.env`
- proxy key file
- plugin configs

Recovery order:

1. Restore DB
2. Restore backend config and start backend
3. Restore proxy key/config and start proxy
4. Restore spigot config and start backend servers
5. Verify dashboard connectivity and test one manual grant

## 17. Upgrade strategy

When updating code:

1. Pull latest code into staging
2. Apply any schema changes first
3. Deploy backend
4. Deploy frontend
5. Deploy plugin jars if changed
6. Run smoke tests:

- dashboard login
- proxy status
- one manual grant
- one manual revoke
- one test purchase in sandbox

## 18. Smoke test script (recommended)

1. Login admin
2. Verify Products load
3. Verify Proxy server dropdown loads
4. Create a test grant action
5. Create a test revoke action
6. Manual grant test user
7. Confirm rank in active permanent or subscription table
8. Manual revoke same user with revoke action
9. Confirm user removed from active owner list
10. Verify revenue KPI incremented for manual grant

## 19. Known intentional behaviors

- Buy flow prevents buying if username already has a rank (forces rankup path)
- Subscription ownership auto-expires and is removed
- Manual grant uses normal transaction semantics with custom order id prefix
- Revoke actions are optional and operator-controlled

## 20. Support notes

When asking for support, include:

- Backend logs around failure timestamp
- Proxy logs around dispatch timestamp
- Spigot logs on target server
- Action row details (product/server/active)
- Affected username and order id
