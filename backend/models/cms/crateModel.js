const mongoose = require("mongoose");
const { buildCmsProductSchema } = require("./sharedProductSchema");

const crateSchema = buildCmsProductSchema({
    status: {
        type: String,
        enum: ["live", "soon", "planned", "archived"],
        default: "planned",
        index: true,
    },
    info: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
    },
    crateIcon: {
        type: String,
        trim: true,
        default: "",
    },
    inventoryImage: {
        type: String,
        trim: true,
        default: "",
    },
});

crateSchema.index({ status: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.models.CmsCrate || mongoose.model("CmsCrate", crateSchema, "cms_crates");
