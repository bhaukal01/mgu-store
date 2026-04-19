const mongoose = require("mongoose");

const { Schema } = mongoose;

function sanitizePerks(perks) {
    if (!Array.isArray(perks)) return [];

    const seen = new Set();

    return perks
        .map((perk) => String(perk || "").trim())
        .filter((perk) => {
            if (!perk) return false;
            if (seen.has(perk)) return false;
            seen.add(perk);
            return true;
        });
}

function buildCmsProductSchema(extraFields = {}) {
    const schema = new Schema(
        {
            code: {
                type: String,
                required: true,
                trim: true,
                maxlength: 120,
            },
            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 120,
            },
            description: {
                type: String,
                trim: true,
                maxlength: 2000,
                default: "",
            },
            price: {
                type: Number,
                required: true,
                min: 0,
            },
            currency: {
                type: String,
                trim: true,
                uppercase: true,
                minlength: 3,
                maxlength: 3,
                default: "INR",
            },
            img: {
                type: String,
                trim: true,
                default: "",
            },
            perks: {
                type: [{ type: String, trim: true, maxlength: 280 }],
                default: () => [],
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
            metadata: {
                type: Schema.Types.Mixed,
                default: () => ({}),
            },
            ...extraFields,
        },
        {
            timestamps: true,
            versionKey: false,
            minimize: false,
        }
    );

    schema.index({ code: 1 }, { unique: true });
    schema.index({ isActive: 1, displayOrder: 1, name: 1 });

    schema.pre("validate", function normalizeProduct(next) {
        if (this.price !== undefined) {
            this.price = Number(this.price);
        }

        if (this.displayOrder !== undefined) {
            this.displayOrder = Number.parseInt(this.displayOrder, 10) || 0;
        }

        this.perks = sanitizePerks(this.perks);
        next();
    });

    schema.set("toJSON", {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            return ret;
        },
    });

    return schema;
}

module.exports = {
    buildCmsProductSchema,
};
