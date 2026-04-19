const mongoose = require("mongoose");

let mongoConnectPromise = null;
let listenersBound = false;

function getNumericEnv(name, fallback, minValue = 0) {
    const parsed = Number.parseInt(process.env[name], 10);
    return Number.isFinite(parsed) && parsed >= minValue ? parsed : fallback;
}

function bindConnectionLogging() {
    if (listenersBound) return;

    mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error.message || error);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
    });

    listenersBound = true;
}

async function connectMongo() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.warn("MongoDB CMS is disabled: MONGO_URI is not configured");
        return null;
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (mongoConnectPromise) {
        return mongoConnectPromise;
    }

    bindConnectionLogging();

    const minPoolSize = getNumericEnv("MONGO_MIN_POOL_SIZE", 2, 0);
    const maxPoolSize = Math.max(
        getNumericEnv("MONGO_MAX_POOL_SIZE", 25, 1),
        minPoolSize || 1
    );

    mongoConnectPromise = mongoose
        .connect(mongoUri, {
            dbName: process.env.MONGO_DB_NAME || "mgu_store_cms",
            appName: process.env.MONGO_APP_NAME || "mgu-store-backend",
            maxPoolSize,
            minPoolSize,
            maxIdleTimeMS: getNumericEnv("MONGO_MAX_IDLE_TIME_MS", 600000, 0),
            connectTimeoutMS: getNumericEnv("MONGO_CONNECT_TIMEOUT_MS", 10000, 1),
            socketTimeoutMS: getNumericEnv("MONGO_SOCKET_TIMEOUT_MS", 30000, 1),
            serverSelectionTimeoutMS: getNumericEnv(
                "MONGO_SERVER_SELECTION_TIMEOUT_MS",
                5000,
                1
            ),
        })
        .then((instance) => {
            const dbName = instance?.connection?.name || "unknown";
            console.log(`MongoDB CMS connected (${dbName})`);
            return instance.connection;
        })
        .catch((error) => {
            mongoConnectPromise = null;
            throw error;
        });

    return mongoConnectPromise;
}

async function disconnectMongo() {
    if (mongoose.connection.readyState === 0) return;

    await mongoose.disconnect();
    mongoConnectPromise = null;
}

module.exports = {
    connectMongo,
    disconnectMongo,
    mongoose,
};
