const fs = require("fs");
const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
});

const { connectMongo, mongoose } = require("../mongo");
const { Rank, Crate, Package } = require("../models/cms");

const rankDataPath = path.resolve(__dirname, "../../client/src/data/ranks.json");

const defaultCrates = [
    {
        code: "nether-armory-crate",
        name: "Nether Armory Crate",
        price: 349,
        info: "Weapon skins, trail effects, and combat banner drops.",
        description: "Weapon skins, trail effects, and combat banner drops.",
        status: "soon",
        displayOrder: 1,
        isActive: true,
        currency: "INR",
        perks: [],
        img: "",
    },
    {
        code: "overworld-builder-crate",
        name: "Overworld Builder Crate",
        price: 299,
        info: "Build particles, island cosmetics, and structure themes.",
        description: "Build particles, island cosmetics, and structure themes.",
        status: "planned",
        displayOrder: 2,
        isActive: true,
        currency: "INR",
        perks: [],
        img: "",
    },
];

const defaultPackages = [
    {
        code: "starter-bundle",
        name: "Starter Bundle",
        price: 499,
        description: "Starter progression bundle with utility perks and cosmetics.",
        badge: "Starter",
        categoryTag: "bundle",
        displayOrder: 1,
        isActive: true,
        currency: "INR",
        perks: [
            "Exclusive starter cosmetic",
            "Priority support queue",
            "Bonus seasonal crate key",
        ],
        img: "",
    },
    {
        code: "builder-bundle",
        name: "Builder Bundle",
        price: 799,
        description: "Builder-focused bundle with particles, themes, and utility boosts.",
        badge: "Popular",
        categoryTag: "bundle",
        displayOrder: 2,
        isActive: true,
        currency: "INR",
        perks: [
            "Island cosmetic kit",
            "Build particle collection",
            "Expanded utility commands",
        ],
        img: "",
    },
];

function loadStaticRankData() {
    const raw = fs.readFileSync(rankDataPath, "utf8");
    return JSON.parse(raw);
}

function buildRankDocs(staticData) {
    const currency = String(staticData?.currency || "INR").trim() || "INR";
    const lifetimeRanks = Array.isArray(staticData?.lifetimeRanks)
        ? staticData.lifetimeRanks
        : [];
    const subscriptionRanks = Array.isArray(staticData?.subscriptionRanks)
        ? staticData.subscriptionRanks
        : [];

    const docs = [];

    lifetimeRanks.forEach((item, index) => {
        docs.push({
            code: item.code,
            name: item.name,
            description: item.description || "",
            price: Number(item.price || 0),
            currency,
            img: item.img || "",
            perks: Array.isArray(item.perks) ? item.perks : [],
            displayOrder: index + 1,
            isActive: true,
            rankKind: "lifetime",
            billingInterval: "none",
        });
    });

    subscriptionRanks.forEach((item, index) => {
        docs.push({
            code: item.code,
            name: item.name,
            description: item.description || "",
            price: Number(item.price || 0),
            currency,
            img: item.img || "",
            perks: Array.isArray(item.perks) ? item.perks : [],
            displayOrder: lifetimeRanks.length + index + 1,
            isActive: true,
            rankKind: "subscription",
            billingInterval: "monthly",
        });
    });

    return docs;
}

async function upsertMany(model, docs, label) {
    for (const doc of docs) {
        await model.updateOne(
            { code: doc.code },
            { $set: doc },
            { upsert: true }
        );
    }

    const total = await model.countDocuments({});
    console.log(`Seeded ${label}: ${docs.length} upserts (${total} total in collection)`);
}

async function run() {
    await connectMongo();

    const staticRankData = loadStaticRankData();
    const rankDocs = buildRankDocs(staticRankData);

    await upsertMany(Rank, rankDocs, "ranks");
    await upsertMany(Crate, defaultCrates, "crates");
    await upsertMany(Package, defaultPackages, "packages");

    await mongoose.disconnect();
}

run()
    .then(() => {
        console.log("CMS seed completed");
        process.exit(0);
    })
    .catch((error) => {
        console.error("CMS seed failed:", error.message || error);
        process.exit(1);
    });
