const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const adminCmsRoutes = require("./adminCmsRoutes");
const Admin = require("../models/adminModel");
const Purchase = require("../models/purchaseModel");
const {
    getProxyConnectivityStatus,
    listProxyServers,
    dispatchFulfillmentToProxy,
} = require("../utils/proxyPluginClient");
const {
    getStoreProductById,
} = require("../services/cmsCatalogService");
const {
    ACTION_KIND_PURCHASE,
    ACTION_KIND_REVOKE,
    REVOKE_ACTION_PRODUCT_CODE,
    listPostPurchaseActionsForAdmin,
    listPostPurchaseProductOptions,
    createPostPurchaseAction,
    updatePostPurchaseActionById,
    deletePostPurchaseActionById,
    getActivePurchaseActionsByProductId,
    getActiveRevokeActions,
} = require("../services/postPurchaseActionService");
const {
    isValidMinecraftUsername,
    getPurchasableProductByCode,
    listPurchasableProducts,
} = require("../services/purchasableProductService");
const {
    listStorePromotionsForAdmin,
    createStorePromotion,
    updateStorePromotionById,
    deleteStorePromotionById,
} = require("../services/storePromotionService");
require("dotenv").config();

const router = express.Router();
router.use(express.json());

// 🔐 Admin Login
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    Admin.findByEmail(email, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const admin = results[0];

        bcrypt.compare(password, admin.password, (err, isMatch) => {
            if (isMatch) {
                const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
                res.json({ token });
            } else {
                res.status(401).json({ error: "Invalid credentials" });
            }
        });
    });
});

// 🧩 Admin CMS CRUD
router.use("/cms", authMiddleware, adminCmsRoutes);

