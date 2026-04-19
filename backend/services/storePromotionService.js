const {
    StorePromotion,
    PromotionRedemption,
    CheckoutOrderContext,
} = require("../models/cms");

const KIND_UPFRONT = "upfront";
const KIND_COUPON = "coupon";
const VALID_PRODUCT_CATEGORIES = new Set(["ranks", "crates", "packages"]);

function roundMoney(value) {
    return Number(Number(value || 0).toFixed(2));
}

function parseBoolean(value, fallback = false) {
    if (value === true || value === "true" || value === 1 || value === "1") return true;
    if (value === false || value === "false" || value === 0 || value === "0") return false;
    return fallback;
}

function normalizePromotionKind(value) {
    const kind = String(value || KIND_UPFRONT).trim().toLowerCase();
    if (kind === "automatic") return KIND_UPFRONT;
    return kind;
}

function normalizeUniqueStringArray(values = []) {
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

function normalizeProductCodes(values = []) {
    return normalizeUniqueStringArray(values);
}

function normalizeCategoryScope(values = []) {
    return normalizeUniqueStringArray(values)
        .map((entry) => entry.toLowerCase())
        .filter((entry) => VALID_PRODUCT_CATEGORIES.has(entry));
}

function toPromotionDoc(document) {
    if (!document) return null;

    const plain = typeof document.toObject === "function"
        ? document.toObject()
        : document;

    const productCodes = normalizeProductCodes([
        ...(Array.isArray(plain.productCodes) ? plain.productCodes : []),
        plain.productCode,
    ]);

    const productCategories = normalizeCategoryScope(
        Array.isArray(plain.productCategories) ? plain.productCategories : []
    );

    const kind = normalizePromotionKind(plain.kind);
    const totalUsed = Number(plain.totalUsed || 0);
    const totalRevenueGenerated = Number(plain.totalRevenueGenerated || 0);

    return {
        id: plain._id ? String(plain._id) : String(plain.id || ""),
        title: String(plain.title || "").trim(),
        description: String(plain.description || "").trim(),
        kind,
        code: String(plain.code || "").trim().toUpperCase(),
        productCode: productCodes[0] || null,
        productCodes,
        productCategories,
        discountType: String(plain.discountType || "percent").trim().toLowerCase(),
        discountValue: Number(plain.discountValue || 0),
        minOrderAmount: Number(plain.minOrderAmount || 0),
        maxDiscountAmount:
            plain.maxDiscountAmount === null || plain.maxDiscountAmount === undefined
                ? null
                : Number(plain.maxDiscountAmount),
        usageLimit:
            plain.usageLimit === null || plain.usageLimit === undefined
                ? null
                : Number(plain.usageLimit),
        usagePerUser:
            plain.usagePerUser === null || plain.usagePerUser === undefined
                ? null
                : Number(plain.usagePerUser),
        totalUsed,
        totalRevenueGenerated,
        totalBaseRevenue: Number(plain.totalBaseRevenue || 0),
        totalDiscountGiven: Number(plain.totalDiscountGiven || 0),
        averageOrderValue: totalUsed > 0 ? roundMoney(totalRevenueGenerated / totalUsed) : 0,
        uniqueUsersCount: Number(plain.uniqueUsersCount || 0),
        firstRedeemedAt: plain.firstRedeemedAt || null,
        lastRedeemedAt: plain.lastRedeemedAt || null,
        stackable: plain.stackable === true,
        showOnStorefront: plain.showOnStorefront === true,
        startsAt: plain.startsAt || null,
        endsAt: plain.endsAt || null,
        displayOrder: Number(plain.displayOrder || 0),
        isActive: plain.isActive !== false,
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
    };
}

function toCheckoutContextDoc(document) {
    if (!document) return null;

    const plain = typeof document.toObject === "function"
        ? document.toObject()
        : document;

    return {
        id: plain._id ? String(plain._id) : String(plain.id || ""),
        orderId: String(plain.orderId || "").trim(),
        username: String(plain.username || "").trim(),
        productId: String(plain.productId || "").trim(),
        productCode: String(plain.productCode || "").trim(),
        mode: String(plain.mode || "buy").trim(),
        fromLifetimeRank: String(plain.fromLifetimeRank || "NONE").trim() || "NONE",
        baseAmount: Number(plain.baseAmount || 0),
        finalAmount: Number(plain.finalAmount || 0),
        discountAmountAutomatic: Number(plain.discountAmountAutomatic || 0),
        discountAmountCoupon: Number(plain.discountAmountCoupon || 0),
        discountAmountTotal: Number(plain.discountAmountTotal || 0),
        automaticPromotionId: plain.automaticPromotionId
            ? String(plain.automaticPromotionId)
            : null,
        couponPromotionId: plain.couponPromotionId ? String(plain.couponPromotionId) : null,
        automaticPromotionCode: String(plain.automaticPromotionCode || "").trim(),
        couponPromotionCode: String(plain.couponPromotionCode || "").trim(),
        currency: String(plain.currency || "INR").trim().toUpperCase(),
        status: String(plain.status || "pending").trim().toLowerCase(),
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
    };
}

function throwValidation(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function isPromotionLive(promotion, nowTs = Date.now()) {
    if (!promotion || promotion.isActive === false) return false;

    const startsAtTs = promotion.startsAt ? Date.parse(promotion.startsAt) : null;
    const endsAtTs = promotion.endsAt ? Date.parse(promotion.endsAt) : null;

    if (Number.isFinite(startsAtTs) && nowTs < startsAtTs) return false;
    if (Number.isFinite(endsAtTs) && nowTs > endsAtTs) return false;

    return true;
}

function doesPromotionApplyToProduct(promotion, { productCode, productCategory } = {}) {
    const selectedCodes = normalizeProductCodes(promotion?.productCodes || []).map((entry) =>
        entry.toLowerCase()
    );
    const selectedCategories = normalizeCategoryScope(
        promotion?.productCategories || []
    ).map((entry) => entry.toLowerCase());

    if (!selectedCodes.length && !selectedCategories.length) {
        return true;
    }

    const normalizedCode = String(productCode || "").trim().toLowerCase();
    const normalizedCategory = String(productCategory || "").trim().toLowerCase();

    if (normalizedCode && selectedCodes.includes(normalizedCode)) {
        return true;
    }

    if (normalizedCategory && selectedCategories.includes(normalizedCategory)) {
        return true;
    }

    return false;
}

function calculateRawPromotionDiscount(amount, promotion) {
    const price = Number(amount);
    if (!Number.isFinite(price) || price <= 0) return 0;

    const discountValue = Number(promotion?.discountValue || 0);
    if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

    let discountAmount = 0;
    if (promotion.discountType === "fixed") {
        discountAmount = discountValue;
    } else {
        discountAmount = (price * discountValue) / 100;
    }

    const maxDiscountAmount = Number(promotion?.maxDiscountAmount);
    if (Number.isFinite(maxDiscountAmount) && maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }

    return Math.max(0, roundMoney(discountAmount));
}

function applyPromotionToAmount(amount, promotion, { minFinalAmount = 1 } = {}) {
    const currentAmount = Number(amount);
    if (!Number.isFinite(currentAmount) || currentAmount <= minFinalAmount) {
        return { nextAmount: roundMoney(currentAmount), discountAmount: 0 };
    }

    const rawDiscount = calculateRawPromotionDiscount(currentAmount, promotion);
    const maxAllowedDiscount = Math.max(0, roundMoney(currentAmount - minFinalAmount));
    const discountAmount = Math.min(rawDiscount, maxAllowedDiscount);
    const nextAmount = Math.max(minFinalAmount, roundMoney(currentAmount - discountAmount));

    return {
        nextAmount,
        discountAmount: roundMoney(discountAmount),
    };
}

function promotionSatisfiesMinOrder(promotion, amount) {
    const minOrderAmount = Number(promotion?.minOrderAmount || 0);
    if (!Number.isFinite(minOrderAmount) || minOrderAmount <= 0) return true;

    return Number(amount) >= minOrderAmount;
}

function normalizePromotionInput(payload = {}, { partial = false } = {}) {
    const kind = normalizePromotionKind(payload.kind);

    const productCodes = normalizeProductCodes([
        ...(Array.isArray(payload.productCodes)
            ? payload.productCodes
            : String(payload.productCodes || "")
                .split(",")
                .map((entry) => entry.trim())),
        payload.productCode,
    ]);

    const productCategories = normalizeCategoryScope(
        Array.isArray(payload.productCategories)
            ? payload.productCategories
            : String(payload.productCategories || "")
                .split(",")
                .map((entry) => entry.trim())
    );

    const normalized = {
        title: String(payload.title || "").trim(),
        description: String(payload.description || "").trim(),
        kind,
        code: String(payload.code || "").trim().toUpperCase(),
        productCode: productCodes[0] || "",
        productCodes,
        productCategories,
        discountType: String(payload.discountType || "percent").trim().toLowerCase(),
        discountValue: Number(payload.discountValue),
        minOrderAmount:
            payload.minOrderAmount === null || payload.minOrderAmount === ""
                ? 0
                : Number(payload.minOrderAmount),
        maxDiscountAmount:
            payload.maxDiscountAmount === null || payload.maxDiscountAmount === ""
                ? null
                : Number(payload.maxDiscountAmount),
        usageLimit:
            payload.usageLimit === null || payload.usageLimit === ""
                ? null
                : Number.parseInt(payload.usageLimit, 10),
        usagePerUser:
            payload.usagePerUser === null || payload.usagePerUser === ""
                ? null
                : Number.parseInt(payload.usagePerUser, 10),
        stackable: parseBoolean(payload.stackable, false),
        showOnStorefront: parseBoolean(payload.showOnStorefront, false),
        startsAt:
            payload.startsAt === null || payload.startsAt === ""
                ? null
                : new Date(payload.startsAt),
        endsAt:
            payload.endsAt === null || payload.endsAt === ""
                ? null
                : new Date(payload.endsAt),
        displayOrder:
            payload.displayOrder === null || payload.displayOrder === ""
                ? 0
                : Number.parseInt(payload.displayOrder, 10),
        isActive: parseBoolean(payload.isActive, true),
    };

    if (!partial || payload.title !== undefined) {
        if (!normalized.title) throw throwValidation("title is required");
    }

    if (![KIND_UPFRONT, KIND_COUPON].includes(normalized.kind)) {
        throw throwValidation("kind must be either upfront or coupon");
    }

    if (![
        "percent",
        "fixed",
    ].includes(normalized.discountType)) {
        throw throwValidation("discountType must be either percent or fixed");
    }

    if (!Number.isFinite(normalized.discountValue) || normalized.discountValue <= 0) {
        throw throwValidation("discountValue must be greater than 0");
    }

    if (normalized.discountType === "percent" && normalized.discountValue > 100) {
        throw throwValidation("Percent discount cannot exceed 100");
    }

    if (!Number.isFinite(normalized.minOrderAmount) || normalized.minOrderAmount < 0) {
        throw throwValidation("minOrderAmount must be a non-negative number");
    }

    if (
        normalized.maxDiscountAmount !== null &&
        (!Number.isFinite(normalized.maxDiscountAmount) || normalized.maxDiscountAmount < 0)
    ) {
        throw throwValidation("maxDiscountAmount must be a non-negative number");
    }

    if (
        normalized.usageLimit !== null &&
        (!Number.isFinite(normalized.usageLimit) || normalized.usageLimit < 1)
    ) {
        throw throwValidation("usageLimit must be at least 1");
    }

    if (
        normalized.usagePerUser !== null &&
        (!Number.isFinite(normalized.usagePerUser) || normalized.usagePerUser < 1)
    ) {
        throw throwValidation("usagePerUser must be at least 1");
    }

    if (
        normalized.displayOrder !== null &&
        (!Number.isFinite(normalized.displayOrder) || normalized.displayOrder < 0)
    ) {
        throw throwValidation("displayOrder must be a non-negative number");
    }

    if (normalized.startsAt && Number.isNaN(normalized.startsAt.getTime())) {
        throw throwValidation("startsAt must be a valid date");
    }

    if (normalized.endsAt && Number.isNaN(normalized.endsAt.getTime())) {
        throw throwValidation("endsAt must be a valid date");
    }

    if (normalized.startsAt && normalized.endsAt && normalized.endsAt < normalized.startsAt) {
        throw throwValidation("endsAt must be greater than or equal to startsAt");
    }

    if (normalized.kind === KIND_COUPON && !normalized.code) {
        throw throwValidation("code is required for coupon promotions");
    }

    if (normalized.kind !== KIND_COUPON) {
        normalized.code = "";
        normalized.stackable = false;
        normalized.usageLimit = null;
        normalized.usagePerUser = null;
    }

    if (normalized.kind === KIND_UPFRONT) {
        normalized.minOrderAmount = 0;
        normalized.maxDiscountAmount = null;
    }

    return normalized;
}

function toPublicPromotionSummary(promotion) {
    if (!promotion) return null;

    return {
        id: promotion.id,
        title: promotion.title,
        description: promotion.description,
        kind: promotion.kind,
        code: promotion.kind === KIND_COUPON ? promotion.code : null,
        productCode: promotion.productCodes[0] || null,
        productCodes: promotion.productCodes,
        productCategories: promotion.productCategories,
        showOnStorefront: promotion.showOnStorefront,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        stackable: promotion.stackable,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
    };
}

async function countPromotionUsageByUser(promotionId, username) {
    const usernameLower = String(username || "").trim().toLowerCase();
    if (!usernameLower) return 0;

    return PromotionRedemption.countDocuments({
        usernameLower,
        "promotions.promotionId": promotionId,
    });
}

function chooseBestPromotion(amount, promotions = []) {
    let best = null;

    for (const promotion of promotions) {
        if (!promotionSatisfiesMinOrder(promotion, amount)) continue;

        const applied = applyPromotionToAmount(amount, promotion);
        if (applied.discountAmount <= 0) continue;

        if (
            !best ||
            applied.discountAmount > best.discountAmount ||
            (applied.discountAmount === best.discountAmount &&
                Number(promotion.displayOrder || 0) < Number(best.promotion.displayOrder || 0))
        ) {
            best = {
                promotion,
                discountAmount: applied.discountAmount,
                nextAmount: applied.nextAmount,
            };
        }
    }

    return best;
}

async function getPromotionAnalyticsMap() {
    const rows = await PromotionRedemption.aggregate([
        { $unwind: "$promotions" },
        {
            $group: {
                _id: "$promotions.promotionId",
                timesUsed: { $sum: 1 },
                totalRevenueGenerated: { $sum: { $ifNull: ["$finalAmount", 0] } },
                totalBaseRevenue: { $sum: { $ifNull: ["$baseAmount", 0] } },
                totalDiscountGiven: { $sum: { $ifNull: ["$promotions.discountAmount", 0] } },
                uniqueUsers: { $addToSet: "$usernameLower" },
                firstRedeemedAt: { $min: "$createdAt" },
                lastRedeemedAt: { $max: "$createdAt" },
            },
        },
        {
            $project: {
                _id: 1,
                timesUsed: 1,
                totalRevenueGenerated: 1,
                totalBaseRevenue: 1,
                totalDiscountGiven: 1,
                uniqueUsersCount: {
                    $size: {
                        $ifNull: ["$uniqueUsers", []],
                    },
                },
                averageOrderValue: {
                    $cond: [
                        { $gt: ["$timesUsed", 0] },
                        { $divide: ["$totalRevenueGenerated", "$timesUsed"] },
                        0,
                    ],
                },
                firstRedeemedAt: 1,
                lastRedeemedAt: 1,
            },
        },
    ]);

    const map = new Map();
    for (const row of rows) {
        const key = String(row._id || "").trim();
        if (!key) continue;

        map.set(key, {
            timesUsed: Number(row.timesUsed || 0),
            totalRevenueGenerated: roundMoney(Number(row.totalRevenueGenerated || 0)),
            totalBaseRevenue: roundMoney(Number(row.totalBaseRevenue || 0)),
            totalDiscountGiven: roundMoney(Number(row.totalDiscountGiven || 0)),
            uniqueUsersCount: Number(row.uniqueUsersCount || 0),
            averageOrderValue: roundMoney(Number(row.averageOrderValue || 0)),
            firstRedeemedAt: row.firstRedeemedAt || null,
            lastRedeemedAt: row.lastRedeemedAt || null,
        });
    }

    return map;
}

async function listStorePromotionsForAdmin() {
    const [rows, analyticsMap] = await Promise.all([
        StorePromotion.find({})
            .sort({ displayOrder: 1, createdAt: 1, _id: 1 })
            .lean(),
        getPromotionAnalyticsMap(),
    ]);

    return rows
        .map(toPromotionDoc)
        .filter(Boolean)
        .map((promotion) => {
            const analytics = analyticsMap.get(promotion.id);
            if (!analytics) return promotion;

            return {
                ...promotion,
                totalUsed: analytics.timesUsed,
                totalRevenueGenerated: analytics.totalRevenueGenerated,
                totalBaseRevenue: analytics.totalBaseRevenue,
                totalDiscountGiven: analytics.totalDiscountGiven,
                uniqueUsersCount: analytics.uniqueUsersCount,
                averageOrderValue: analytics.averageOrderValue,
                firstRedeemedAt: analytics.firstRedeemedAt,
                lastRedeemedAt: analytics.lastRedeemedAt,
            };
        });
}

async function createStorePromotion(payload) {
    const normalized = normalizePromotionInput(payload, { partial: false });

    try {
        const created = await StorePromotion.create(normalized);
        return toPromotionDoc(created);
    } catch (error) {
        if (error?.code === 11000) {
            throw throwValidation("Coupon code already exists");
        }
        throw error;
    }
}

async function updateStorePromotionById(id, payload) {
    const existing = await StorePromotion.findById(String(id || "").trim());
    if (!existing) return null;

    const mergedPayload = {
        ...existing.toObject(),
        ...payload,
    };

    const normalized = normalizePromotionInput(mergedPayload, { partial: false });

    try {
        const updated = await StorePromotion.findByIdAndUpdate(
            existing._id,
            normalized,
            {
                new: true,
                runValidators: true,
                lean: true,
            }
        );

        return toPromotionDoc(updated);
    } catch (error) {
        if (error?.code === 11000) {
            throw throwValidation("Coupon code already exists");
        }
        throw error;
    }
}

async function deleteStorePromotionById(id) {
    const deleted = await StorePromotion.findByIdAndDelete(String(id || "").trim()).lean();
    return toPromotionDoc(deleted);
}

async function listActiveUpfrontPromotions({ productCode, productCategory } = {}) {
    const nowTs = Date.now();
    const rows = await StorePromotion.find({
        isActive: true,
        kind: { $in: [KIND_UPFRONT, "automatic"] },
    })
        .sort({ displayOrder: 1, createdAt: 1, _id: 1 })
        .lean();

    return rows
        .map(toPromotionDoc)
        .filter((promotion) => promotion.kind === KIND_UPFRONT)
        .filter((promotion) => isPromotionLive(promotion, nowTs))
        .filter((promotion) =>
            doesPromotionApplyToProduct(promotion, { productCode, productCategory })
        )
        .map(toPublicPromotionSummary);
}

async function listVisibleStorePromotions({ productCode, productCategory } = {}) {
    const nowTs = Date.now();
    const rows = await StorePromotion.find({
        isActive: true,
        kind: { $in: [KIND_UPFRONT, KIND_COUPON, "automatic"] },
    })
        .sort({ displayOrder: 1, createdAt: 1, _id: 1 })
        .lean();

    return rows
        .map(toPromotionDoc)
        .filter(Boolean)
        .filter((promotion) => isPromotionLive(promotion, nowTs))
        .filter((promotion) =>
            doesPromotionApplyToProduct(promotion, { productCode, productCategory })
        )
        .filter(
            (promotion) =>
                promotion.kind === KIND_UPFRONT ||
                (promotion.kind === KIND_COUPON && promotion.showOnStorefront)
        )
        .map(toPublicPromotionSummary);
}

async function evaluateOrderPricing({
    baseAmount,
    productCode,
    productCategory,
    username,
    couponCode,
}) {
    const base = roundMoney(Number(baseAmount));
    if (!Number.isFinite(base) || base < 1) {
        throw throwValidation("Invalid base amount for pricing");
    }

    const normalizedProductCode = String(productCode || "").trim();
    if (!normalizedProductCode) {
        throw throwValidation("productCode is required for pricing");
    }

    const normalizedProductCategory = String(productCategory || "").trim().toLowerCase();
    const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();

    const nowTs = Date.now();
    const promotions = (await StorePromotion.find({ isActive: true })
        .sort({ displayOrder: 1, createdAt: 1, _id: 1 })
        .lean())
        .map(toPromotionDoc)
        .filter(Boolean)
        .filter((promotion) => isPromotionLive(promotion, nowTs))
        .filter((promotion) =>
            doesPromotionApplyToProduct(promotion, {
                productCode: normalizedProductCode,
                productCategory: normalizedProductCategory,
            })
        );

    const upfrontCandidates = promotions.filter(
        (promotion) => promotion.kind === KIND_UPFRONT
    );
    const bestUpfront = chooseBestPromotion(base, upfrontCandidates);

    let upfrontPromotion = bestUpfront?.promotion || null;
    let discountAmountUpfront = roundMoney(bestUpfront?.discountAmount || 0);

    let couponPromotion = null;
    let discountAmountCoupon = 0;
    let couponIgnoredReason = null;

    if (normalizedCouponCode) {
        const couponPromotionCandidate = promotions.find(
            (promotion) =>
                promotion.kind === KIND_COUPON && promotion.code === normalizedCouponCode
        );

        if (!couponPromotionCandidate) {
            throw throwValidation("Coupon is invalid, inactive, or not applicable for this product");
        }

        if (!promotionSatisfiesMinOrder(couponPromotionCandidate, base)) {
            throw throwValidation("Order does not meet coupon minimum amount");
        }

        if (!String(username || "").trim()) {
            throw throwValidation("Username is required to apply coupon");
        }

        if (
            Number.isFinite(Number(couponPromotionCandidate.usageLimit)) &&
            Number(couponPromotionCandidate.usageLimit) > 0 &&
            Number(couponPromotionCandidate.totalUsed || 0) >=
            Number(couponPromotionCandidate.usageLimit)
        ) {
            throw throwValidation("Coupon usage limit reached");
        }

        if (
            Number.isFinite(Number(couponPromotionCandidate.usagePerUser)) &&
            Number(couponPromotionCandidate.usagePerUser) > 0
        ) {
            const userUsageCount = await countPromotionUsageByUser(
                couponPromotionCandidate.id,
                username
            );

            if (userUsageCount >= Number(couponPromotionCandidate.usagePerUser)) {
                throw throwValidation("You have already used this coupon the maximum allowed times");
            }
        }

        const couponOnBase = applyPromotionToAmount(base, couponPromotionCandidate);

        if (upfrontPromotion && couponPromotionCandidate.stackable) {
            const postUpfrontAmount = Math.max(1, roundMoney(base - discountAmountUpfront));
            const couponOnDiscountedAmount = applyPromotionToAmount(
                postUpfrontAmount,
                couponPromotionCandidate
            );

            if (couponOnDiscountedAmount.discountAmount > 0) {
                couponPromotion = couponPromotionCandidate;
                discountAmountCoupon = roundMoney(couponOnDiscountedAmount.discountAmount);
            }
        } else if (upfrontPromotion) {
            if (couponOnBase.discountAmount > discountAmountUpfront) {
                upfrontPromotion = null;
                discountAmountUpfront = 0;
                couponPromotion = couponPromotionCandidate;
                discountAmountCoupon = roundMoney(couponOnBase.discountAmount);
            } else {
                couponIgnoredReason =
                    "Upfront discount already gives an equal or better price";
            }
        } else if (couponOnBase.discountAmount > 0) {
            couponPromotion = couponPromotionCandidate;
            discountAmountCoupon = roundMoney(couponOnBase.discountAmount);
        }
    }

    const discountAmountTotal = roundMoney(discountAmountUpfront + discountAmountCoupon);
    const finalAmount = Math.max(1, roundMoney(base - discountAmountTotal));

    return {
        baseAmount: base,
        finalAmount,
        discountAmountUpfront,
        discountAmountAutomatic: discountAmountUpfront,
        discountAmountCoupon,
        discountAmountTotal: roundMoney(base - finalAmount),
        upfrontPromotion: toPublicPromotionSummary(upfrontPromotion),
        automaticPromotion: toPublicPromotionSummary(upfrontPromotion),
        couponPromotion: toPublicPromotionSummary(couponPromotion),
        couponCodeProvided: normalizedCouponCode || null,
        couponCodeApplied: couponPromotion?.code || null,
        couponIgnoredReason,
    };
}

async function saveCheckoutOrderContext({
    orderId,
    username,
    productId,
    productCode,
    mode,
    fromLifetimeRank,
    currency,
    pricing,
}) {
    const effectiveUpfrontPromotion =
        pricing?.upfrontPromotion || pricing?.automaticPromotion || null;

    const effectiveUpfrontDiscount = Number(
        pricing?.discountAmountUpfront ?? pricing?.discountAmountAutomatic ?? 0
    );

    const context = await CheckoutOrderContext.findOneAndUpdate(
        { orderId: String(orderId || "").trim() },
        {
            $set: {
                username: String(username || "").trim(),
                productId: String(productId || "").trim(),
                productCode: String(productCode || "").trim(),
                mode: String(mode || "buy").trim().toLowerCase(),
                fromLifetimeRank: String(fromLifetimeRank || "NONE").trim() || "NONE",
                currency: String(currency || "INR").trim().toUpperCase(),
                baseAmount: Number(pricing?.baseAmount || 0),
                finalAmount: Number(pricing?.finalAmount || 0),
                discountAmountAutomatic: effectiveUpfrontDiscount,
                discountAmountCoupon: Number(pricing?.discountAmountCoupon || 0),
                discountAmountTotal: Number(pricing?.discountAmountTotal || 0),
                automaticPromotionId: effectiveUpfrontPromotion?.id || null,
                couponPromotionId: pricing?.couponPromotion?.id || null,
                automaticPromotionCode: String(effectiveUpfrontPromotion?.code || "")
                    .trim()
                    .toUpperCase(),
                couponPromotionCode: String(pricing?.couponPromotion?.code || "")
                    .trim()
                    .toUpperCase(),
                status: "pending",
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        }
    );

    return toCheckoutContextDoc(context);
}

async function getCheckoutOrderContext(orderId) {
    const row = await CheckoutOrderContext.findOne({ orderId: String(orderId || "").trim() }).lean();
    return toCheckoutContextDoc(row);
}

async function markCheckoutOrderContextCompleted(orderId) {
    const updated = await CheckoutOrderContext.findOneAndUpdate(
        { orderId: String(orderId || "").trim() },
        { $set: { status: "completed" } },
        { new: true, lean: true }
    );

    return toCheckoutContextDoc(updated);
}

async function recordPromotionRedemptionFromContext({
    orderId,
    username,
    productCode,
    currency,
    context,
}) {
    if (!context) return { recorded: false, reason: "missing_context" };

    const promotions = [];
    if (context.automaticPromotionId && Number(context.discountAmountAutomatic) > 0) {
        promotions.push({
            promotionId: context.automaticPromotionId,
            kind: KIND_UPFRONT,
            code: context.automaticPromotionCode || "",
            discountAmount: Number(context.discountAmountAutomatic || 0),
        });
    }

    if (context.couponPromotionId && Number(context.discountAmountCoupon) > 0) {
        promotions.push({
            promotionId: context.couponPromotionId,
            kind: KIND_COUPON,
            code: context.couponPromotionCode || "",
            discountAmount: Number(context.discountAmountCoupon || 0),
        });
    }

    if (!promotions.length) {
        return { recorded: false, reason: "no_applied_promotions" };
    }

    const normalizedOrderId = String(orderId || "").trim();
    const updateResult = await PromotionRedemption.updateOne(
        { orderId: normalizedOrderId },
        {
            $setOnInsert: {
                orderId: normalizedOrderId,
                username: String(username || "").trim(),
                usernameLower: String(username || "").trim().toLowerCase(),
                productCode: String(productCode || "").trim(),
                promotions,
                baseAmount: Number(context.baseAmount || 0),
                finalAmount: Number(context.finalAmount || 0),
                currency: String(currency || "INR").trim().toUpperCase(),
            },
        },
        {
            upsert: true,
        }
    );

    if (!updateResult?.upsertedCount) {
        return { recorded: false, reason: "already_recorded" };
    }

    const rollups = new Map();
    for (const entry of promotions) {
        const key = String(entry.promotionId || "").trim();
        if (!key) continue;

        const existing = rollups.get(key) || {
            promotionId: key,
            discountAmount: 0,
        };

        existing.discountAmount += Number(entry.discountAmount || 0);
        rollups.set(key, existing);
    }

    const finalAmount = Number(context.finalAmount || 0);
    const baseAmount = Number(context.baseAmount || 0);
    const now = new Date();

    await Promise.all(
        [...rollups.values()].map((entry) =>
            StorePromotion.updateOne(
                { _id: entry.promotionId },
                {
                    $inc: {
                        totalUsed: 1,
                        totalRevenueGenerated: finalAmount,
                        totalBaseRevenue: baseAmount,
                        totalDiscountGiven: Number(entry.discountAmount || 0),
                    },
                    $set: {
                        lastRedeemedAt: now,
                    },
                }
            )
        )
    );

    return { recorded: true };
}

module.exports = {
    listStorePromotionsForAdmin,
    createStorePromotion,
    updateStorePromotionById,
    deleteStorePromotionById,
    listVisibleStorePromotions,
    listActiveUpfrontPromotions,
    listActiveAutomaticPromotions: listActiveUpfrontPromotions,
    evaluateOrderPricing,
    saveCheckoutOrderContext,
    getCheckoutOrderContext,
    markCheckoutOrderContextCompleted,
    recordPromotionRedemptionFromContext,
};