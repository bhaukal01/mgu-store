const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");
const Admin = require("../models/adminModel");
const Purchase = require("../models/purchaseModel");
const {
    PRODUCTS,
    getProductOrNull,
    isValidMinecraftUsername,
} = require("../config/products");
const {
    getProxyConnectivityStatus,
    listProxyServers,
    dispatchFulfillmentToProxy,
} = require("../utils/proxyPluginClient");
require("dotenv").config();

const router = express.Router();
router.use(express.json());

const REVOKE_ACTION_PRODUCT_CODE = "__REVOKE__";

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
router.get("/postpurchase-actions", authMiddleware, (req, res) => {
    Purchase.getPostPurchaseActions((err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(rows || []);
    });
});

function validateActionInput({ productCode, serverName, commandsText, isRevokeAction }) {
    if (!isRevokeAction) {
        const product = getProductOrNull(productCode);
        if (!product) return "Invalid productCode";
    }
    if (!serverName || !String(serverName).trim()) return "serverName is required";
    if (!commandsText || !String(commandsText).trim()) return "At least one command is required";
    return null;
}

function parseCommandsText(commandsText) {
    if (!commandsText) return [];
    return String(commandsText)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

// ⚙️ Postpurchase actions - create
router.post("/postpurchase-actions", authMiddleware, (req, res) => {
    const { productCode, serverName, commandsText, isActive, isRevokeAction } = req.body || {};
    const bad = validateActionInput({ productCode, serverName, commandsText, isRevokeAction: !!isRevokeAction });
    if (bad) return res.status(400).json({ error: bad });

    const targetProductCode = isRevokeAction
        ? REVOKE_ACTION_PRODUCT_CODE
        : String(productCode).trim();

    Purchase.createPostPurchaseAction(
        {
            productCode: targetProductCode,
            serverName: String(serverName).trim(),
            commandsText: String(commandsText).trim(),
            isActive: isActive !== false,
        },
        (err, result) => {
            if (err) return res.status(500).json({ error: "Database error" });
            return res.json({ ok: true, id: result?.insertId || null });
        }
    );
});

// ⚙️ Postpurchase actions - update
router.put("/postpurchase-actions/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid action id" });
    }

    const { productCode, serverName, commandsText, isActive, isRevokeAction } = req.body || {};
    const bad = validateActionInput({ productCode, serverName, commandsText, isRevokeAction: !!isRevokeAction });
    if (bad) return res.status(400).json({ error: bad });

    const targetProductCode = isRevokeAction
        ? REVOKE_ACTION_PRODUCT_CODE
        : String(productCode).trim();

    Purchase.updatePostPurchaseAction(
        {
            id,
            productCode: targetProductCode,
            serverName: String(serverName).trim(),
            commandsText: String(commandsText).trim(),
            isActive: isActive !== false,
        },
        (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            return res.json({ ok: true });
        }
    );
});

// ⚙️ Postpurchase actions - delete
router.delete("/postpurchase-actions/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid action id" });
    }

    Purchase.deletePostPurchaseAction(id, (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json({ ok: true });
    });
});

// 🎁 Manual grant
router.post("/manual/grant", authMiddleware, (req, res) => {
    const { username, productCode } = req.body || {};
    const u = String(username || "").trim();
    const product = getProductOrNull(productCode);

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
                    const postActions = await new Promise((resolve, reject) => {
                        Purchase.getPostPurchaseActionsByProduct(product.code, (e, rows) => {
                            if (e) return reject(e);
                            resolve(rows || []);
                        });
                    });

                    const actions = postActions
                        .map((row) => ({
                            server: String(row.server_name || "").trim(),
                            commands: parseCommandsText(row.commands_text),
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

    if (!isValidMinecraftUsername(u)) {
        return res.status(400).json({ error: "Invalid Minecraft username" });
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
                const revokeRows = await new Promise((resolve, reject) => {
                    Purchase.getPostPurchaseActionsByProduct(REVOKE_ACTION_PRODUCT_CODE, (e, rows) => {
                        if (e) return reject(e);
                        resolve(rows || []);
                    });
                });

                const selectedRows = Number.isFinite(Number(revokeActionId)) && Number(revokeActionId) > 0
                    ? revokeRows.filter((r) => Number(r.id) === Number(revokeActionId))
                    : revokeRows;

                const actions = selectedRows
                    .map((row) => ({
                        server: String(row.server_name || "").trim(),
                        commands: parseCommandsText(row.commands_text),
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
router.get("/products", authMiddleware, (req, res) => {
    return res.json({ products: Object.values(PRODUCTS) });
});

module.exports = router;
