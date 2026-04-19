const mongoose = require("mongoose");

const { Schema } = mongoose;

const actionSchema = new Schema(
    {
        actionKind: {
            type: String,
            enum: ["purchase", "revoke"],
            required: true,
            default: "purchase",
            index: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        productCategory: {
            type: String,
            enum: ["", "ranks", "crates", "packages"],
            default: "",
        },
        productCodeSnapshot: {
            type: String,
            trim: true,
            maxlength: 120,
            default: "",
        },
        productNameSnapshot: {
            type: String,
            trim: true,
            maxlength: 160,
            default: "",
        },
        serverName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        commandsText: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20000,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        legacyMysqlId: {
            type: Number,
            default: null,
            index: true,
            sparse: true,
            unique: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

actionSchema.index({ actionKind: 1, isActive: 1, productId: 1, serverName: 1 });
actionSchema.index({ updatedAt: -1, createdAt: -1 });

actionSchema.pre("validate", function normalizeAction(next) {
    this.serverName = String(this.serverName || "").trim();
    this.commandsText = String(this.commandsText || "").trim();
    this.productCodeSnapshot = String(this.productCodeSnapshot || "").trim();
    this.productNameSnapshot = String(this.productNameSnapshot || "").trim();

    if (this.actionKind === "revoke") {
        this.productId = null;
        this.productCategory = "";
    }

    next();
});

actionSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
    },
});

module.exports =
    mongoose.models.CmsPostPurchaseAction ||
    mongoose.model("CmsPostPurchaseAction", actionSchema, "cms_postpurchase_actions");