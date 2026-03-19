// Single source of truth for what can be purchased and for how much.
// The backend must NEVER trust price/rank coming from the client.

const PRODUCTS = {
    // Lifetime ranks
    VIP: { code: "VIP", displayName: "VIP", type: "rank_lifetime", amount: 199, currency: "INR" },
    "VIP+": { code: "VIP+", displayName: "VIP+", type: "rank_lifetime", amount: 399, currency: "INR" },
    Prince: { code: "Prince", displayName: "Prince", type: "rank_lifetime", amount: 649, currency: "INR" },
    King: { code: "King", displayName: "King", type: "rank_lifetime", amount: 1199, currency: "INR" },
    Emperor: { code: "Emperor", displayName: "Emperor", type: "rank_lifetime", amount: 1899, currency: "INR" },
    Deity: { code: "Deity", displayName: "Deity", type: "rank_lifetime", amount: 2799, currency: "INR" },

    // Subscription ranks (30 days)
    "King (30 Days)": { code: "King (30 Days)", displayName: "King (30 Days)", type: "rank_subscription_30d", amount: 149, currency: "INR" },
    "Emperor (30 Days)": { code: "Emperor (30 Days)", displayName: "Emperor (30 Days)", type: "rank_subscription_30d", amount: 249, currency: "INR" },
    "Deity (30 Days)": { code: "Deity (30 Days)", displayName: "Deity (30 Days)", type: "rank_subscription_30d", amount: 399, currency: "INR" },
};

// Defines rank progression order for upgrades.
const LIFETIME_RANK_ORDER = ["VIP", "VIP+", "Prince", "King", "Emperor", "Deity"];

function getProductOrNull(productCode) {
    return PRODUCTS[productCode] || null;
}

function isValidMinecraftUsername(username) {
    // Mojang username rules: 3-16 chars, letters/numbers/underscore.
    return typeof username === "string" && /^[A-Za-z0-9_]{3,16}$/.test(username);
}

function isLifetimeRank(product) {
    return product?.type === "rank_lifetime";
}

function getLifetimeRankIndex(rankName) {
    return LIFETIME_RANK_ORDER.indexOf(rankName);
}

module.exports = {
    PRODUCTS,
    LIFETIME_RANK_ORDER,
    getProductOrNull,
    isValidMinecraftUsername,
    isLifetimeRank,
    getLifetimeRankIndex,
};
