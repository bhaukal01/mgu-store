const express = require("express");
const mongoose = require("mongoose");
const {
    isImageKitConfigured,
    uploadImageToImageKit,
} = require("../utils/imagekitClient");
const {
    getCategoryConfig,
    listCategoryDocuments,
    getCategoryDocumentById,
    createCategoryDocument,
    updateCategoryDocumentById,
    deleteCategoryDocumentById,
} = require("../services/cmsCatalogService");

const router = express.Router();

function parseBoolean(value) {
    if (value === true || value === "true" || value === 1 || value === "1") return true;
    if (value === false || value === "false" || value === 0 || value === "0") return false;
    return null;
}

function parsePrice(value) {
    if (value === undefined || value === null || value === "") return null;
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue < 0) return null;
    return numberValue;
}

function parseDisplayOrder(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
}

function sanitizePerks(value) {
    if (Array.isArray(value)) {
        return value
            .map((entry) => String(entry || "").trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n/)
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    return null;
}

function buildCommonPayload(body, { isCreate }) {
    const payload = {};

    if (body.code !== undefined || isCreate) {
        const code = String(body.code || "").trim();
        if (!code) return { error: "code is required" };
        payload.code = code;
    }

    if (body.name !== undefined || isCreate) {
        const name = String(body.name || "").trim();
        if (!name) return { error: "name is required" };
        payload.name = name;
    }

    if (body.price !== undefined || isCreate) {
        const price = parsePrice(body.price);
        if (price === null) return { error: "price must be a non-negative number" };
        payload.price = price;
    }

    if (body.description !== undefined) payload.description = String(body.description || "").trim();
    if (body.currency !== undefined) payload.currency = String(body.currency || "INR").trim().toUpperCase();
    if (body.img !== undefined) payload.img = String(body.img || "").trim();

    if (body.perks !== undefined) {
        const perks = sanitizePerks(body.perks);
        if (perks === null) return { error: "perks must be an array or newline text" };
        payload.perks = perks;
    }

    if (body.displayOrder !== undefined) {
        const displayOrder = parseDisplayOrder(body.displayOrder);
        if (displayOrder === null) return { error: "displayOrder must be an integer" };
        payload.displayOrder = displayOrder;
    }

    if (body.isActive !== undefined) {
        const isActive = parseBoolean(body.isActive);
        if (isActive === null) return { error: "isActive must be true or false" };
        payload.isActive = isActive;
    }

    if (body.metadata !== undefined) {
        if (typeof body.metadata !== "object" || body.metadata === null || Array.isArray(body.metadata)) {
            return { error: "metadata must be an object" };
        }
        payload.metadata = body.metadata;
    }

    return { payload };
}

function buildCategoryPayload(category, body, options) {
    const common = buildCommonPayload(body, options);
    if (common.error) return common;

    const payload = common.payload;

    if (category === "ranks") {
        if (body.rankKind !== undefined) {
            const rankKind = String(body.rankKind || "").trim().toLowerCase();
            if (!["lifetime", "subscription"].includes(rankKind)) {
                return { error: "rankKind must be lifetime or subscription" };
            }
            payload.rankKind = rankKind;
        }

        if (body.billingInterval !== undefined) {
            const billingInterval = String(body.billingInterval || "").trim().toLowerCase();
            if (!["none", "monthly"].includes(billingInterval)) {
                return { error: "billingInterval must be none or monthly" };
            }
            payload.billingInterval = billingInterval;
        }
    }

    if (category === "crates") {
        if (body.status !== undefined) {
            const status = String(body.status || "").trim().toLowerCase();
            if (!["live", "soon", "planned", "archived"].includes(status)) {
                return { error: "status must be live, soon, planned, or archived" };
            }
            payload.status = status;
        }

        if (body.info !== undefined) {
            payload.info = String(body.info || "").trim();
        }

        if (body.crateIcon !== undefined) {
            payload.crateIcon = String(body.crateIcon || "").trim();
        }

        if (body.inventoryImage !== undefined) {
            payload.inventoryImage = String(body.inventoryImage || "").trim();
        }
    }

    if (category === "packages") {
        if (body.badge !== undefined) payload.badge = String(body.badge || "").trim();
        if (body.categoryTag !== undefined) payload.categoryTag = String(body.categoryTag || "").trim();
        if (body.packageIcon !== undefined) payload.packageIcon = String(body.packageIcon || "").trim();
    }

    return { payload };
}

function validateCategory(category) {
    const config = getCategoryConfig(category);
    if (!config) return null;
    return config;
}

function handleMongoWriteError(error, res) {
    if (error?.code === 11000) {
        return res.status(409).json({ error: "A product with this code already exists" });
    }

    console.error("CMS write failed:", error.message || error);
    return res.status(500).json({ error: "CMS write failed" });
}

router.get("/upload-image/status", (_req, res) => {
    return res.json({
        configured: isImageKitConfigured(),
    });
});

router.post("/upload-image", async (req, res) => {
    const { fileName, fileData, category } = req.body || {};

    if (!isImageKitConfigured()) {
        return res.status(503).json({ error: "ImageKit is not configured on the server" });
    }

    const normalizedCategory = String(category || "").trim().toLowerCase();
    if (!["ranks", "crates", "packages"].includes(normalizedCategory)) {
        return res.status(400).json({ error: "Uploads are allowed only for ranks, crates, and packages" });
    }

    if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "fileName is required" });
    }

    if (!fileData || typeof fileData !== "string") {
        return res.status(400).json({ error: "fileData is required" });
    }

    // Guardrail to avoid very large in-memory payloads from the admin client.
    if (fileData.length > 15 * 1024 * 1024) {
        return res.status(400).json({ error: "Image payload is too large" });
    }

    try {
        const uploaded = await uploadImageToImageKit({
            fileName,
            fileData,
            category: normalizedCategory,
        });

        return res.json(uploaded);
    } catch (error) {
        console.error("ImageKit upload failed:", error.message || error);
        return res.status(500).json({ error: "Image upload failed" });
    }
});

