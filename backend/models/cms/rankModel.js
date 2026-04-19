const mongoose = require("mongoose");
const { buildCmsProductSchema } = require("./sharedProductSchema");

const rankSchema = buildCmsProductSchema({
    rankKind: {
        type: String,
        enum: ["lifetime", "subscription"],
        default: "lifetime",
        index: true,
    },
    billingInterval: {
        type: String,
        enum: ["none", "monthly"],
        default: "none",
    },
});

rankSchema.index({ rankKind: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.models.CmsRank || mongoose.model("CmsRank", rankSchema, "cms_ranks");
