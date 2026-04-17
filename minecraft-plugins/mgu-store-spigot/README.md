# MGU Store Spigot Plugin

Backend-server plugin (Spigot/Paper) that executes secure payload commands delivered from proxy.

## What it does

- Receives plugin messages on configured channel
- Validates signature, nonce, and timestamp
- Expands placeholders and executes console commands
- Optionally enforces command allowlist prefixes

## Compatibility

- Compiled as Java 8 bytecode
- Built against Spigot 1.8.8 API
- Intended to run from 1.8 to modern Paper versions

Note: your actual runtime Java requirement still depends on your server jar.

## Build

```bash
cd minecraft-plugins/mgu-store-spigot
mvn -DskipTests package
```

Deploy artifact:

- `target/mgu-store-spigot-1.0.0-shaded.jar`

## Install

1. Copy jar to each backend server `plugins/`
2. Start server once
3. Edit generated config file

- `plugins/MGUStoreSpigot/config.yml`

4. Copy shared key from proxy:

- Source: `plugins/MGUStoreProxy/key/key.txt`
- Destination: `messaging.key` in spigot config

5. Restart server

## Config reference

### messaging

- `channel`: plugin messaging channel (must match proxy)
- `legacyChannel`: optional legacy channel registration
- `key`: shared secret from proxy
- `maxClockSkewSeconds`: allowed drift
- `nonceTtlSeconds`: replay protection window

### commandAllowlistPrefixes

Optional command safety filter:

- Empty list -> allow all payload commands
- Non-empty -> only execute commands with approved prefixes

Example:

```yml
commandAllowlistPrefixes:
  - "lp "
  - "eco "
```

## Placeholder support

- `{username}`
- `{rank}`
- `{productCode}`
- `{productType}`
- `{orderId}`
- `{amount}`
- `{currency}`

## Fulfillment model

- Grant and revoke actions are configured in dashboard and stored in DB.
- Backend sends actions to proxy.
- Proxy forwards action payload for each target server.
- This plugin executes those commands locally.

## Troubleshooting

### Plugin loads but commands never run

- Verify channel matches proxy channel
- Verify target server name is correct in dashboard action
- Verify action is active

### Signature errors

- Keys do not match between proxy and this server

### Timestamp/replay errors

- Check server time sync (NTP)
- Replay errors usually indicate duplicate delivery protection working as intended
