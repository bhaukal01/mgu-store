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

// Optional backend-managed discount feed.
// Example env value:
// STORE_DISCOUNTS_JSON=[{"id":"april-offer","title":"April Offer","description":"Save 10% on King (30 Days)","productCode":"King (30 Days)","discountType":"percent","discountValue":10,"startsAt":"2026-04-01T00:00:00.000Z","endsAt":"2026-04-30T23:59:59.000Z"}]
const STORE_DISCOUNTS = (() => {
    const raw = process.env.STORE_DISCOUNTS_JSON;
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Invalid STORE_DISCOUNTS_JSON; expected a JSON array");
        return [];
    }
})();

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
    STORE_DISCOUNTS,
    LIFETIME_RANK_ORDER,
    getProductOrNull,
    isValidMinecraftUsername,
    isLifetimeRank,
    getLifetimeRankIndex,
};
