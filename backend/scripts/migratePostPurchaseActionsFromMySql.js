const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
});

const db = require("../db");
const { connectMongo, mongoose } = require("../mongo");
const { getStoreProductByCode } = require("../services/cmsCatalogService");
const {
    ACTION_KIND_PURCHASE,
    ACTION_KIND_REVOKE,
    REVOKE_ACTION_PRODUCT_CODE,
    upsertLegacyMysqlPostPurchaseAction,
} = require("../services/postPurchaseActionService");

function queryMysql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, rows) => {
            if (error) return reject(error);
            return resolve(rows || []);
        });
    });
}

function closeMysqlPool() {
    return new Promise((resolve, reject) => {
        db.end((error) => {
            if (error) return reject(error);
            return resolve();
        });
    });
}

function asDate(input, fallback = new Date()) {
    const date = input instanceof Date ? input : new Date(input);
    return Number.isFinite(date.getTime()) ? date : fallback;
}

async function runMigration() {
    await connectMongo();

    const mysqlRows = await queryMysql(
        "SELECT id, product_code, server_name, commands_text, is_active, created_at, updated_at FROM postpurchase_actions ORDER BY id ASC"
    );

    if (!mysqlRows.length) {
        console.log("No postpurchase actions found in MySQL; nothing to migrate");
        return;
    }

    const summary = {
        total: mysqlRows.length,
        migrated: 0,
        unresolvedProducts: 0,
        invalidRows: 0,
    };

    const unresolved = [];

    for (const row of mysqlRows) {
        const legacyMysqlId = Number(row.id);
        const productCode = String(row.product_code || "").trim();
        const serverName = String(row.server_name || "").trim();
        const commandsText = String(row.commands_text || "").trim();

        if (!Number.isFinite(legacyMysqlId) || legacyMysqlId <= 0 || !serverName || !commandsText) {
            summary.invalidRows += 1;
            continue;
        }

        const createdAt = asDate(row.created_at, new Date());
        const updatedAt = asDate(row.updated_at, createdAt);
        const isActive = row.is_active !== 0 && row.is_active !== false;

        if (productCode === REVOKE_ACTION_PRODUCT_CODE) {
            await upsertLegacyMysqlPostPurchaseAction({
                legacyMysqlId,
                actionKind: ACTION_KIND_REVOKE,
                productId: "",
                productCategory: "",
                productCodeSnapshot: REVOKE_ACTION_PRODUCT_CODE,
                productNameSnapshot: "",
                serverName,
                commandsText,
                isActive,
                createdAt,
                updatedAt,
            });

            summary.migrated += 1;
            continue;
        }

        const cmsProduct = await getStoreProductByCode(productCode, {
            includeInactive: true,
        });

        if (!cmsProduct?.id) {
            summary.unresolvedProducts += 1;
            unresolved.push({
                legacyMysqlId,
                productCode,
                serverName,
            });
            continue;
        }

        await upsertLegacyMysqlPostPurchaseAction({
            legacyMysqlId,
            actionKind: ACTION_KIND_PURCHASE,
            productId: cmsProduct.id,
            productCategory: cmsProduct.category,
            productCodeSnapshot: cmsProduct.code,
            productNameSnapshot: cmsProduct.name,
            serverName,
            commandsText,
            isActive,
            createdAt,
            updatedAt,
        });

        summary.migrated += 1;
    }

    console.log("Postpurchase actions migration summary:", summary);

    if (unresolved.length > 0) {
        console.warn("Actions skipped because CMS product code mapping was not found:");
        unresolved.forEach((item) => {
            console.warn(
                `  mysql_id=${item.legacyMysqlId} product_code=${item.productCode} server=${item.serverName}`
            );
        });
    }
}

runMigration()
    .then(async () => {
        await mongoose.disconnect();
        await closeMysqlPool();
        console.log("Postpurchase action migration completed");
        process.exit(0);
    })
    .catch(async (error) => {
        console.error("Postpurchase action migration failed:", error.message || error);
        try {
            await mongoose.disconnect();
        } catch (_error) {
            // no-op
        }
        try {
            await closeMysqlPool();
        } catch (_error) {
            // no-op
        }
        process.exit(1);
    });