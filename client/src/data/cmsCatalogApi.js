import axios from "axios";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:5000";

function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

export async function fetchStorefrontCatalog() {
    const { data } = await axios.get(`${getApiBaseUrl()}/api/cms/storefront`);

    const lifetimeRanks = safeArray(data?.lifetimeRanks);
    const subscriptionRanks = safeArray(data?.subscriptionRanks);
    const crates = safeArray(data?.crates);
    const packages = safeArray(data?.packages);

    const allProducts = safeArray(data?.allProducts).length
        ? safeArray(data?.allProducts)
        : [
            ...lifetimeRanks.map((row) => ({ ...row, category: "ranks" })),
            ...subscriptionRanks.map((row) => ({ ...row, category: "ranks" })),
            ...crates.map((row) => ({ ...row, category: "crates" })),
            ...packages.map((row) => ({ ...row, category: "packages" })),
        ];

    return {
        currency: String(data?.currency || "INR").trim() || "INR",
        lifetimeRanks,
        subscriptionRanks,
        crates,
        packages,
        allProducts,
    };
}

export function getStoreRouteForProductCategory(category) {
    const normalized = String(category || "").toLowerCase();

    if (normalized === "crates") return "/crates";
    if (normalized === "packages") return "/packages";
    return "/ranks";
}
