const {
    listAllStoreProducts,
    listCategoryDocuments,
    getStoreProductByCode,
    getStoreProductById,
} = require("./cmsCatalogService");

function normalizeCurrency(currency) {
    const code = String(currency || "INR").trim().toUpperCase();
    return code || "INR";
}

function toPurchasableProduct(storeProduct) {
    if (!storeProduct) return null;

    const category = String(storeProduct.category || "").trim().toLowerCase();
    if (!category) return null;

    const rankKind = String(storeProduct.rankKind || "").trim().toLowerCase();
    const billingInterval = String(storeProduct.billingInterval || "")
        .trim()
        .toLowerCase();

    const isRank = category === "ranks";
    const isSubscriptionRank =
        isRank && (rankKind === "subscription" || billingInterval === "monthly");

    return {
        id: String(storeProduct.id || "").trim(),
        code: String(storeProduct.code || "").trim(),
        displayName: String(storeProduct.name || "").trim(),
        name: String(storeProduct.name || "").trim(),
        type: isRank
            ? (isSubscriptionRank ? "rank_subscription_30d" : "rank_lifetime")
            : `store_${category}`,
        category,
        rankKind: isRank ? (rankKind || "lifetime") : "",
        billingInterval: isRank ? (billingInterval || "none") : "none",
        amount: Number(storeProduct.price || 0),
        price: Number(storeProduct.price || 0),
        currency: normalizeCurrency(storeProduct.currency),
        img: String(storeProduct.img || "").trim(),
        perks: Array.isArray(storeProduct.perks) ? storeProduct.perks : [],
        isActive: storeProduct.isActive !== false,
        displayOrder: Number.parseInt(storeProduct.displayOrder, 10) || 0,
    };
}

function isValidMinecraftUsername(username) {
    return typeof username === "string" && /^[A-Za-z0-9_]{3,16}$/.test(username);
}

function isRankProduct(product) {
    return product?.category === "ranks";
}

function isLifetimeRankProduct(product) {
    return isRankProduct(product) && product.type === "rank_lifetime";
}

function byDisplayOrderAndName(a, b) {
    const aOrder = Number.parseInt(a?.displayOrder, 10) || 0;
    const bOrder = Number.parseInt(b?.displayOrder, 10) || 0;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return String(a?.displayName || "").localeCompare(String(b?.displayName || ""));
}

function applyCategoryFilter(products, categories) {
    if (!Array.isArray(categories) || categories.length === 0) {
        return products;
    }

    const set = new Set(
        categories
            .map((value) => String(value || "").trim().toLowerCase())
            .filter(Boolean)
    );

    return products.filter((product) => set.has(String(product.category || "").toLowerCase()));
}

async function listPurchasableProducts({ includeInactive = true, categories = [] } = {}) {
    const storeProducts = await listAllStoreProducts({ includeInactive });

    const products = storeProducts
        .map(toPurchasableProduct)
        .filter(Boolean)
        .filter((product) => product.code && product.displayName)
        .sort(byDisplayOrderAndName);

    return applyCategoryFilter(products, categories);
}

async function listLifetimeRankProducts({ includeInactive = true } = {}) {
    const rankRows = await listCategoryDocuments("ranks", { includeInactive });

    return rankRows
        .map((row) => toPurchasableProduct({ ...row, category: "ranks" }))
        .filter(Boolean)
        .filter((product) => isLifetimeRankProduct(product))
        .sort(byDisplayOrderAndName);
}

async function listLifetimeRankOrder({ includeInactive = true } = {}) {
    const ranks = await listLifetimeRankProducts({ includeInactive });
    return ranks.map((product) => product.displayName).filter(Boolean);
}

async function getPurchasableProductByCode(
    code,
    { includeInactive = true, categories = [] } = {}
) {
    const storeProduct = await getStoreProductByCode(code, { includeInactive });
    const product = toPurchasableProduct(storeProduct);
    if (!product) return null;

    const filtered = applyCategoryFilter([product], categories);
    return filtered.length ? filtered[0] : null;
}

async function getPurchasableProductById(
    id,
    { includeInactive = true, categories = [] } = {}
) {
    const storeProduct = await getStoreProductById(id, { includeInactive });
    const product = toPurchasableProduct(storeProduct);
    if (!product) return null;

    const filtered = applyCategoryFilter([product], categories);
    return filtered.length ? filtered[0] : null;
}

module.exports = {
    toPurchasableProduct,
    isValidMinecraftUsername,
    isRankProduct,
    isLifetimeRankProduct,
    listPurchasableProducts,
    listLifetimeRankProducts,
    listLifetimeRankOrder,
    getPurchasableProductByCode,
    getPurchasableProductById,
};
