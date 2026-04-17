-- Single-table rank system (latest design)
-- WARNING: This drops old rank-related tables. Take a backup before running in production.
DROP TABLE IF EXISTS purchases;
CREATE TABLE IF NOT EXISTS player_ranks (
    username VARCHAR(16) NOT NULL PRIMARY KEY,
    rank VARCHAR(64) NOT NULL,
    rank_type ENUM('permanent', 'subscription') NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_time TIME NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id VARCHAR(64) NOT NULL,
    username VARCHAR(16) NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    rank VARCHAR(64) NOT NULL,
    rank_type ENUM('permanent', 'subscription') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    mode ENUM('buy', 'rankup') NOT NULL DEFAULT 'buy',
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY idx_payment_transactions_order_id (order_id),
    KEY idx_payment_transactions_paid_at (paid_at),
    KEY idx_payment_transactions_username_paid_at (username, paid_at)
);
CREATE TABLE IF NOT EXISTS expired_subscriptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(16) NOT NULL,
    rank VARCHAR(64) NOT NULL,
    rank_type ENUM('subscription') NOT NULL DEFAULT 'subscription',
    purchase_date DATE NOT NULL,
    purchase_time TIME NOT NULL,
    expired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_expired_subscriptions_expired_at (expired_at),
    KEY idx_expired_subscriptions_username_expired_at (username, expired_at)
);
CREATE TABLE IF NOT EXISTS postpurchase_actions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_code VARCHAR(64) NOT NULL,
    server_name VARCHAR(64) NOT NULL,
    commands_text TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_postpurchase_actions_product_active (product_code, is_active),
    KEY idx_postpurchase_actions_server (server_name)
);
-- Optional: keep admins table for admin login
CREATE TABLE IF NOT EXISTS admins (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY idx_admins_email (email)
);