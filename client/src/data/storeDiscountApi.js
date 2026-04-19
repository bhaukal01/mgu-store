import axios from "axios";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:5000";

function getApiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function normalizeStringArray(values) {
    if (!Array.isArray(values)) return [];

    const seen = new Set();
    return values
        .map((entry) => String(entry || "").trim())
        .filter((entry) => {
            if (!entry) return false;

            const key = entry.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function normalizeDiscount(discount) {
    if (!discount || typeof discount !== "object") return null;

    const discountType = String(discount.discountType || "")
        .trim()
        .toLowerCase();
    const discountValue = Number(discount.discountValue);

    const productCodes = normalizeStringArray([
        ...(Array.isArray(discount.productCodes) ? discount.productCodes : []),
        discount.productCode,
    ]);

    const productCategories = normalizeStringArray(
        Array.isArray(discount.productCategories)
            ? discount.productCategories
            : []
    ).map((entry) => entry.toLowerCase());

    const kind = String(discount.kind || "upfront").trim().toLowerCase();

    return {
        id: discount.id || null,
        title: String(discount.title || "Store Discount"),
        description: String(discount.description || ""),
        kind: kind === "automatic" ? "upfront" : kind,
        code: discount.code ? String(discount.code).trim().toUpperCase() : "",
        showOnStorefront: discount.showOnStorefront === true,
        productCode: productCodes[0] || null,
        productCodes,
        productCategories,
        discountType,
        discountValue: Number.isFinite(discountValue) ? discountValue : null,
        startsAt: discount.startsAt || null,
        endsAt: discount.endsAt || null,
    };
}

export async function fetchActiveStoreDiscounts(apiBaseUrl = getApiBaseUrl()) {
    const { data } = await axios.get(`${apiBaseUrl}/api/purchase/store-highlights`);

    if (!Array.isArray(data?.ongoingDiscounts)) return [];

    return data.ongoingDiscounts.map(normalizeDiscount).filter(Boolean);
}

export function getDiscountLabel(discount) {
    if (!discount) return "Offer";

    if (discount.kind === "coupon") {
        return discount.code ? `Coupon ${discount.code}` : "Coupon";
    }

    if (!discount.discountType || discount.discountValue === null) {
        return "Offer";
    }

    if (discount.discountType === "percent") {
        return `${discount.discountValue}% OFF`;
    }

    return `${discount.discountValue} OFF`;
}

function calculateDiscountedPrice(basePrice, discount) {
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) return null;

    if (!discount || discount.discountValue === null) return null;

    const amount = Number(discount.discountValue);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    if (discount.discountType === "percent") {
        const next = price - (price * amount) / 100;
        return Math.max(0, Number(next.toFixed(2)));
    }

    return Math.max(0, Number((price - amount).toFixed(2)));
}

function discountAppliesToProduct(discount, productCode, productCategory) {
    const code = String(productCode || "").trim().toLowerCase();
    const category = String(productCategory || "").trim().toLowerCase();

    const productCodes = normalizeStringArray(discount?.productCodes || []).map(
        (entry) => entry.toLowerCase()
    );
    const productCategories = normalizeStringArray(
        discount?.productCategories || []
    ).map((entry) => entry.toLowerCase());

    if (!productCodes.length && !productCategories.length) {
        return true;
    }

    if (code && productCodes.includes(code)) {
        return true;
    }

    if (category && productCategories.includes(category)) {
        return true;
    }

    return false;
}

export function getBestDiscountForProduct(
    productCode,
    basePrice,
    discounts = [],
    productCategory,
) {
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) return null;

    let best = null;

    for (const discount of discounts) {
        if (discount?.kind !== "upfront") continue;
        if (!discountAppliesToProduct(discount, productCode, productCategory)) {
            continue;
        }

        const discountedPrice = calculateDiscountedPrice(price, discount);
        if (!Number.isFinite(discountedPrice)) continue;

        const savings = Number((price - discountedPrice).toFixed(2));
        if (savings <= 0) continue;

        if (!best || savings > best.savings) {
            best = {
                ...discount,
                discountedPrice,
                savings,
            };
        }
    }

    return best;
}

export function formatMoney(value, currency = "INR") {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return `${currency} 0`;

    return `${currency} ${new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(amount)}`;
}

export function getOfferAnchorId(code) {
    return `offer-${encodeURIComponent(String(code || "").trim())}`;
}
