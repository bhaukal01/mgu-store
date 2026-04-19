const mongoose = require("mongoose");

const { Schema } = mongoose;

const redemptionSchema = new Schema(
    {
        orderId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            index: true,
            unique: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            maxlength: 32,
        },
        usernameLower: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 32,
            index: true,
        },
        productCode: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        promotions: {
            type: [
                {
                    promotionId: {
                        type: Schema.Types.ObjectId,
                        required: true,
                        index: true,
                    },
                    kind: {
                        type: String,
                        enum: ["upfront", "automatic", "coupon"],
                        required: true,
                    },
                    code: {
                        type: String,
                        trim: true,
                        default: "",
                    },
                    discountAmount: {
                        type: Number,
                        required: true,
                        min: 0,
                    },
                },
            ],
            default: () => [],
        },
        baseAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        finalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 8,
            default: "INR",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

redemptionSchema.index({ usernameLower: 1, createdAt: -1 });
redemptionSchema.index({ "promotions.promotionId": 1, usernameLower: 1 });

redemptionSchema.pre("validate", function normalizeRedemption(next) {
    this.orderId = String(this.orderId || "").trim();
    this.username = String(this.username || "").trim();
    this.usernameLower = String(this.usernameLower || this.username || "")
        .trim()
        .toLowerCase();
    this.productCode = String(this.productCode || "").trim();
    this.currency = String(this.currency || "INR").trim().toUpperCase();

    this.promotions = Array.isArray(this.promotions)
        ? this.promotions
            .map((entry) => ({
                promotionId: entry.promotionId,
                kind: String(entry.kind || "upfront").trim().toLowerCase(),
                code: String(entry.code || "").trim().toUpperCase(),
                discountAmount: Number(entry.discountAmount || 0),
            }))
            .filter((entry) => entry.promotionId && entry.discountAmount > 0)
        : [];

    next();
});

module.exports =
    mongoose.models.CmsPromotionRedemption ||
    mongoose.model(
        "CmsPromotionRedemption",
        redemptionSchema,
        "cms_promotion_redemptions"
    );
