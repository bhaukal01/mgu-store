const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const purchaseRoutes = require("./routes/purchaseRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cmsRoutes = require("./routes/cmsRoutes");
const Purchase = require("./models/purchaseModel");
const { connectMongo } = require("./mongo");
const app = express();

// app.use(
//     cors({
//         origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : "*",
//         methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     })
// );
app.use(cors());
app.use(express.json());

// 🛒 User Purchases & Payments
app.use("/api/purchase", purchaseRoutes);

// 🧩 Storefront CMS Catalog
app.use("/api/cms", cmsRoutes);

// 🔐 Admin Panel
app.use("/api/admin", adminRoutes);

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

function cleanupExpiredSubscriptions() {
    Purchase.purgeExpiredSubscriptions((err, result) => {
        if (err) {
            console.error("❌ Failed to purge expired subscriptions:", err.message || err);
            return;
        }
        if (result?.affectedRows) {
            console.log(`🧹 Purged ${result.affectedRows} expired subscription rank rows`);
        }
    });
}

// Run once at startup and then every hour.
cleanupExpiredSubscriptions();
setInterval(cleanupExpiredSubscriptions, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectMongo();
    } catch (error) {
        console.error("MongoDB CMS connection failed:", error.message || error);
        process.exit(1);
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer();
