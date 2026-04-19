const { Rank, Crate, Package } = require("../models/cms");

const DEFAULT_SORT = { displayOrder: 1, name: 1, createdAt: 1 };

const CATEGORY_CONFIG = {
    ranks: {
        model: Rank,
        defaults: {
            rankKind: "lifetime",
            billingInterval: "none",
        },
    },
    crates: {
        model: Crate,
        defaults: {
            status: "planned",
            info: "",
        },
    },
    packages: {
        model: Package,
        defaults: {
            badge: "",
            categoryTag: "",
        },
    },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

function getCategoryConfig(category) {
    return CATEGORY_CONFIG[category] || null;
}

function toClientDoc(document) {
    if (!document) return null;

    const plain = typeof document.toObject === "function"
        ? document.toObject()
        : document;

    const id = plain._id ? String(plain._id) : plain.id;
    const { _id, ...rest } = plain;

    return {
        id,
        ...rest,
    };
}

async function listCategoryDocuments(category, { includeInactive = true } = {}) {
    const config = getCategoryConfig(category);
    if (!config) return [];

    const filter = includeInactive ? {} : { isActive: true };
    const rows = await config.model
        .find(filter)
        .sort(DEFAULT_SORT)
        .lean();

    return rows.map(toClientDoc);
}

async function getCategoryDocumentById(category, id) {
    const config = getCategoryConfig(category);
    if (!config) return null;

    const row = await config.model.findById(id).lean();
    return toClientDoc(row);
}

async function createCategoryDocument(category, payload) {
    const config = getCategoryConfig(category);
    if (!config) return null;

    const row = await config.model.create({
        ...config.defaults,
        ...payload,
    });

    return toClientDoc(row);
}

async function updateCategoryDocumentById(category, id, payload) {
    const config = getCategoryConfig(category);
    if (!config) return null;

    const row = await config.model
        .findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
            lean: true,
        });

    return toClientDoc(row);
}

async function deleteCategoryDocumentById(category, id) {
    const config = getCategoryConfig(category);
    if (!config) return null;

    const row = await config.model.findByIdAndDelete(id).lean();
    return toClientDoc(row);
}

function detectCurrency(...collections) {
    for (const collection of collections) {
        for (const item of collection) {
            const code = String(item?.currency || "").trim();
            if (code) return code;
        }
    }
    return "INR";
}

function attachCategory(items, category) {
    return items.map((item) => ({
        ...item,
        category,
    }));
}

function byDisplayOrderAndName(a, b) {
    const aOrder = Number.isFinite(Number(a?.displayOrder)) ? Number(a.displayOrder) : 0;
    const bOrder = Number.isFinite(Number(b?.displayOrder)) ? Number(b.displayOrder) : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return String(a?.name || "").localeCompare(String(b?.name || ""));
}

async function listAllStoreProducts({ includeInactive = true } = {}) {
    const perCategory = await Promise.all(
        ALL_CATEGORIES.map(async (category) => {
            const rows = await listCategoryDocuments(category, { includeInactive });
            return attachCategory(rows, category);
        })
    );

    return perCategory.flat().sort(byDisplayOrderAndName);
}

async function getStoreProductById(id, { includeInactive = true } = {}) {
    const productId = String(id || "").trim();
    if (!productId) return null;

    for (const category of ALL_CATEGORIES) {
        const config = getCategoryConfig(category);
        if (!config) continue;

        const filter = includeInactive
            ? { _id: productId }
            : { _id: productId, isActive: true };

        const row = await config.model.findOne(filter).lean();
        if (!row) continue;

        return {
            ...toClientDoc(row),
            category,
        };
    }

    return null;
}

async function getStoreProductByCode(code, { includeInactive = true } = {}) {
    const productCode = String(code || "").trim();
    if (!productCode) return null;

    for (const category of ALL_CATEGORIES) {
        const config = getCategoryConfig(category);
        if (!config) continue;

        const filter = includeInactive
            ? { code: productCode }
            : { code: productCode, isActive: true };

        const row = await config.model.findOne(filter).lean();
        if (!row) continue;

        return {
            ...toClientDoc(row),
            category,
        };
    }

    return null;
}

async function getStorefrontCatalog() {
    const [allRanks, crates, packages] = await Promise.all([
        listCategoryDocuments("ranks", { includeInactive: false }),
        listCategoryDocuments("crates", { includeInactive: false }),
        listCategoryDocuments("packages", { includeInactive: false }),
    ]);

    const lifetimeRanks = allRanks.filter((row) => row.rankKind !== "subscription");
    const subscriptionRanks = allRanks.filter((row) => row.rankKind === "subscription");

    const currency = detectCurrency(lifetimeRanks, subscriptionRanks, crates, packages);

    const allProducts = [
        ...attachCategory(lifetimeRanks, "ranks"),
        ...attachCategory(subscriptionRanks, "ranks"),
        ...attachCategory(crates, "crates"),
        ...attachCategory(packages, "packages"),
    ];

    return {
        currency,
        lifetimeRanks,
        subscriptionRanks,
        crates,
        packages,
        allProducts,
    };
}

module.exports = {
    getCategoryConfig,
    listCategoryDocuments,
    listAllStoreProducts,
    getCategoryDocumentById,
    getStoreProductById,
    getStoreProductByCode,
    createCategoryDocument,
    updateCategoryDocumentById,
    deleteCategoryDocumentById,
    getStorefrontCatalog,
};
