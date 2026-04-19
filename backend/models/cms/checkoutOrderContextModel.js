const mongoose = require("mongoose");

const { Schema } = mongoose;

const checkoutOrderContextSchema = new Schema(
    {
        orderId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
            unique: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            maxlength: 32,
        },
        productId: {
            type: String,
            required: true,
            trim: true,
            maxlength: 64,
            index: true,
        },
        productCode: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        mode: {
            type: String,
            enum: ["buy", "rankup"],
            required: true,
            default: "buy",
        },
        fromLifetimeRank: {
            type: String,
            trim: true,
            default: "NONE",
            maxlength: 120,
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
        discountAmountAutomatic: {
            type: Number,
            default: 0,
            min: 0,
        },
        discountAmountCoupon: {
            type: Number,
            default: 0,
            min: 0,
        },
        discountAmountTotal: {
            type: Number,
            default: 0,
            min: 0,
        },
        automaticPromotionId: {
            type: Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        couponPromotionId: {
            type: Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        automaticPromotionCode: {
            type: String,
            trim: true,
            default: "",
            maxlength: 80,
        },
        couponPromotionCode: {
            type: String,
            trim: true,
            default: "",
            maxlength: 80,
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
        status: {
            type: String,
            enum: ["pending", "completed"],
            default: "pending",
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

checkoutOrderContextSchema.index({ createdAt: -1, status: 1 });

checkoutOrderContextSchema.pre("validate", function normalizeCheckoutContext(next) {
    this.orderId = String(this.orderId || "").trim();
    this.username = String(this.username || "").trim();
    this.productId = String(this.productId || "").trim();
    this.productCode = String(this.productCode || "").trim();
    this.mode = String(this.mode || "buy").trim().toLowerCase();
    this.fromLifetimeRank = String(this.fromLifetimeRank || "NONE").trim() || "NONE";
    this.currency = String(this.currency || "INR").trim().toUpperCase();

    this.baseAmount = Number(this.baseAmount || 0);
    this.finalAmount = Number(this.finalAmount || 0);
    this.discountAmountAutomatic = Number(this.discountAmountAutomatic || 0);
    this.discountAmountCoupon = Number(this.discountAmountCoupon || 0);
    this.discountAmountTotal = Number(this.discountAmountTotal || 0);

    this.automaticPromotionCode = String(this.automaticPromotionCode || "")
        .trim()
        .toUpperCase();
    this.couponPromotionCode = String(this.couponPromotionCode || "")
        .trim()
        .toUpperCase();

    next();
});

module.exports =
    mongoose.models.CheckoutOrderContext ||
    mongoose.model(
        "CheckoutOrderContext",
        checkoutOrderContextSchema,
        "checkout_order_contexts"
    );
