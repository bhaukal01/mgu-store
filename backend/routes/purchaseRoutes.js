const express = require("express");
const Purchase = require("../models/purchaseModel");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const {
    isValidMinecraftUsername,
    isLifetimeRankProduct,
    listLifetimeRankProducts,
    listPurchasableProducts,
    getPurchasableProductByCode,
    getPurchasableProductById,
} = require("../services/purchasableProductService");
const {
    listVisibleStorePromotions,
    evaluateOrderPricing,
    saveCheckoutOrderContext,
    getCheckoutOrderContext,
    markCheckoutOrderContextCompleted,
    recordPromotionRedemptionFromContext,
} = require("../services/storePromotionService");

const { dispatchFulfillmentToProxy } = require("../utils/proxyPluginClient");
const {
    getActivePurchaseActionsByProductId,
} = require("../services/postPurchaseActionService");

const router = express.Router();
router.use(express.json());

const processingOrders = new Map();
const completedOrders = new Set();

function encodeFromLifetimeRank(rankName) {
    if (!rankName || rankName === "NONE") return "x";
    return Buffer.from(String(rankName), "utf8").toString("base64url");
}

function decodeFromLifetimeRank(token) {
    if (!token || token === "x") return "NONE";

    try {
        const decoded = Buffer.from(String(token), "base64url").toString("utf8");
        return decoded || null;
    } catch (_error) {
        return null;
    }
}

function buildCashfreeOrderId({ productId, fromLifetimeRank, mode }) {
    const nonce = Math.random().toString(36).slice(2, 6);
    const ts = Date.now().toString(36);
    const productToken = String(productId || "").trim();
    const fromToken = encodeFromLifetimeRank(fromLifetimeRank || "NONE");
    const modeToken = mode === "rankup" ? "r" : "b";
    const orderId = `MG3.${ts}.${nonce}.${productToken}.${fromToken}.${modeToken}`;

    if (orderId.length > 64) {
        throw new Error("Generated orderId too long");
    }
    return orderId;
}

function parseCashfreeOrderId(orderId) {
    if (typeof orderId !== "string" || !orderId.startsWith("MG3.")) return null;
    const parts = orderId.split(".");
    if (parts.length < 6) return null;

    const productId = String(parts[3] || "").trim();
    const fromLifetimeRank = decodeFromLifetimeRank(parts[4]);
    const mode = parts[5] === "r" ? "rankup" : "buy";

    if (!mongoose.Types.ObjectId.isValid(productId) || fromLifetimeRank === null) {
        return null;
    }

    return { productId, fromLifetimeRank, mode };
}

