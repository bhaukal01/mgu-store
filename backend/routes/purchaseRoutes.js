const express = require("express");
const Purchase = require("../models/purchaseModel");
const axios = require("axios");
require("dotenv").config();

const {
    PRODUCTS,
    LIFETIME_RANK_ORDER,
    getProductOrNull,
    isValidMinecraftUsername,
    isLifetimeRank,
    getLifetimeRankIndex,
} = require("../config/products");

const { dispatchFulfillmentToProxy } = require("../utils/proxyPluginClient");

const router = express.Router();
router.use(express.json());

const PRODUCT_KEYS = Object.keys(PRODUCTS);
const processingOrders = new Map();
const completedOrders = new Set();

function encodeProductIndex(productCode) {
    const idx = PRODUCT_KEYS.indexOf(productCode);
    if (idx < 0) throw new Error("Unknown product code");
    return idx.toString(36);
}

function decodeProductIndex(token) {
    const idx = Number.parseInt(String(token), 36);
    if (!Number.isFinite(idx) || idx < 0 || idx >= PRODUCT_KEYS.length) return null;
    return PRODUCT_KEYS[idx];
}

function encodeLifetimeRank(rankName) {
    if (!rankName || rankName === "NONE") return "x";
    const idx = getLifetimeRankIndex(rankName);
    if (idx < 0) throw new Error("Unsupported rank upgrade");
    return idx.toString(36);
}

function decodeLifetimeRank(token) {
    if (!token || token === "x") return "NONE";
    const idx = Number.parseInt(String(token), 36);
    if (!Number.isFinite(idx) || idx < 0) return null;
    return LIFETIME_RANK_ORDER[idx] || null;
}

function buildCashfreeOrderId({ username, productCode, fromLifetimeRank, mode }) {
    const nonce = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36);
    const productToken = encodeProductIndex(productCode);
    const fromToken = encodeLifetimeRank(fromLifetimeRank || "NONE");
    const modeToken = mode === "rankup" ? "r" : "b";
    const orderId = `MG2.${ts}.${nonce}.${username}.${productToken}.${fromToken}.${modeToken}`;

    if (orderId.length > 64) {
        throw new Error("Generated orderId too long");
    }
    return orderId;
}

function parseCashfreeOrderId(orderId) {
    if (typeof orderId !== "string" || !orderId.startsWith("MG2.")) return null;
    const parts = orderId.split(".");
    if (parts.length < 7) return null;

    const username = parts[3];
    const productCode = decodeProductIndex(parts[4]);
    const fromLifetimeRank = decodeLifetimeRank(parts[5]);
    const mode = parts[6] === "r" ? "rankup" : "buy";

    if (!productCode || fromLifetimeRank === null) return null;
    return { username, productCode, fromLifetimeRank, mode };
}

// Throttle Cashfree lookups per orderId to avoid hammering API from status polling.
const cfStatusCheckCache = new Map();
function shouldCheckCashfreeNow(orderId, minIntervalMs) {
    const now = Date.now();
    const last = cfStatusCheckCache.get(orderId) || 0;
    if (now - last < minIntervalMs) return false;
    cfStatusCheckCache.set(orderId, now);
    return true;
}

function rankTypeForProduct(product) {
    return product.type === "rank_subscription_30d" ? "subscription" : "permanent";
}

