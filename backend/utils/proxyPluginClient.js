const net = require("net");
const crypto = require("crypto");

function getEnv(name, fallback) {
    const v = process.env[name];
    return v === undefined || v === "" ? fallback : v;
}

function hmacSha256Hex(key, data) {
    const normalizedKey = String(key || "").trim().replace(/^"|"$/g, "");
    const keyBytes = Buffer.from(normalizedKey, "base64");
    return crypto.createHmac("sha256", keyBytes).update(data, "utf8").digest("hex");
}

function buildMessage(action, payload) {
    const authMode = (getEnv("PROXY_PLUGIN_AUTH_MODE", "hmac") || "hmac").toLowerCase();
    const key = getEnv("PROXY_PLUGIN_KEY", "");

    if (authMode !== "plaintext" && !key) {
        throw new Error("Missing PROXY_PLUGIN_KEY (required for HMAC auth)");
    }

    const envelope = {
        action,
        payload,
    };

    if (authMode === "plaintext") {
        return {
            ...envelope,
            key,
            ts: Date.now(),
        };
    }

    // Default: HMAC auth (key is not sent over the wire)
    const ts = Date.now();
    const nonce = crypto.randomBytes(16).toString("hex");
    const body = JSON.stringify(envelope);
    const sigBase = `${ts}.${nonce}.${body}`;

    return {
        ts,
        nonce,
        body,
        sig: hmacSha256Hex(key, sigBase),
        algo: "HMAC-SHA256",
    };
}

function sendLineDelimitedJson({ host, port, message, timeoutMs }) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        let buffer = "";
        let done = false;

        const finish = (err, result) => {
            if (done) return;
            done = true;
            try {
                socket.destroy();
            } catch {
                // ignore
            }
            if (err) return reject(err);
            resolve(result);
        };

        socket.setTimeout(timeoutMs);

        socket.on("connect", () => {
            socket.write(`${JSON.stringify(message)}\n`);
        });

        socket.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
            const idx = buffer.indexOf("\n");
            if (idx === -1) return;

            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);

            if (!line) return;
            try {
                const parsed = JSON.parse(line);
                return finish(null, parsed);
            } catch (e) {
                return finish(new Error(`Proxy plugin returned non-JSON response: ${line}`));
            }
        });

        socket.on("timeout", () => finish(new Error("Proxy plugin request timed out")));
        socket.on("error", (err) => finish(err));
    });
}

async function dispatchFulfillmentToProxy({ orderId, username, productCode, productType, rank, amount, currency, actions }) {
    return sendProxyAction("FULFILL_PURCHASE", {
        orderId,
        username,
        productCode,
        productType,
        rank,
        amount,
        currency,
        actions: Array.isArray(actions) ? actions : [],
    });
}

async function sendProxyAction(action, payload) {
    const host = getEnv("PROXY_PLUGIN_HOST", "");
    const port = Number(getEnv("PROXY_PLUGIN_PORT", "0"));

    if (!host || !port) {
        throw new Error("Proxy plugin is not configured (missing PROXY_PLUGIN_HOST/PROXY_PLUGIN_PORT)");
    }

    const message = buildMessage(action, payload || {});

    const result = await sendLineDelimitedJson({
        host,
        port,
        message,
        timeoutMs: Number(getEnv("PROXY_PLUGIN_TIMEOUT_MS", "8000")),
    });

    if (!result || result.ok !== true) {
        const errMsg = result?.error || "Proxy plugin rejected fulfillment";
        const e = new Error(errMsg);
        e.details = result;
        throw e;
    }

    return result;
}

async function getProxyConnectivityStatus() {
    try {
        const result = await sendProxyAction("PING", {});
        return {
            ok: true,
            status: "online",
            details: result,
        };
    } catch (e) {
        return {
            ok: false,
            status: "offline",
            error: e?.message || "Proxy unreachable",
        };
    }
}

async function listProxyServers() {
    const result = await sendProxyAction("LIST_SERVERS", {});
    return Array.isArray(result?.servers) ? result.servers : [];
}

module.exports = {
    dispatchFulfillmentToProxy,
    getProxyConnectivityStatus,
    listProxyServers,
    sendProxyAction,
};