async function parseLegacyCashfreeOrderId(orderId) {
    if (typeof orderId !== "string" || !orderId.startsWith("MG2.")) return null;
    const parts = orderId.split(".");
    if (parts.length < 7) return null;

    const username = String(parts[3] || "").trim();
    const productIdx = Number.parseInt(String(parts[4]), 36);
    const fromToken = String(parts[5] || "").trim();
    const fromIdx = fromToken === "x" ? -1 : Number.parseInt(fromToken, 36);
    const mode = parts[6] === "r" ? "rankup" : "buy";

    if (!Number.isFinite(productIdx) || productIdx < 0) return null;
    if (fromIdx < -1) return null;

    const rankProducts = await listPurchasableProducts({
        includeInactive: true,
        categories: ["ranks"],
    });
    const product = rankProducts[productIdx] || null;
    if (!product?.id) return null;

    const lifetimeRanks = await listLifetimeRankProducts({ includeInactive: true });
    const fromLifetimeRank =
        fromIdx === -1
            ? "NONE"
            : String(lifetimeRanks[fromIdx]?.displayName || "").trim() || null;

    if (fromLifetimeRank === null) return null;

    return {
        username,
        productId: product.id,
        fromLifetimeRank,
        mode,
    };
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

function isRankProduct(product) {
    return product?.category === "ranks";
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

router.get("/store-highlights", async (_req, res) => {
    try {
        const topSellingRows = await new Promise((resolve, reject) => {
            Purchase.getTopSellingRank((err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        const latestBuyerRows = await new Promise((resolve, reject) => {
            Purchase.getLatestBuyer((err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });

        const top = topSellingRows.length ? topSellingRows[0] : null;
        const latest = latestBuyerRows.length ? latestBuyerRows[0] : null;
        const ongoingDiscounts = await listVisibleStorePromotions();

        return res.json({
            topSellingRank: top
                ? {
                    rank: top.rank,
                    productCode: top.product_code,
                    salesCount: Number(top.sales_count || 0),
                    totalRevenue: Number(top.total_revenue || 0),
                    lastSoldAt: top.last_sold_at || null,
                }
                : null,
            lastBuyer: latest
                ? {
                    username: latest.username,
                    rank: latest.rank,
                    productCode: latest.product_code,
                    amount: Number(latest.amount || 0),
                    currency: latest.currency || "INR",
                    purchasedAt: latest.paid_at || null,
                }
                : null,
            ongoingDiscounts,
        });
    } catch (error) {
        console.error("❌ /store-highlights Error:", error.message || error);
        return res.status(500).json({ error: "Failed to load store highlights" });
    }
});

async function getCurrentLifetimeRankForUsername(username) {
    const playerRow = await cleanAndGetPlayerRank(username);
    if (!playerRow) return null;
    if (playerRow.rank_type !== "permanent") return null;
    return String(playerRow.rank || "").trim() || null;
}

async function computeExpectedAmount({ product, fromLifetimeRank }) {
    if (!product) throw new Error("Missing product");
    if (!isLifetimeRankProduct(product)) return Number(product.amount);

    const from = String(fromLifetimeRank || "NONE").trim();
    if (!from || from === "NONE") return Number(product.amount);

    const lifetimeProducts = await listLifetimeRankProducts({ includeInactive: true });

    const currentIdx = lifetimeProducts.findIndex(
        (item) => String(item.displayName || "").trim() === from
    );
    const targetIdx = lifetimeProducts.findIndex(
        (item) =>
            String(item.displayName || "").trim() ===
            String(product.displayName || "").trim()
    );

    if (currentIdx === -1 || targetIdx === -1) {
        throw new Error("Unsupported rank upgrade");
    }
    if (targetIdx <= currentIdx) {
        throw new Error("You already have this rank or higher");
    }

    const currentProduct = lifetimeProducts[currentIdx] || null;
    if (!currentProduct) {
        throw new Error("Unsupported rank upgrade");
    }

    const amount = Number(product.amount) - Number(currentProduct.amount) - 1;
    if (!Number.isFinite(amount) || amount < 1) {
        throw new Error("Invalid upgrade price");
    }
    return amount;
}

function normalizeCouponCode(value) {
    return String(value || "").trim().toUpperCase();
}

async function buildCheckoutQuote({ username, productCode, mode, couponCode }) {
    const normalizedUsername = String(username || "").trim();
    const purchaseMode = mode === "rankup" ? "rankup" : "buy";

    if (!isValidMinecraftUsername(normalizedUsername)) {
        throw Object.assign(new Error("Invalid Minecraft username"), { statusCode: 400 });
    }

    const product = await getPurchasableProductByCode(productCode, {
        includeInactive: false,
        categories: ["ranks"],
    });

    if (!product) {
        throw Object.assign(new Error("Invalid product"), { statusCode: 400 });
    }

    if (!isRankProduct(product)) {
        throw Object.assign(
            new Error("Only rank products are currently supported for checkout."),
            { statusCode: 400 }
        );
    }

    const existing = await cleanAndGetPlayerRank(normalizedUsername);

    if (purchaseMode === "buy" && existing) {
        throw Object.assign(
            new Error(`This username already owns a rank (${existing.rank}). Use RankUp.`),
            { statusCode: 400 }
        );
    }

    if (purchaseMode === "rankup") {
        if (!existing) {
            throw Object.assign(
                new Error("No existing rank found. Please buy a rank first."),
                { statusCode: 400 }
            );
        }
        if (existing.rank_type !== "permanent") {
            throw Object.assign(
                new Error("Subscription ranks are not valid for rank upgrades."),
                { statusCode: 400 }
            );
        }
        if (!isLifetimeRankProduct(product)) {
            throw Object.assign(
                new Error("RankUp supports lifetime ranks only."),
                { statusCode: 400 }
            );
        }
    }

    let baseAmount = Number(product.amount || 0);
    let fromLifetimeRank = "NONE";

    if (purchaseMode === "rankup") {
        const current = await getCurrentLifetimeRankForUsername(normalizedUsername);
        if (current) fromLifetimeRank = current;

        try {
            baseAmount = await computeExpectedAmount({ product, fromLifetimeRank });
        } catch (error) {
            throw Object.assign(new Error(error?.message || "Invalid rank upgrade"), {
                statusCode: 400,
            });
        }
    }

    const pricing = await evaluateOrderPricing({
        baseAmount,
        productCode: product.code,
        productCategory: product.category,
        username: normalizedUsername,
        couponCode: normalizeCouponCode(couponCode),
    });

    return {
        username: normalizedUsername,
        product,
        purchaseMode,
        fromLifetimeRank,
        baseAmount,
        amount: pricing.finalAmount,
        currency: product.currency,
        pricing,
    };
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

// 💬 Quote final amount with active discounts/coupons (no order creation)
router.post("/quote", async (req, res) => {
    const { username, productCode, mode, couponCode } = req.body || {};

    try {
        const quote = await buildCheckoutQuote({
            username,
            productCode,
            mode,
            couponCode,
        });

        return res.json({
            productCode: quote.product.code,
            productName: quote.product.displayName,
            mode: quote.purchaseMode,
            currency: quote.currency,
            baseAmount: quote.baseAmount,
            amount: quote.amount,
            discountAmount: quote.pricing.discountAmountTotal,
            discountAmountUpfront: quote.pricing.discountAmountUpfront,
            discountAmountAutomatic: quote.pricing.discountAmountAutomatic,
            discountAmountCoupon: quote.pricing.discountAmountCoupon,
            upfrontPromotion: quote.pricing.upfrontPromotion,
            automaticPromotion: quote.pricing.automaticPromotion,
            couponPromotion: quote.pricing.couponPromotion,
            couponCodeProvided: quote.pricing.couponCodeProvided,
            couponCodeApplied: quote.pricing.couponCodeApplied,
            couponIgnoredReason: quote.pricing.couponIgnoredReason,
            fromLifetimeRank: quote.fromLifetimeRank,
        });
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        if (statusCode >= 400 && statusCode < 500) {
            return res.status(statusCode).json({ error: error.message || "Invalid quote request" });
        }

        console.error("❌ /quote Error:", error.response?.data || error.message || error);
        return res.status(500).json({ error: "Failed to compute quote" });
    }
});

// 🛒 Create a purchase order (server-owned pricing)
router.post("/buy", async (req, res) => {
    const { username, productCode, mode, couponCode } = req.body || {};

    try {
        const quote = await buildCheckoutQuote({
            username,
            productCode,
            mode,
            couponCode,
        });

        const orderId = buildCashfreeOrderId({
            productId: quote.product.id,
            fromLifetimeRank: quote.fromLifetimeRank,
            mode: quote.purchaseMode,
        });

        const cf = await cashfreeCreateOrder({
            orderId,
            amount: quote.amount,
            currency: quote.currency,
            username: quote.username,
        });

        if (!cf?.payment_session_id) {
            console.error("❌ Cashfree Response Error:", cf);
            return res.status(500).json({ error: "Failed to generate payment session" });
        }

        await saveCheckoutOrderContext({
            orderId,
            username: quote.username,
            productId: quote.product.id,
            productCode: quote.product.code,
            mode: quote.purchaseMode,
            fromLifetimeRank: quote.fromLifetimeRank,
            currency: quote.currency,
            pricing: quote.pricing,
        });

        // Customer pays; completion is verified server-side via webhook + order fetch.
        return res.json({
            orderId,
            paymentSessionId: cf.payment_session_id,
            amount: quote.amount,
            currency: quote.currency,
            baseAmount: quote.baseAmount,
            discountAmount: quote.pricing.discountAmountTotal,
            discountAmountUpfront: quote.pricing.discountAmountUpfront,
            discountAmountAutomatic: quote.pricing.discountAmountAutomatic,
            discountAmountCoupon: quote.pricing.discountAmountCoupon,
            upfrontPromotion: quote.pricing.upfrontPromotion,
            automaticPromotion: quote.pricing.automaticPromotion,
            couponPromotion: quote.pricing.couponPromotion,
            couponCodeApplied: quote.pricing.couponCodeApplied,
            couponIgnoredReason: quote.pricing.couponIgnoredReason,
        });
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        if (statusCode >= 400 && statusCode < 500) {
            return res.status(statusCode).json({ error: error.message || "Invalid checkout request" });
        }

        console.error("❌ /buy Error:", error.response?.data || error.message || error);
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

        const orderContext = await getCheckoutOrderContext(orderId);
        const parsedFromOrderId = parseCashfreeOrderId(orderId) || (await parseLegacyCashfreeOrderId(orderId));

        const parsed = orderContext
            ? {
                productId: orderContext.productId,
                fromLifetimeRank: orderContext.fromLifetimeRank || "NONE",
                mode: orderContext.mode === "rankup" ? "rankup" : "buy",
                username: orderContext.username,
            }
            : parsedFromOrderId;

        const username = String(
            orderContext?.username ||
            parsed?.username ||
            cfOrder?.customer_details?.customer_id ||
            ""
        ).trim();

        if (!parsed || !isValidMinecraftUsername(username)) {
            throw new Error("Invalid order");
        }

        const product = await getPurchasableProductById(parsed.productId, {
            includeInactive: true,
            categories: ["ranks"],
        });
        if (!product) throw new Error("Invalid product");

        let expectedAmount;
        let expectedCurrency = String(product.currency || "INR").trim().toUpperCase();

        if (orderContext) {
            expectedAmount = Number(orderContext.finalAmount);
            if (!Number.isFinite(expectedAmount) || expectedAmount < 1) {
                throw new Error("Order mismatch");
            }

            const contextCurrency = String(orderContext.currency || "").trim().toUpperCase();
            if (contextCurrency) {
                expectedCurrency = contextCurrency;
            }
        } else {
            expectedAmount = await computeExpectedAmount({
                product,
                fromLifetimeRank: parsed.fromLifetimeRank,
            });
        }

        const cfAmount = Number(cfOrder?.order_amount);
        const cfCurrency = String(cfOrder?.order_currency || "").trim().toUpperCase();
        if (cfCurrency !== expectedCurrency || cfAmount !== Number(expectedAmount)) {
            throw new Error("Order mismatch");
        }

        await new Promise((resolve, reject) => {
            Purchase.purgeExpiredSubscriptions((err) => (err ? reject(err) : resolve()));
        });

        const existing = await new Promise((resolve, reject) => {
            Purchase.getPlayerRank(username, (err, rows) => {
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
                if (orderContext) {
                    await recordPromotionRedemptionFromContext({
                        orderId,
                        username,
                        productCode: product.code,
                        currency: expectedCurrency,
                        context: orderContext,
                    });
                    await markCheckoutOrderContextCompleted(orderId);
                }

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
                if (orderContext) {
                    await recordPromotionRedemptionFromContext({
                        orderId,
                        username,
                        productCode: product.code,
                        currency: expectedCurrency,
                        context: orderContext,
                    });
                    await markCheckoutOrderContextCompleted(orderId);
                }

                completedOrders.add(orderId);
                return { status: "completed" };
            }
        }

        // Persist immediately on PAID (as requested), before fulfillment.
        await new Promise((resolve, reject) => {
            Purchase.createPaymentTransaction(
                {
                    orderId,
                    username,
                    productCode: product.code,
                    rank: product.displayName,
                    rankType: rankTypeForProduct(product),
                    amount: Number(expectedAmount),
                    currency: expectedCurrency,
                    mode: parsed.mode,
                },
                (err) => (err ? reject(err) : resolve())
            );
        });

        if (orderContext) {
            await recordPromotionRedemptionFromContext({
                orderId,
                username,
                productCode: product.code,
                currency: expectedCurrency,
                context: orderContext,
            });
            await markCheckoutOrderContextCompleted(orderId);
        }

        await new Promise((resolve, reject) => {
            Purchase.upsertPlayerRank(
                {
                    username,
                    rank: product.displayName,
                    rankType: rankTypeForProduct(product),
                },
                (err) => (err ? reject(err) : resolve())
            );
        });
        console.log("✅ Saved PAID rank to DB", {
            orderId,
            username,
            rank: product.displayName,
            rankType: rankTypeForProduct(product),
        });

        const postActions = product?.id
            ? await getActivePurchaseActionsByProductId(product.id)
            : [];

        const serverActions = postActions
            .map((row) => ({
                server: String(row.serverName || "").trim(),
                commands: parseCommandsText(row.commandsText),
            }))
            .filter((a) => a.server && Array.isArray(a.commands) && a.commands.length > 0);

        await dispatchFulfillmentToProxy({
            orderId,
            username,
            productCode: product.code,
            productType: product.type,
            rank: product.displayName,
            amount: Number(expectedAmount),
            currency: expectedCurrency,
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
