const { PostPurchaseAction } = require("../models/cms");
const { listAllStoreProducts } = require("./cmsCatalogService");

const ACTION_KIND_PURCHASE = "purchase";
const ACTION_KIND_REVOKE = "revoke";
const REVOKE_ACTION_PRODUCT_CODE = "__REVOKE__";

function toActionDoc(document) {
    if (!document) return null;

    const plain = typeof document.toObject === "function"
        ? document.toObject()
        : document;

    return {
        id: plain._id ? String(plain._id) : String(plain.id || ""),
        actionKind: plain.actionKind || ACTION_KIND_PURCHASE,
        productId: plain.productId ? String(plain.productId) : "",
        productCategory: plain.productCategory || "",
        productCodeSnapshot: plain.productCodeSnapshot || "",
        productNameSnapshot: plain.productNameSnapshot || "",
        serverName: String(plain.serverName || "").trim(),
        commandsText: String(plain.commandsText || "").trim(),
        isActive: plain.isActive !== false,
        legacyMysqlId: Number.isFinite(Number(plain.legacyMysqlId))
            ? Number(plain.legacyMysqlId)
            : null,
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
    };
}

function toAdminActionRow(action, productMap) {
    const isRevoke = action.actionKind === ACTION_KIND_REVOKE;
    const product = action.productId ? productMap.get(action.productId) : null;
    const productCode = isRevoke
        ? REVOKE_ACTION_PRODUCT_CODE
        : String(product?.code || action.productCodeSnapshot || "").trim();
    const productName = isRevoke
        ? ""
        : String(product?.name || action.productNameSnapshot || "").trim();

    return {
        id: action.id,
        action_kind: action.actionKind,
        is_revoke_action: isRevoke,
        product_id: isRevoke ? "" : String(product?.id || action.productId || "").trim(),
        product_category: isRevoke
            ? ""
            : String(product?.category || action.productCategory || "").trim(),
        product_code: productCode,
        product_name: productName,
        product_label: isRevoke
            ? "Revoke Actions"
            : `${productName || "Unknown Product"}${productCode ? ` (${productCode})` : ""}`,
        server_name: action.serverName,
        commands_text: action.commandsText,
        is_active: action.isActive,
        legacy_mysql_id: action.legacyMysqlId,
        created_at: action.createdAt,
        updated_at: action.updatedAt,
    };
}

async function listPostPurchaseActionsForAdmin() {
    const [actions, products] = await Promise.all([
        PostPurchaseAction.find({}).sort({ updatedAt: -1, _id: -1 }).lean(),
        listAllStoreProducts({ includeInactive: true }),
    ]);

    const productMap = new Map(products.map((product) => [product.id, product]));

    return actions
        .map(toActionDoc)
        .filter(Boolean)
        .map((action) => toAdminActionRow(action, productMap));
}

async function listPostPurchaseProductOptions() {
    const products = await listAllStoreProducts({ includeInactive: true });

    return products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        displayName: `${product.name || product.code}${product.code ? ` (${product.code})` : ""}`,
        isActive: product.isActive !== false,
        currency: product.currency || "INR",
    }));
}

async function createPostPurchaseAction(payload) {
    const created = await PostPurchaseAction.create({
        actionKind: payload.actionKind || ACTION_KIND_PURCHASE,
        productId: payload.productId || null,
        productCategory: payload.productCategory || "",
        productCodeSnapshot: payload.productCodeSnapshot || "",
        productNameSnapshot: payload.productNameSnapshot || "",
        serverName: payload.serverName,
        commandsText: payload.commandsText,
        isActive: payload.isActive !== false,
        legacyMysqlId: Number.isFinite(Number(payload.legacyMysqlId))
            ? Number(payload.legacyMysqlId)
            : null,
    });

    return toActionDoc(created);
}

async function updatePostPurchaseActionById(id, payload) {
    const updated = await PostPurchaseAction.findByIdAndUpdate(
        id,
        {
            actionKind: payload.actionKind || ACTION_KIND_PURCHASE,
            productId: payload.productId || null,
            productCategory: payload.productCategory || "",
            productCodeSnapshot: payload.productCodeSnapshot || "",
            productNameSnapshot: payload.productNameSnapshot || "",
            serverName: payload.serverName,
            commandsText: payload.commandsText,
            isActive: payload.isActive !== false,
        },
        {
            new: true,
            runValidators: true,
            lean: true,
        }
    );

    return toActionDoc(updated);
}

async function deletePostPurchaseActionById(id) {
    const deleted = await PostPurchaseAction.findByIdAndDelete(id).lean();
    return toActionDoc(deleted);
}

async function getActivePurchaseActionsByProductId(productId) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return [];

    const rows = await PostPurchaseAction.find({
        actionKind: ACTION_KIND_PURCHASE,
        productId: normalizedProductId,
        isActive: true,
    })
        .sort({ createdAt: 1, _id: 1 })
        .lean();

    return rows.map(toActionDoc).filter(Boolean);
}

async function getActiveRevokeActions({ actionId } = {}) {
    const filter = {
        actionKind: ACTION_KIND_REVOKE,
        isActive: true,
    };

    if (actionId) {
        filter._id = String(actionId).trim();
    }

    const rows = await PostPurchaseAction.find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .lean();

    return rows.map(toActionDoc).filter(Boolean);
}

async function upsertLegacyMysqlPostPurchaseAction(payload) {
    const legacyMysqlId = Number(payload.legacyMysqlId);
    if (!Number.isFinite(legacyMysqlId) || legacyMysqlId <= 0) {
        throw new Error("legacyMysqlId must be a positive number");
    }

    await PostPurchaseAction.updateOne(
        { legacyMysqlId },
        {
            $set: {
                actionKind: payload.actionKind || ACTION_KIND_PURCHASE,
                productId: payload.productId || null,
                productCategory: payload.productCategory || "",
                productCodeSnapshot: payload.productCodeSnapshot || "",
                productNameSnapshot: payload.productNameSnapshot || "",
                serverName: payload.serverName,
                commandsText: payload.commandsText,
                isActive: payload.isActive !== false,
                createdAt: payload.createdAt || new Date(),
                updatedAt: payload.updatedAt || new Date(),
            },
            $setOnInsert: {
                legacyMysqlId,
            },
        },
        {
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
            timestamps: false,
        }
    );

    const row = await PostPurchaseAction.findOne({ legacyMysqlId }).lean();
    return toActionDoc(row);
}

module.exports = {
    ACTION_KIND_PURCHASE,
    ACTION_KIND_REVOKE,
    REVOKE_ACTION_PRODUCT_CODE,
    listPostPurchaseActionsForAdmin,
    listPostPurchaseProductOptions,
    createPostPurchaseAction,
    updatePostPurchaseActionById,
    deletePostPurchaseActionById,
    getActivePurchaseActionsByProductId,
    getActiveRevokeActions,
    upsertLegacyMysqlPostPurchaseAction,
};