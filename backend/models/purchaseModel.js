const db = require("../db");

const Purchase = {
    createPaymentTransaction: (
        {
            orderId,
            username,
            productCode,
            rank,
            rankType,
            amount,
            currency,
            mode,
        },
        callback
    ) => {
        db.query(
            "INSERT INTO payment_transactions (order_id, username, product_code, rank, rank_type, amount, currency, mode, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW()) " +
            "ON DUPLICATE KEY UPDATE username = VALUES(username), product_code = VALUES(product_code), rank = VALUES(rank), rank_type = VALUES(rank_type), amount = VALUES(amount), currency = VALUES(currency), mode = VALUES(mode)",
            [
                orderId,
                username,
                productCode,
                rank,
                rankType,
                Number(amount),
                currency,
                mode,
            ],
            callback
        );
    },

    purgeExpiredSubscriptions: (callback) => {
        db.query(
            "INSERT INTO expired_subscriptions (username, rank, rank_type, purchase_date, purchase_time, expired_at) " +
            "SELECT username, rank, rank_type, purchase_date, purchase_time, NOW() FROM player_ranks " +
            "WHERE rank_type = 'subscription' AND TIMESTAMP(purchase_date, purchase_time) < (NOW() - INTERVAL 30 DAY)",
            (insertErr) => {
                if (insertErr) return callback(insertErr);
                db.query(
                    "DELETE FROM player_ranks WHERE rank_type = 'subscription' AND TIMESTAMP(purchase_date, purchase_time) < (NOW() - INTERVAL 30 DAY)",
                    callback
                );
            }
        );
    },

    getPlayerRank: (username, callback) => {
        db.query(
            "SELECT username, rank, rank_type, purchase_date, purchase_time FROM player_ranks WHERE LOWER(username) = LOWER(?) LIMIT 1",
            [username],
            callback
        );
    },

    upsertPlayerRank: ({ username, rank, rankType }, callback) => {
        db.query(
            "INSERT INTO player_ranks (username, rank, rank_type, purchase_date, purchase_time) VALUES (?, ?, ?, CURDATE(), CURTIME()) " +
            "ON DUPLICATE KEY UPDATE rank = VALUES(rank), rank_type = VALUES(rank_type), purchase_date = VALUES(purchase_date), purchase_time = VALUES(purchase_time)",
            [username, rank, rankType],
            callback
        );
    },

    getAllPlayerRanks: (callback) => {
        db.query(
            "SELECT username, rank, rank_type, purchase_date, purchase_time FROM player_ranks ORDER BY purchase_date DESC, purchase_time DESC",
            callback
        );
    },

    searchPlayerRank: (username, callback) => {
        db.query(
            "SELECT username, rank, rank_type, purchase_date, purchase_time FROM player_ranks WHERE LOWER(username) LIKE LOWER(?) ORDER BY username ASC LIMIT 50",
            [`%${username}%`],
            callback
        );
    },

    revokePlayerRank: (username, callback) => {
        db.query(
            "DELETE FROM player_ranks WHERE LOWER(username) = LOWER(?)",
            [username],
            callback
        );
    },

    getRevenueSummary: (callback) => {
        db.query(
            "SELECT " +
            "COALESCE(SUM(CASE WHEN paid_at >= CURDATE() THEN amount ELSE 0 END), 0) AS todayRevenue, " +
            "COALESCE(SUM(CASE WHEN paid_at >= (NOW() - INTERVAL 7 DAY) THEN amount ELSE 0 END), 0) AS revenue7d, " +
            "COALESCE(SUM(CASE WHEN paid_at >= (NOW() - INTERVAL 30 DAY) THEN amount ELSE 0 END), 0) AS revenue30d " +
            "FROM payment_transactions",
            callback
        );
    },

    getTopSellingRank: (callback) => {
        db.query(
            "SELECT rank, product_code, COUNT(*) AS sales_count, SUM(amount) AS total_revenue, MAX(paid_at) AS last_sold_at " +
            "FROM payment_transactions " +
            "GROUP BY rank, product_code " +
            "ORDER BY sales_count DESC, total_revenue DESC, last_sold_at DESC " +
            "LIMIT 1",
            callback
        );
    },

    getLatestBuyer: (callback) => {
        db.query(
            "SELECT username, rank, product_code, amount, currency, paid_at " +
            "FROM payment_transactions " +
            "ORDER BY paid_at DESC, id DESC " +
            "LIMIT 1",
            callback
        );
    },

    getActiveSubscriptions: (callback) => {
        db.query(
            "SELECT username, rank, rank_type, purchase_date, purchase_time, " +
            "TIMESTAMP(purchase_date, purchase_time) AS purchased_at, " +
            "TIMESTAMP(purchase_date, purchase_time) + INTERVAL 30 DAY AS expires_at " +
            "FROM player_ranks WHERE rank_type = 'subscription' ORDER BY purchase_date DESC, purchase_time DESC",
            callback
        );
    },

    getExpiredSubscriptions: (callback) => {
        db.query(
            "SELECT id, username, rank, rank_type, purchase_date, purchase_time, expired_at FROM expired_subscriptions ORDER BY expired_at DESC LIMIT 500",
            callback
        );
    },

    getPermanentPurchases: (callback) => {
        db.query(
            "SELECT order_id, username, product_code, rank, amount, currency, paid_at FROM payment_transactions WHERE rank_type = 'permanent' ORDER BY paid_at DESC LIMIT 500",
            callback
        );
    },

    getActivePermanentRanks: (callback) => {
        db.query(
            "SELECT username, rank, rank_type, purchase_date, purchase_time FROM player_ranks WHERE rank_type = 'permanent' ORDER BY purchase_date DESC, purchase_time DESC",
            callback
        );
    },

    getPostPurchaseActions: (callback) => {
        db.query(
            "SELECT id, product_code, server_name, commands_text, is_active, created_at, updated_at FROM postpurchase_actions ORDER BY updated_at DESC, id DESC",
            callback
        );
    },

    getPostPurchaseActionsByProduct: (productCode, callback) => {
        db.query(
            "SELECT id, product_code, server_name, commands_text, is_active FROM postpurchase_actions WHERE product_code = ? AND is_active = 1 ORDER BY id ASC",
            [productCode],
            callback
        );
    },

    createPostPurchaseAction: ({ productCode, serverName, commandsText, isActive }, callback) => {
        db.query(
            "INSERT INTO postpurchase_actions (product_code, server_name, commands_text, is_active) VALUES (?, ?, ?, ?)",
            [productCode, serverName, commandsText, isActive ? 1 : 0],
            callback
        );
    },

    updatePostPurchaseAction: ({ id, productCode, serverName, commandsText, isActive }, callback) => {
        db.query(
            "UPDATE postpurchase_actions SET product_code = ?, server_name = ?, commands_text = ?, is_active = ? WHERE id = ?",
            [productCode, serverName, commandsText, isActive ? 1 : 0, Number(id)],
            callback
        );
    },

    deletePostPurchaseAction: (id, callback) => {
        db.query(
            "DELETE FROM postpurchase_actions WHERE id = ?",
            [Number(id)],
            callback
        );
    },
};

module.exports = Purchase;
