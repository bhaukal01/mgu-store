# MGU Store Plugin Layer

This folder contains the proxy + spigot plugin system used for secure fulfillment.

It replaces insecure direct command channels and keeps grant/revoke execution inside your Minecraft network.

## Components

### Proxy plugin

Path: `minecraft-plugins/mgu-store-proxy`

Responsibilities:

- Generates and stores shared key
- Accepts signed TCP requests from backend
- Exposes connectivity utility actions (`PING`, `LIST_SERVERS`)
- Forwards payload actions to target backend servers over plugin messaging

### Spigot/Paper plugin

Path: `minecraft-plugins/mgu-store-spigot`

Responsibilities:

- Receives signed plugin messages
- Verifies signature, timestamp, nonce
- Executes payload commands after placeholder expansion

## Command source of truth

- All grant/revoke commands are configured in admin dashboard `Postpurchase Actions`.
- Backend reads these actions from DB and sends them in fulfillment payload.
- Proxy and spigot execute payload actions; no static rank command maps required.

## Build

Proxy:

```bash
cd minecraft-plugins/mgu-store-proxy
mvn -DskipTests package
```

Spigot:

```bash
cd minecraft-plugins/mgu-store-spigot
mvn -DskipTests package
```

Artifacts:

- `minecraft-plugins/mgu-store-proxy/target/mgu-store-proxy-1.0.0.jar`
- `minecraft-plugins/mgu-store-spigot/target/mgu-store-spigot-1.0.0-shaded.jar`

## Install summary

1. Proxy jar -> proxy `plugins/`
2. Spigot jar -> each backend server `plugins/`
3. Start proxy once to generate key
4. Copy key to:

- backend `.env` as `PROXY_PLUGIN_KEY`
- spigot `config.yml` as `messaging.key`

## Security checklist

- Use `hmac` auth mode
- Restrict proxy TCP listener to backend IP(s)
- Keep shared key secret
- Do not expose listener port publicly

For detailed plugin setup, read:

- `minecraft-plugins/mgu-store-proxy/README.md`
- `minecraft-plugins/mgu-store-spigot/README.md`
