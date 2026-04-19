const mongoose = require("mongoose");

const { Schema } = mongoose;

const VALID_PRODUCT_CATEGORIES = ["ranks", "crates", "packages"];

function normalizeUniqueStringArray(values) {
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

function normalizeCategoryArray(values) {
    return normalizeUniqueStringArray(values)
        .map((entry) => entry.toLowerCase())
        .filter((entry) => VALID_PRODUCT_CATEGORIES.includes(entry));
}

const promotionSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },
        kind: {
            type: String,
            enum: ["upfront", "coupon", "automatic"],
            default: "upfront",
            index: true,
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 80,
            default: "",
        },
        productCode: {
            type: String,
            trim: true,
            maxlength: 120,
            default: "",
            index: true,
        },
        productCodes: {
            type: [{ type: String, trim: true, maxlength: 120 }],
            default: () => [],
        },
        productCategories: {
            type: [{ type: String, enum: VALID_PRODUCT_CATEGORIES }],
            default: () => [],
            index: true,
        },
        discountType: {
            type: String,
            enum: ["percent", "fixed"],
            required: true,
            default: "percent",
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0.01,
        },
        minOrderAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxDiscountAmount: {
            type: Number,
            default: null,
            min: 0,
        },
        usageLimit: {
            type: Number,
            default: null,
            min: 1,
        },
        usagePerUser: {
            type: Number,
            default: null,
            min: 1,
        },
        totalUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalRevenueGenerated: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalBaseRevenue: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalDiscountGiven: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastRedeemedAt: {
            type: Date,
            default: null,
        },
        stackable: {
            type: Boolean,
            default: false,
        },
        showOnStorefront: {
            type: Boolean,
            default: false,
            index: true,
        },
        startsAt: {
            type: Date,
            default: null,
            index: true,
        },
        endsAt: {
            type: Date,
            default: null,
            index: true,
        },
        displayOrder: {
            type: Number,
            default: 0,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

promotionSchema.index({ kind: 1, isActive: 1, startsAt: 1, endsAt: 1, displayOrder: 1 });
promotionSchema.index({ productCode: 1, kind: 1, isActive: 1 });
promotionSchema.index({ productCodes: 1, kind: 1, isActive: 1 });
promotionSchema.index({ productCategories: 1, kind: 1, isActive: 1 });
promotionSchema.index({ kind: 1, showOnStorefront: 1, isActive: 1, displayOrder: 1 });
promotionSchema.index(
    { code: 1 },
    {
        unique: true,
        partialFilterExpression: {
            code: { $type: "string", $ne: "" },
        },
    }
);

promotionSchema.pre("validate", function normalizePromotion(next) {
    this.title = String(this.title || "").trim();
    this.description = String(this.description || "").trim();
    this.kind = String(this.kind || "upfront").trim().toLowerCase();
    if (this.kind === "automatic") {
        this.kind = "upfront";
    }

    this.code = String(this.code || "").trim().toUpperCase();

    this.productCodes = normalizeUniqueStringArray(this.productCodes);
    if (this.productCode) {
        this.productCodes = normalizeUniqueStringArray([
            ...this.productCodes,
            String(this.productCode || "").trim(),
        ]);
    }

    this.productCategories = normalizeCategoryArray(this.productCategories);
    this.productCode = this.productCodes[0] || "";

    this.discountType = String(this.discountType || "percent").trim().toLowerCase();

    if (this.discountValue !== undefined) {
        this.discountValue = Number(this.discountValue);
    }

    if (this.minOrderAmount !== undefined) {
        this.minOrderAmount = Number(this.minOrderAmount) || 0;
    }

    if (this.maxDiscountAmount !== undefined && this.maxDiscountAmount !== null && this.maxDiscountAmount !== "") {
        this.maxDiscountAmount = Number(this.maxDiscountAmount);
    } else {
        this.maxDiscountAmount = null;
    }

    if (this.usageLimit !== undefined && this.usageLimit !== null && this.usageLimit !== "") {
        this.usageLimit = Number.parseInt(this.usageLimit, 10);
    } else {
        this.usageLimit = null;
    }

    if (this.usagePerUser !== undefined && this.usagePerUser !== null && this.usagePerUser !== "") {
        this.usagePerUser = Number.parseInt(this.usagePerUser, 10);
    } else {
        this.usagePerUser = null;
    }

    if (this.displayOrder !== undefined) {
        this.displayOrder = Number.parseInt(this.displayOrder, 10) || 0;
    }

    if (this.totalUsed !== undefined) {
        this.totalUsed = Number.parseInt(this.totalUsed, 10) || 0;
    }

    if (this.totalRevenueGenerated !== undefined) {
        this.totalRevenueGenerated = Number(this.totalRevenueGenerated) || 0;
    }

    if (this.totalBaseRevenue !== undefined) {
        this.totalBaseRevenue = Number(this.totalBaseRevenue) || 0;
    }

    if (this.totalDiscountGiven !== undefined) {
        this.totalDiscountGiven = Number(this.totalDiscountGiven) || 0;
    }

    if (this.kind !== "coupon") {
        this.code = "";
        this.stackable = false;
        this.usageLimit = null;
        this.usagePerUser = null;
    }

    if (this.kind === "upfront") {
        this.minOrderAmount = 0;
        this.maxDiscountAmount = null;
    }

    if (this.discountType === "percent" && this.discountValue > 100) {
        this.invalidate("discountValue", "Percent discount cannot exceed 100");
    }

    if (this.startsAt && this.endsAt && this.endsAt < this.startsAt) {
        this.invalidate("endsAt", "End date must be greater than or equal to start date");
    }

    next();
});

module.exports =
    mongoose.models.CmsStorePromotion ||
    mongoose.model("CmsStorePromotion", promotionSchema, "cms_store_promotions");