router.get("/", (_req, res) => {
    return res.json({
        categories: ["ranks", "crates", "packages"],
    });
});

router.get("/:category", async (req, res) => {
    const category = String(req.params.category || "").trim();
    if (!validateCategory(category)) {
        return res.status(404).json({ error: "Unknown category" });
    }

    const includeInactive = parseBoolean(req.query.includeInactive);

    try {
        const rows = await listCategoryDocuments(category, {
            includeInactive: includeInactive !== false,
        });
        return res.json(rows);
    } catch (error) {
        console.error("Failed to fetch CMS category:", error.message || error);
        return res.status(500).json({ error: "Failed to fetch CMS category" });
    }
});

router.get("/:category/:id", async (req, res) => {
    const category = String(req.params.category || "").trim();
    const id = String(req.params.id || "").trim();

    if (!validateCategory(category)) {
        return res.status(404).json({ error: "Unknown category" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    try {
        const row = await getCategoryDocumentById(category, id);
        if (!row) return res.status(404).json({ error: "Item not found" });
        return res.json(row);
    } catch (error) {
        console.error("Failed to fetch CMS item:", error.message || error);
        return res.status(500).json({ error: "Failed to fetch CMS item" });
    }
});

router.post("/:category", async (req, res) => {
    const category = String(req.params.category || "").trim();
    if (!validateCategory(category)) {
        return res.status(404).json({ error: "Unknown category" });
    }

    const { error, payload } = buildCategoryPayload(category, req.body || {}, { isCreate: true });
    if (error) return res.status(400).json({ error });

    try {
        const created = await createCategoryDocument(category, payload);
        return res.status(201).json(created);
    } catch (writeError) {
        return handleMongoWriteError(writeError, res);
    }
});

router.put("/:category/:id", async (req, res) => {
    const category = String(req.params.category || "").trim();
    const id = String(req.params.id || "").trim();

    if (!validateCategory(category)) {
        return res.status(404).json({ error: "Unknown category" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    const { error, payload } = buildCategoryPayload(category, req.body || {}, { isCreate: false });
    if (error) return res.status(400).json({ error });

    if (!Object.keys(payload).length) {
        return res.status(400).json({ error: "No valid fields provided for update" });
    }

    try {
        const updated = await updateCategoryDocumentById(category, id, payload);
        if (!updated) return res.status(404).json({ error: "Item not found" });
        return res.json(updated);
    } catch (writeError) {
        return handleMongoWriteError(writeError, res);
    }
});

router.delete("/:category/:id", async (req, res) => {
    const category = String(req.params.category || "").trim();
    const id = String(req.params.id || "").trim();

    if (!validateCategory(category)) {
        return res.status(404).json({ error: "Unknown category" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid item id" });
    }

    try {
        const deleted = await deleteCategoryDocumentById(category, id);
        if (!deleted) return res.status(404).json({ error: "Item not found" });
        return res.json({ ok: true, deletedId: deleted.id });
    } catch (error) {
        console.error("Failed to delete CMS item:", error.message || error);
        return res.status(500).json({ error: "Failed to delete CMS item" });
    }
});

module.exports = router;
