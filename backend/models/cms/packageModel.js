const mongoose = require("mongoose");
const { buildCmsProductSchema } = require("./sharedProductSchema");

const packageSchema = buildCmsProductSchema({
    badge: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
    },
    categoryTag: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
    },
    packageIcon: {
        type: String,
        trim: true,
        default: "",
    },
});

packageSchema.index({ isActive: 1, displayOrder: 1, categoryTag: 1 });

module.exports = mongoose.models.CmsPackage || mongoose.model("CmsPackage", packageSchema, "cms_packages");