function parseCommandsText(commandsText) {
    if (!commandsText) return [];
    return String(commandsText)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function cleanAndGetPlayerRank(username) {
    return new Promise((resolve, reject) => {
        Purchase.purgeExpiredSubscriptions((cleanupErr) => {
            if (cleanupErr) return reject(cleanupErr);
            Purchase.getPlayerRank(username, (err, rows) => {
                if (err) return reject(err);
                resolve(rows && rows.length ? rows[0] : null);
            });
        });
    });
}

router.get("/user-ranks", async (req, res) => {
    const username = String(req.query.username || "").trim();
    if (!isValidMinecraftUsername(username)) {
        return res.status(400).json({ error: "Invalid Minecraft username" });
    }

    try {
        const playerRow = await cleanAndGetPlayerRank(username);

        const lifetimeRank = playerRow?.rank_type === "permanent" ? playerRow.rank : null;
        const subscriptionRank = playerRow?.rank_type === "subscription" ? playerRow.rank : null;

        return res.json({
            username,
            lifetimeRank,
            subscriptionRank,
            rank: playerRow?.rank || null,
            rankType: playerRow?.rank_type || null,
            purchaseDate: playerRow?.purchase_date || null,
            purchaseTime: playerRow?.purchase_time || null,
        });
    } catch (error) {
        console.error("❌ /user-ranks Error:", error.message || error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

async function getCurrentLifetimeRankForUsername(username) {
    const playerRow = await cleanAndGetPlayerRank(username);
    if (!playerRow) return null;
    if (playerRow.rank_type !== "permanent") return null;
    return String(playerRow.rank || "").trim() || null;
}

function computeExpectedAmount({ product, fromLifetimeRank }) {
    if (!product) throw new Error("Missing product");
    if (!isLifetimeRank(product)) return Number(product.amount);

    const from = String(fromLifetimeRank || "NONE").trim();
    if (!from || from === "NONE") return Number(product.amount);

    const currentIdx = getLifetimeRankIndex(from);
    const targetIdx = getLifetimeRankIndex(product.displayName);

    if (currentIdx === -1 || targetIdx === -1) {
        throw new Error("Unsupported rank upgrade");
    }
    if (targetIdx <= currentIdx) {
        throw new Error("You already have this rank or higher");
    }

    const currentProduct = getProductOrNull(from);
    if (!currentProduct) {
        throw new Error("Unsupported rank upgrade");
    }

    const amount = Number(product.amount) - Number(currentProduct.amount) - 1;
    if (!Number.isFinite(amount) || amount < 1) {
        throw new Error("Invalid upgrade price");
    }
    return amount;
}

function getCashfreeBaseUrl() {
    return process.env.CASHFREE_TEST_MODE === "true"
        ? "https://sandbox.cashfree.com"
        : "https://api.cashfree.com";
}

async function cashfreeCreateOrder({ orderId, amount, currency, username }) {
    const baseUrl = getCashfreeBaseUrl();
    const url = `${baseUrl}/pg/orders`;

    const paymentData = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
            customer_id: username,
            customer_name: username,
            customer_phone: process.env.CASHFREE_DEFAULT_PHONE || "9999999999",
        },
    };

    const response = await axios.post(url, paymentData, {
        headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
            "x-api-version": "2022-09-01",
        },
        timeout: 15000,
    });

    return response.data;
}

async function cashfreeGetOrder(orderId) {
    const baseUrl = getCashfreeBaseUrl();
    const url = `${baseUrl}/pg/orders/${encodeURIComponent(orderId)}`;

    const response = await axios.get(url, {
        headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
            "x-api-version": "2022-09-01",
        },
        timeout: 15000,
    });

    return response.data;
}

// 🛒 Create a purchase order (server-owned pricing)
router.post("/buy", async (req, res) => {
    const { username, productCode, mode } = req.body;
    const purchaseMode = mode === "rankup" ? "rankup" : "buy";

    if (!isValidMinecraftUsername(username)) {
        return res.status(400).json({ error: "Invalid Minecraft username" });
    }

    const product = getProductOrNull(productCode);
    if (!product) {
        return res.status(400).json({ error: "Invalid product" });
    }

    try {
        const existing = await cleanAndGetPlayerRank(username);

        if (purchaseMode === "buy" && existing) {
            return res.status(400).json({ error: `This username already owns a rank (${existing.rank}). Use RankUp.` });
        }

        if (purchaseMode === "rankup") {
            if (!existing) {
                return res.status(400).json({ error: "No existing rank found. Please buy a rank first." });
            }
            if (existing.rank_type !== "permanent") {
                return res.status(400).json({ error: "Subscription ranks are not valid for rank upgrades." });
            }
            if (!isLifetimeRank(product)) {
                return res.status(400).json({ error: "RankUp supports lifetime ranks only." });
            }
        }

        let amount = product.amount;
        let fromLifetimeRank = "NONE";

        if (purchaseMode === "rankup") {
            const current = await getCurrentLifetimeRankForUsername(username);
            if (current) fromLifetimeRank = current;

            try {
                amount = computeExpectedAmount({ product, fromLifetimeRank });
            } catch (e) {
                return res.status(400).json({ error: e.message || "Invalid rank upgrade" });
            }
        }

        const orderId = buildCashfreeOrderId({
            username,
            productCode: product.code,
            fromLifetimeRank,
            mode: purchaseMode,
        });

        const cf = await cashfreeCreateOrder({
            orderId,
            amount,
            currency: product.currency,
            username,
        });

        if (!cf?.payment_session_id) {
            console.error("❌ Cashfree Response Error:", cf);
            return res.status(500).json({ error: "Failed to generate payment session" });
        }

        // Customer pays; completion is verified server-side via webhook + order fetch.
        return res.json({
            orderId,
            paymentSessionId: cf.payment_session_id,
            amount,
            currency: product.currency,
        });
    } catch (error) {
        console.error("❌ /buy Error:", error.response?.data || error.message);
        return res.status(500).json({ error: "Payment gateway error" });
    }
});

async function applyPaidOrder(orderId) {
    if (completedOrders.has(orderId)) return { status: "completed" };
    if (processingOrders.has(orderId)) return processingOrders.get(orderId);

    const run = (async () => {
        const cfOrder = await cashfreeGetOrder(orderId);
        const cfStatus = cfOrder?.order_status;

        if (cfStatus !== "PAID") return { status: "processing" };

        const parsed = parseCashfreeOrderId(orderId);
        if (!parsed || !isValidMinecraftUsername(parsed.username)) {
            throw new Error("Invalid order");
        }

        const product = getProductOrNull(parsed.productCode);
        if (!product) throw new Error("Invalid product");

        const expectedAmount = computeExpectedAmount({
            product,
            fromLifetimeRank: parsed.fromLifetimeRank,
        });

        const cfAmount = Number(cfOrder?.order_amount);
        const cfCurrency = cfOrder?.order_currency;
        if (cfCurrency !== product.currency || cfAmount !== Number(expectedAmount)) {
            throw new Error("Order mismatch");
        }

        await new Promise((resolve, reject) => {
            Purchase.purgeExpiredSubscriptions((err) => (err ? reject(err) : resolve()));
        });

        const existing = await new Promise((resolve, reject) => {
            Purchase.getPlayerRank(parsed.username, (err, rows) => {
                if (err) return reject(err);
                resolve(rows && rows.length ? rows[0] : null);
            });
        });

        if (parsed.mode === "buy" && existing) {
            // For webhook retries after a completed order, this makes the path idempotent.
            if (
                existing.rank === product.displayName &&
                existing.rank_type === rankTypeForProduct(product)
            ) {
                completedOrders.add(orderId);
                return { status: "completed" };
            }

            // Respect the rule: normal buy cannot override an existing owned rank.
            throw new Error(`This username already owns a rank (${existing.rank}). Use RankUp.`);
        }

        if (parsed.mode === "rankup") {
            if (!existing) {
                throw new Error("No existing rank found. Please buy a rank first.");
            }
            if (existing.rank_type !== "permanent") {
                throw new Error("Subscription ranks are not valid for rank upgrades.");
            }

            // Idempotency for webhook/status retries after the same rankup already applied.
            if (
                existing.rank === product.displayName &&
                existing.rank_type === rankTypeForProduct(product)
            ) {
                completedOrders.add(orderId);
                return { status: "completed" };
            }
        }

        // Persist immediately on PAID (as requested), before fulfillment.
        await new Promise((resolve, reject) => {
            Purchase.createPaymentTransaction(
                {
                    orderId,
                    username: parsed.username,
                    productCode: product.code,
                    rank: product.displayName,
                    rankType: rankTypeForProduct(product),
                    amount: Number(expectedAmount),
                    currency: product.currency,
                    mode: parsed.mode,
                },
                (err) => (err ? reject(err) : resolve())
            );
        });

        await new Promise((resolve, reject) => {
            Purchase.upsertPlayerRank(
                {
                    username: parsed.username,
                    rank: product.displayName,
                    rankType: rankTypeForProduct(product),
                },
                (err) => (err ? reject(err) : resolve())
            );
        });
        console.log("✅ Saved PAID rank to DB", {
            orderId,
            username: parsed.username,
            rank: product.displayName,
            rankType: rankTypeForProduct(product),
        });

        const postActions = await new Promise((resolve, reject) => {
            Purchase.getPostPurchaseActionsByProduct(product.code, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        const serverActions = postActions
            .map((row) => ({
                server: String(row.server_name || "").trim(),
                commands: parseCommandsText(row.commands_text),
            }))
            .filter((a) => a.server && Array.isArray(a.commands) && a.commands.length > 0);

        await dispatchFulfillmentToProxy({
            orderId,
            username: parsed.username,
            productCode: product.code,
            productType: product.type,
            rank: product.displayName,
            amount: Number(expectedAmount),
            currency: product.currency,
            actions: serverActions,
        });

        completedOrders.add(orderId);
        return { status: "completed" };
    })();

    processingOrders.set(orderId, run);
    try {
        return await run;
    } finally {
        processingOrders.delete(orderId);
    }
}

// Poll order status from frontend (never grants anything)
router.get("/status/:orderId", async (req, res) => {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    try {
        if (!shouldCheckCashfreeNow(orderId, 2500)) {
            return res.json({ order_id: orderId, status: completedOrders.has(orderId) ? "completed" : "processing" });
        }

        const result = await applyPaidOrder(orderId);
        return res.json({ order_id: orderId, status: result.status });
    } catch (e) {
        if (e?.response?.status === 404) {
            return res.status(404).json({ error: "Order not found" });
        }
        const msg = e?.message || "Internal server error";
        if (msg === "Order mismatch" || msg === "Invalid order" || msg === "Invalid product") {
            return res.status(400).json({ error: msg });
        }
        if (msg.includes("already owns") || msg.includes("RankUp") || msg.includes("rank first") || msg.includes("Subscription ranks")) {
            return res.status(400).json({ error: msg });
        }
        return res.json({ order_id: orderId, status: "processing" });
    }
});

// ✅ Cashfree Webhook (source of truth) — we verify by fetching order status from Cashfree
router.post("/cashfree-webhook", async (req, res) => {
    try {
        const body = req.body || {};
        const order_id =
            body.order_id || body?.data?.order?.order_id || body?.order?.order_id;
        if (!order_id) return res.status(400).json({ error: "Missing order_id" });

        console.log("🔔 Cashfree webhook received", { orderId: order_id });

        try {
            await applyPaidOrder(order_id);
        } catch (e) {
            const msg = e?.message || "";
            if (
                msg === "Order mismatch" ||
                msg === "Invalid order" ||
                msg === "Invalid product" ||
                msg.includes("already owns") ||
                msg.includes("RankUp") ||
                msg.includes("rank first") ||
                msg.includes("Subscription ranks")
            ) {
                return res.json({ ok: true });
            }
            throw e;
        }
        return res.json({ ok: true });
    } catch (error) {
        console.error("❌ Webhook Processing Error:", error.response?.data || error.message || error);
        return res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;
