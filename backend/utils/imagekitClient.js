const ImageKit = require("imagekit");

let imageKitClient = null;

function isImageKitConfigured() {
    return Boolean(
        process.env.IMAGEKIT_PUBLIC_KEY &&
        process.env.IMAGEKIT_PRIVATE_KEY &&
        process.env.IMAGEKIT_URL_ENDPOINT
    );
}

function getImageKitClient() {
    if (!isImageKitConfigured()) return null;

    if (imageKitClient) return imageKitClient;

    imageKitClient = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });

    return imageKitClient;
}

function normalizeFileName(fileName) {
    const baseName = String(fileName || "product-image")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return baseName || `product-image-${Date.now()}`;
}

function getUploadFolder(category) {
    const root = String(process.env.IMAGEKIT_UPLOAD_FOLDER || "/mgu-store")
        .trim()
        .replace(/\/+$/, "");

    const normalizedCategory = String(category || "products")
        .trim()
        .toLowerCase();

    return `${root}/${normalizedCategory}`;
}

async function uploadImageToImageKit({ fileName, fileData, category }) {
    const client = getImageKitClient();
    if (!client) {
        throw new Error("ImageKit is not configured");
    }

    const safeName = normalizeFileName(fileName);

    return new Promise((resolve, reject) => {
        client.upload(
            {
                file: fileData,
                fileName: safeName,
                folder: getUploadFolder(category),
                useUniqueFileName: true,
            },
            (error, result) => {
                if (error) return reject(error);
                return resolve({
                    fileId: result.fileId,
                    name: result.name,
                    url: result.url,
                    thumbnailUrl: result.thumbnailUrl,
                    width: result.width,
                    height: result.height,
                });
            }
        );
    });
}

module.exports = {
    isImageKitConfigured,
    uploadImageToImageKit,
};
