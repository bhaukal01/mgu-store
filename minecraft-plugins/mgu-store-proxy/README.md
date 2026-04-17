# MGU Store Proxy Plugin

Proxy-side fulfillment bridge for Waterfall/BungeeCord.

## Purpose

This plugin does two jobs:

1. Listens for signed backend requests over TCP
2. Forwards validated payload actions to backend servers over plugin messaging

It is the runtime bridge between backend APIs and spigot servers.

## Requirements

- Waterfall/BungeeCord proxy
- Java runtime compatible with your proxy build

## Build

```bash
cd minecraft-plugins/mgu-store-proxy
mvn -DskipTests package
```

Output jar:

- `target/mgu-store-proxy-1.0.0.jar`

## Install

1. Copy jar to proxy `plugins/`
2. Start proxy once
3. Plugin generates:

- `plugins/MGUStoreProxy/config.yml`
- `plugins/MGUStoreProxy/key/key.txt`

4. Copy key to:

- backend env `PROXY_PLUGIN_KEY`
- each spigot server `plugins/MGUStoreSpigot/config.yml` -> `messaging.key`

## Config reference

File: `plugins/MGUStoreProxy/config.yml`

### listener section

- `enabled`: enable TCP server
- `bindHost`: interface bind host
- `port`: listener port used by backend
- `allowedIps`: optional source IP allowlist
- `authMode`: use `hmac` (recommended)
- `maxClockSkewSeconds`: replay/timestamp tolerance
- `nonceTtlSeconds`: replay nonce retention

### pluginMessaging section

- `channel`: plugin messaging channel (must match spigot config)

## Request actions supported

- `FULFILL_PURCHASE`: main dispatch from backend
- `PING`: health check for admin dashboard
- `LIST_SERVERS`: list proxy server names for dashboard dropdowns

## Action source model

- Commands are not hardcoded in proxy config.
- Backend sends product/revoke action payloads from DB-configured postpurchase actions.
- Each action includes target `server` and `commands[]`.

If target server is missing on proxy, that action is skipped and logged.

## Placeholders passed downstream

- `{username}`
- `{rank}`
- `{productCode}`
- `{productType}`
- `{orderId}`
- `{amount}`
- `{currency}`

## Security hardening

- Keep listener port private
- Restrict `allowedIps` to backend IP only
- Keep key file private
- Rotate key on suspected leak
- Use `hmac` only in production

## Backend env mapping

Configure backend with:

- `PROXY_PLUGIN_HOST`
- `PROXY_PLUGIN_PORT`
- `PROXY_PLUGIN_KEY`
- `PROXY_PLUGIN_AUTH_MODE=hmac`
- `PROXY_PLUGIN_TIMEOUT_MS`

## Troubleshooting

### Backend says proxy unreachable

- Verify firewall and routing
- Verify host/port in backend env
- Check listener is enabled

### Commands not executed in game

- Verify proxy server names match dashboard action server names
- Verify spigot plugin is installed on target server
- Verify channel and shared key match

### Signature/time validation errors

- Confirm key match across backend/proxy/spigot
- Sync system clocks via NTP
