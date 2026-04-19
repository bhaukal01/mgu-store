const express = require("express");
const {
    getStorefrontCatalog,
    listCategoryDocuments,
} = require("../services/cmsCatalogService");

const router = express.Router();

router.get("/storefront", async (_req, res) => {
    try {
        const catalog = await getStorefrontCatalog();
        return res.json(catalog);
    } catch (error) {
        console.error("Failed to load storefront catalog:", error.message || error);
        return res.status(500).json({ error: "Failed to load storefront catalog" });
    }
});

router.get("/ranks", async (_req, res) => {
    try {
        const rows = await listCategoryDocuments("ranks", { includeInactive: false });
        return res.json(rows);
    } catch (error) {
        console.error("Failed to load ranks catalog:", error.message || error);
        return res.status(500).json({ error: "Failed to load ranks catalog" });
    }
});

router.get("/crates", async (_req, res) => {
    try {
        const rows = await listCategoryDocuments("crates", { includeInactive: false });
        return res.json(rows);
    } catch (error) {
        console.error("Failed to load crates catalog:", error.message || error);
        return res.status(500).json({ error: "Failed to load crates catalog" });
    }
});

router.get("/packages", async (_req, res) => {
    try {
        const rows = await listCategoryDocuments("packages", { includeInactive: false });
        return res.json(rows);
    } catch (error) {
        console.error("Failed to load packages catalog:", error.message || error);
        return res.status(500).json({ error: "Failed to load packages catalog" });
    }
});

module.exports = router;