// 📋 Backward-compatible endpoint (now returns player_ranks rows)
router.get("/purchases", authMiddleware, (req, res) => {
    Purchase.purgeExpiredSubscriptions(() => { });
    Purchase.getAllPlayerRanks((err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// 👤 Get Player Ranks (one row per username)
router.get("/player-ranks", authMiddleware, (req, res) => {
    Purchase.purgeExpiredSubscriptions(() => { });
    Purchase.getAllPlayerRanks((err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

// 📊 Revenue + summary KPI cards
router.get("/dashboard/summary", authMiddleware, (req, res) => {
    Purchase.getRevenueSummary((err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const s = rows && rows.length ? rows[0] : {};
        return res.json({
            todayRevenue: Number(s.todayRevenue || 0),
            revenue7d: Number(s.revenue7d || 0),
            revenue30d: Number(s.revenue30d || 0),
        });
    });
});

// 🎯 Discounts and coupons - list
router.get("/discounts", authMiddleware, async (_req, res) => {
    try {
        const rows = await listStorePromotionsForAdmin();
        return res.json(rows);
    } catch (error) {
        console.error("Failed to load discounts:", error.message || error);
        return res.status(500).json({ error: "Failed to load discounts" });
    }
});

// 🎯 Discounts and coupons - create
router.post("/discounts", authMiddleware, async (req, res) => {
    try {
        const created = await createStorePromotion(req.body || {});
        return res.json(created);
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        if (statusCode >= 400 && statusCode < 500) {
            return res.status(statusCode).json({ error: error.message || "Invalid discount payload" });
        }

        console.error("Failed to create discount:", error.message || error);
        return res.status(500).json({ error: "Failed to create discount" });
    }
});

// 🎯 Discounts and coupons - update
router.put("/discounts/:id", authMiddleware, async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid discount id" });
    }

    try {
        const updated = await updateStorePromotionById(id, req.body || {});
        if (!updated) {
            return res.status(404).json({ error: "Discount not found" });
        }

        return res.json(updated);
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        if (statusCode >= 400 && statusCode < 500) {
            return res.status(statusCode).json({ error: error.message || "Invalid discount payload" });
        }

        console.error("Failed to update discount:", error.message || error);
        return res.status(500).json({ error: "Failed to update discount" });
    }
});

// 🎯 Discounts and coupons - delete
router.delete("/discounts/:id", authMiddleware, async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid discount id" });
    }

    try {
        const deleted = await deleteStorePromotionById(id);
        if (!deleted) {
            return res.status(404).json({ error: "Discount not found" });
        }

        return res.json({ ok: true, id: deleted.id });
    } catch (error) {
        console.error("Failed to delete discount:", error.message || error);
        return res.status(500).json({ error: "Failed to delete discount" });
    }
});

// 📋 Active subscriptions table
router.get("/subscriptions/active", authMiddleware, (req, res) => {
    Purchase.purgeExpiredSubscriptions(() => { });
    Purchase.getActiveSubscriptions((err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(rows || []);
    });
});

// 📋 Expired subscriptions table
router.get("/subscriptions/expired", authMiddleware, (req, res) => {
    Purchase.getExpiredSubscriptions((err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(rows || []);
    });
});

// 📋 Permanent rank purchases table
router.get("/purchases/permanent", authMiddleware, (req, res) => {
    Purchase.getPermanentPurchases((err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(rows || []);
    });
});

// 📋 Active permanent ranks (current owners only; revoked users are absent)
router.get("/ranks/permanent/active", authMiddleware, (req, res) => {
    Purchase.getActivePermanentRanks((err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(rows || []);
    });
});

// 🔍 Search player
router.get("/players/search", authMiddleware, (req, res) => {
    const q = String(req.query.username || "").trim();
    if (!q) return res.json([]);

    Purchase.searchPlayerRank(q, (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(rows || []);
    });
});

// 🧪 Proxy connectivity status
router.get("/proxy/status", authMiddleware, async (req, res) => {
    const status = await getProxyConnectivityStatus();
    return res.json(status);
});

// 🧪 Proxy connectivity tester (active test)
router.post("/proxy/test", authMiddleware, async (req, res) => {
    const status = await getProxyConnectivityStatus();
    return res.json(status);
});

// 🖧 Fetch server list from proxy plugin
router.get("/proxy/servers", authMiddleware, async (req, res) => {
    try {
        const servers = await listProxyServers();
        return res.json({ servers });
    } catch (e) {
        return res.status(500).json({ error: e?.message || "Failed to fetch proxy servers" });
    }
});

// ⚙️ Postpurchase actions - list
router.get("/postpurchase-actions", authMiddleware, async (_req, res) => {
    try {
        const rows = await listPostPurchaseActionsForAdmin();
        return res.json(rows);
    } catch (error) {
        console.error("Failed to load postpurchase actions:", error.message || error);
        return res.status(500).json({ error: "Failed to load postpurchase actions" });
    }
});

// ⚙️ Postpurchase actions - product options (CMS-backed)
router.get("/postpurchase-products", authMiddleware, async (_req, res) => {
    try {
        const products = await listPostPurchaseProductOptions();
        return res.json({ products });
    } catch (error) {
        console.error("Failed to load postpurchase product options:", error.message || error);
        return res.status(500).json({ error: "Failed to load postpurchase product options" });
    }
});

async function validateActionInput({ productId, serverName, commandsText, isRevokeAction }) {
    if (!serverName || !String(serverName).trim()) {
        return { error: "serverName is required" };
    }

    if (!commandsText || !String(commandsText).trim()) {
        return { error: "At least one command is required" };
    }

    if (isRevokeAction) {
        return { error: null, product: null };
    }

    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId || !mongoose.Types.ObjectId.isValid(normalizedProductId)) {
        return { error: "productId must be a valid CMS product id" };
    }

    const product = await getStoreProductById(normalizedProductId, { includeInactive: true });
    if (!product) {
        return { error: "Selected CMS product does not exist" };
    }

    return { error: null, product };
}

function parseCommandsText(commandsText) {
    if (!commandsText) return [];
    return String(commandsText)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

// ⚙️ Postpurchase actions - create
router.post("/postpurchase-actions", authMiddleware, async (req, res) => {
    const { productId, serverName, commandsText, isActive, isRevokeAction } = req.body || {};

    let validation;
    try {
        validation = await validateActionInput({
            productId,
            serverName,
            commandsText,
            isRevokeAction: !!isRevokeAction,
        });
    } catch (error) {
        console.error("Postpurchase action validation failed:", error.message || error);
        return res.status(500).json({ error: "Failed to validate postpurchase action" });
    }

    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const actionKind = isRevokeAction ? ACTION_KIND_REVOKE : ACTION_KIND_PURCHASE;
    const product = validation.product;

    try {
        const created = await createPostPurchaseAction({
            actionKind,
            productId: actionKind === ACTION_KIND_PURCHASE ? product.id : "",
            productCategory: actionKind === ACTION_KIND_PURCHASE ? product.category : "",
            productCodeSnapshot: actionKind === ACTION_KIND_PURCHASE ? product.code : REVOKE_ACTION_PRODUCT_CODE,
            productNameSnapshot: actionKind === ACTION_KIND_PURCHASE ? product.name : "",
            serverName: String(serverName).trim(),
            commandsText: String(commandsText).trim(),
            isActive: isActive !== false,
        });

        return res.json({ ok: true, id: created?.id || null });
    } catch (error) {
        console.error("Failed to create postpurchase action:", error.message || error);
        return res.status(500).json({ error: "Failed to create postpurchase action" });
    }
});

// ⚙️ Postpurchase actions - update
router.put("/postpurchase-actions/:id", authMiddleware, async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid action id" });
    }

    const { productId, serverName, commandsText, isActive, isRevokeAction } = req.body || {};

    let validation;
    try {
        validation = await validateActionInput({
            productId,
            serverName,
            commandsText,
            isRevokeAction: !!isRevokeAction,
        });
    } catch (error) {
        console.error("Postpurchase action validation failed:", error.message || error);
        return res.status(500).json({ error: "Failed to validate postpurchase action" });
    }

    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    const actionKind = isRevokeAction ? ACTION_KIND_REVOKE : ACTION_KIND_PURCHASE;
    const product = validation.product;

    try {
        const updated = await updatePostPurchaseActionById(id, {
            actionKind,
            productId: actionKind === ACTION_KIND_PURCHASE ? product.id : "",
            productCategory: actionKind === ACTION_KIND_PURCHASE ? product.category : "",
            productCodeSnapshot: actionKind === ACTION_KIND_PURCHASE ? product.code : REVOKE_ACTION_PRODUCT_CODE,
            productNameSnapshot: actionKind === ACTION_KIND_PURCHASE ? product.name : "",
            serverName: String(serverName).trim(),
            commandsText: String(commandsText).trim(),
            isActive: isActive !== false,
        });

        if (!updated) {
            return res.status(404).json({ error: "Action not found" });
        }

        return res.json({ ok: true });
    } catch (error) {
        console.error("Failed to update postpurchase action:", error.message || error);
        return res.status(500).json({ error: "Failed to update postpurchase action" });
    }
});

// ⚙️ Postpurchase actions - delete
router.delete("/postpurchase-actions/:id", authMiddleware, async (req, res) => {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid action id" });
    }

    try {
        const deleted = await deletePostPurchaseActionById(id);
        if (!deleted) {
            return res.status(404).json({ error: "Action not found" });
        }
        return res.json({ ok: true });
    } catch (error) {
        console.error("Failed to delete postpurchase action:", error.message || error);
        return res.status(500).json({ error: "Failed to delete postpurchase action" });
    }
});

// 🎁 Manual grant
router.post("/manual/grant", authMiddleware, async (req, res) => {
    const { username, productCode } = req.body || {};
    const u = String(username || "").trim();

    let product;
    try {
        product = await getPurchasableProductByCode(productCode, {
            includeInactive: true,
            categories: ["ranks"],
        });
    } catch (error) {
        console.error("Failed to resolve manual grant product:", error.message || error);
        return res.status(500).json({ error: "Failed to resolve product" });
    }

    if (!isValidMinecraftUsername(u)) {
        return res.status(400).json({ error: "Invalid Minecraft username" });
    }
    if (!product) {
        return res.status(400).json({ error: "Invalid productCode" });
    }

    const rankType = product.type === "rank_subscription_30d" ? "subscription" : "permanent";
    const orderId = `manual_${crypto.randomBytes(8).toString("hex")}`;

    Purchase.createPaymentTransaction(
        {
            orderId,
            username: u,
            productCode: product.code,
            rank: product.displayName,
            rankType,
            amount: Number(product.amount || 0),
            currency: product.currency || "INR",
            mode: "buy",
        },
        (txErr) => {
            if (txErr) return res.status(500).json({ error: "Database error" });

            Purchase.upsertPlayerRank({ username: u, rank: product.displayName, rankType }, async (err) => {
                if (err) return res.status(500).json({ error: "Database error" });

                try {
                    const postActions = product?.id
                        ? await getActivePurchaseActionsByProductId(product.id)
                        : [];

                    const actions = postActions
                        .map((row) => ({
                            server: String(row.serverName || "").trim(),
                            commands: parseCommandsText(row.commandsText),
                        }))
                        .filter((a) => a.server && a.commands.length > 0);

                    if (actions.length > 0) {
                        await dispatchFulfillmentToProxy({
                            orderId,
                            username: u,
                            productCode: product.code,
                            productType: product.type,
                            rank: product.displayName,
                            amount: Number(product.amount || 0),
                            currency: product.currency || "INR",
                            actions,
                        });
                        return res.json({ ok: true, orderId, dispatched: true });
                    }

                    return res.json({ ok: true, orderId, dispatched: false });
                } catch (e) {
                    return res.json({
                        ok: true,
                        orderId,
                        dispatched: false,
                        warning:
                            e?.message ||
                            "Rank and transaction saved, but proxy dispatch failed. Check proxy connectivity and action configuration.",
                    });
                }
            });
        }
    );
});

// 🗑️ Manual revoke
router.post("/manual/revoke", authMiddleware, (req, res) => {
    const { username, revokeActionId, applyRevokeActions } = req.body || {};
    const u = String(username || "").trim();
    const selectedRevokeActionId = String(revokeActionId || "").trim();

    if (!isValidMinecraftUsername(u)) {
        return res.status(400).json({ error: "Invalid Minecraft username" });
    }

    if (selectedRevokeActionId && !mongoose.Types.ObjectId.isValid(selectedRevokeActionId)) {
        return res.status(400).json({ error: "Invalid revoke action id" });
    }

    Purchase.getPlayerRank(u, (rankErr, rankRows) => {
        if (rankErr) return res.status(500).json({ error: "Database error" });

        const existingRank = rankRows && rankRows.length ? rankRows[0] : null;

        Purchase.revokePlayerRank(u, async (err) => {
            if (err) return res.status(500).json({ error: "Database error" });

            const shouldApplyRevokeActions = applyRevokeActions !== false;
            if (!shouldApplyRevokeActions) {
                return res.json({ ok: true, revoked: true, dispatched: false });
            }

            try {
                const revokeRows = await getActiveRevokeActions({
                    actionId: selectedRevokeActionId || null,
                });

                const actions = revokeRows
                    .map((row) => ({
                        server: String(row.serverName || "").trim(),
                        commands: parseCommandsText(row.commandsText),
                    }))
                    .filter((a) => a.server && a.commands.length > 0);

                if (actions.length === 0) {
                    return res.json({ ok: true, revoked: true, dispatched: false });
                }

                const orderId = `revoke_${crypto.randomBytes(8).toString("hex")}`;
                await dispatchFulfillmentToProxy({
                    orderId,
                    username: u,
                    productCode: REVOKE_ACTION_PRODUCT_CODE,
                    productType: "revoke_action",
                    rank: existingRank?.rank || "NONE",
                    amount: 0,
                    currency: "INR",
                    actions,
                });

                return res.json({ ok: true, revoked: true, dispatched: true, orderId });
            } catch (e) {
                return res.json({
                    ok: true,
                    revoked: true,
                    dispatched: false,
                    warning:
                        e?.message ||
                        "Rank revoked, but revoke-action dispatch failed. Check proxy connectivity.",
                });
            }
        });
    });
});

// Utility for dashboard dropdowns
router.get("/products", authMiddleware, async (_req, res) => {
    try {
        const products = await listPurchasableProducts({
            includeInactive: true,
            categories: ["ranks"],
        });
        return res.json({ products });
    } catch (error) {
        console.error("Failed to load product options:", error.message || error);
        return res.status(500).json({ error: "Failed to load products" });
    }
});

module.exports = router;
