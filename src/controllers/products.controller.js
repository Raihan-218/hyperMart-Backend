import { Product } from "../db/products.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import mongoose from "mongoose";
import fs from "fs";

const removeLocalUploads = (files = []) => {
    for (const file of files) {
        if (!file.path || !fs.existsSync(file.path)) continue;
        try {
            fs.unlinkSync(file.path);
        } catch (error) {
            console.error(`Unable to remove temporary product image ${file.path}:`, error);
        }
    }
};

const parseColors = (value) => {
    if (value == null || value === "") return [];
    const colors = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(colors)) throw new Error("Colors must be an array");

    return colors.map((color) => {
        if (typeof color === "string") {
            const name = color.trim();
            if (!name) throw new Error("Each color must include a name");
            return { name };
        }
        if (!color || typeof color !== "object" || Array.isArray(color)) {
            throw new Error("Each color must be a name or color object");
        }
        const name = String(color?.name || "").trim();
        const rawHex = String(color?.hex || "").trim();
        if (!name) throw new Error("Each color must include a name");
        const hex = rawHex && !rawHex.startsWith("#") ? `#${rawHex}` : rawHex;
        if (hex && !/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hex)) {
            throw new Error(`Invalid hex value for color "${name || "unnamed"}"`);
        }
        return { name, ...(hex ? { hex } : {}) };
    });
};

const parseInventory = (value) => {
    if (value == null || value === "") return [];
    const inventory = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(inventory)) throw new Error("Inventory must be an array");

    const normalizedInventory = inventory.map((item) => {
        const color = String(item?.color ?? "").trim();
        const size = String(item?.size ?? "").trim();
        const rawStock = item?.stock;
        const stock = rawStock == null ? 0 : Number(rawStock);

        if (!color || !size) {
            throw new Error("Each inventory item must include both a color and size");
        }
        if (
            (rawStock != null && !["number", "string"].includes(typeof rawStock)) ||
            (typeof rawStock === "string" && rawStock.trim() === "") ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            throw new Error("Inventory stock must be a non-negative whole number");
        }

        return {
            color,
            size,
            stock,
        };
    });
    const variantKeys = normalizedInventory.map((item) => `${item.color}\u0000${item.size}`);
    if (new Set(variantKeys).size !== variantKeys.length) {
        throw new Error("Inventory cannot contain duplicate color and size combinations");
    }
    return normalizedInventory;
};

const parseSizes = (value) => {
    if (value == null || value === "") return [];
    const sizes = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(sizes)) throw new Error("Sizes must be an array");

    if (sizes.some((size) => !["string", "number"].includes(typeof size))) {
        throw new Error("Each size must be text or a number");
    }
    return [...new Set(sizes.map((size) => String(size).trim()).filter(Boolean))];
};

export const getProducts = async (req, res) => {
    try {
        const { category, type, search, sort } = req.query;
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
        let query = {};
        if (category) query.category = category;
        if (type) query.type = type;
        const minPrice = Number(req.query.minPrice);
        const maxPrice = Number(req.query.maxPrice);
        if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
            query.price = {};
            if (Number.isFinite(minPrice)) query.price.$gte = minPrice;
            if (Number.isFinite(maxPrice)) query.price.$lte = maxPrice;
        }
        if (search?.trim()) query.name = { $regex: search.trim().replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), $options: "i" };
        if (req.query.inStock === "true") query["inventory.stock"] = { $gt: 0 };

        const sortOptions = {
            newest: { createdAt: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
            rating: { averageRating: -1, numReviews: -1 },
            name: { name: 1 },
        };
        const [products, total, types] = await Promise.all([
            Product.find(query).sort(sortOptions[sort] || { createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            Product.countDocuments(query),
            Product.distinct("type", category ? { category } : {}),
        ]);
        return res.status(200).json({ products, types: types.filter(Boolean).sort(), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.log('ERROR :', error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message, stack: error.stack })
    }
}


export const addproducts = async (req, res) => {
    try {
        console.log(req.body);

        const { name, description, price, category, type } = req.body;
        console.log("this is image file :", req.files);

        if (
            typeof name !== "string" || !name.trim() ||
            typeof description !== "string" || !description.trim() ||
            price === undefined || price === "" ||
            typeof type !== "string" || !type.trim() ||
            !["men", "women", "kids"].includes(category)
        )
            return res.status(400).json({ message: "all fields are required" })
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ message: "Price must be a non-negative number" });
        }

        let colors;
        let sizes = [];
        let inventory = [];
        try {
            colors = parseColors(req.body.colors);
            sizes = parseSizes(req.body.sizes);
            if (Object.hasOwn(req.body, "inventory")) {
                inventory = parseInventory(req.body.inventory);
            }
        } catch (error) {
            return res.status(400).json({ message: error.message || "colors, sizes, or inventory must be valid arrays" });
        }

        if (!req.files || req.files.length === 0)
            return res.status(400).json({ message: "product images are required" });

        let uploadedImages = [];

        for (let file of req.files) {
            const cloudImg = await uploadOnCloudinary(file.path);
            if (!cloudImg)
                return res.status(500).json({ message: "Image upload failed on cloudinary" })

            if (cloudImg)
                uploadedImages.push(cloudImg)
        }

        if (uploadedImages.length === 0)
            return res.status(500).json({ message: "images upload failed" })

        // Fix: Extract URLs only, as schema expects [String]
        const imageUrls = uploadedImages.map(img => ({
            url: img.url,
            public_id: img.public_id
        }));
        const newProduct = await Product.create({
            name,
            description,
            price: numericPrice,
            category,
            type,
            colors,
            sizes,
            inventory,
            images: imageUrls
        });

        if (!newProduct)
            return res.status(500).json({ message: "product not created" })

        return res.status(201).json({ message: "product added successfully", Product: newProduct });
    } catch (error) {
        console.log('ERROR :', error);
        return res.status(500).json({ message: "Internal Server Error" })
    } finally {
        removeLocalUploads(req.files);
    }
}

export const    getSingleProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Check for undefined or invalid ID format (simple check)
        if (!id || id === 'undefined') {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(id);

        if (!product)
            return res.status(404).json({ message: "Product not found" })

        return res.status(200).json({ product })

    } catch (error) {
        console.log("ERROR :", error);
        // Handle CastError specifically
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid product ID format" });
        }
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const updateProduct = async (req, res) => {
    const uploadedImages = [];
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const body = req.body || {};
        const updates = {};
        if (Object.hasOwn(body, "name")) {
            if (typeof body.name !== "string" || !body.name.trim()) {
                return res.status(400).json({ message: "Product name is required" });
            }
            updates.name = body.name.trim();
        }
        if (Object.hasOwn(body, "description")) {
            if (typeof body.description !== "string" || !body.description.trim()) {
                return res.status(400).json({ message: "Product description is required" });
            }
            updates.description = body.description.trim();
        }
        if (Object.hasOwn(body, "price")) {
            const price = Number(body.price);
            if (!["number", "string"].includes(typeof body.price) || String(body.price).trim() === "" || !Number.isFinite(price) || price < 0) {
                return res.status(400).json({ message: "Price must be a non-negative number" });
            }
            updates.price = price;
        }
        if (Object.hasOwn(body, "category")) {
            if (!["men", "women", "kids"].includes(body.category)) {
                return res.status(400).json({ message: "Category must be men, women, or kids" });
            }
            updates.category = body.category;
        }
        if (Object.hasOwn(body, "type")) {
            if (typeof body.type !== "string" || !body.type.trim()) {
                return res.status(400).json({ message: "Product type is required" });
            }
            updates.type = body.type.trim();
        }

        try {
            for (const field of ["colors", "sizes", "inventory"]) {
                if (Object.hasOwn(body, field) && (body[field] == null || body[field] === "")) {
                    throw new Error(`${field} must be a valid array`);
                }
            }
            if (Object.hasOwn(body, "colors")) updates.colors = parseColors(body.colors);
            if (Object.hasOwn(body, "sizes")) updates.sizes = parseSizes(body.sizes);
            if (Object.hasOwn(body, "inventory")) updates.inventory = parseInventory(body.inventory);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Colors, sizes, or inventory must be valid arrays" });
        }

        let retainedImages = product.images.map((image) => ({ url: image.url, public_id: image.public_id }));
        if (Object.hasOwn(body, "existingImages")) {
            let requestedImages;
            try {
                requestedImages = typeof body.existingImages === "string"
                    ? JSON.parse(body.existingImages)
                    : body.existingImages;
            } catch {
                return res.status(400).json({ message: "Existing images must be a valid array" });
            }
            if (!Array.isArray(requestedImages)) {
                return res.status(400).json({ message: "Existing images must be a valid array" });
            }

            const originalImages = product.images.map((image) => ({ url: image.url, public_id: image.public_id }));
            retainedImages = [];
            const seenImageUrls = new Set();
            for (const requested of requestedImages) {
                if (!requested || typeof requested.url !== "string" || seenImageUrls.has(requested.url)) {
                    return res.status(400).json({ message: "Existing image data is invalid or duplicated" });
                }
                const original = originalImages.find((image) => (
                    image.url === requested.url &&
                    (!requested.public_id || requested.public_id === image.public_id)
                ));
                if (!original) {
                    return res.status(400).json({ message: "Only images already attached to this product can be retained" });
                }
                seenImageUrls.add(original.url);
                retainedImages.push(original);
            }
        }

        const files = req.files || [];
        if (retainedImages.length + files.length > 5) {
            return res.status(400).json({ message: "A product can have no more than 5 images" });
        }
        const imagesChanged = Object.hasOwn(body, "existingImages") || files.length > 0;
        if (imagesChanged && retainedImages.length + files.length === 0) {
            return res.status(400).json({ message: "A product must have at least one image" });
        }

        for (const file of files) {
            const cloudImage = await uploadOnCloudinary(file.path);
            if (!cloudImage) {
                for (const uploaded of uploadedImages) {
                    if (uploaded.public_id) await deleteOnCloudinary(uploaded.public_id);
                }
                return res.status(500).json({ message: "Image upload failed. The product was not updated." });
            }
            uploadedImages.push({ url: cloudImage.url, public_id: cloudImage.public_id });
        }

        const originalImages = product.images.map((image) => ({ url: image.url, public_id: image.public_id }));
        if (imagesChanged) product.images = [...retainedImages, ...uploadedImages];
        product.set(updates);
        const updatedProduct = await product.save();

        let imageCleanupWarning = false;
        const retainedPublicIds = new Set(updatedProduct.images.map((image) => image.public_id).filter(Boolean));
        for (const image of originalImages) {
            if (image.public_id && !retainedPublicIds.has(image.public_id)) {
                try {
                    await deleteOnCloudinary(image.public_id);
                } catch (cleanupError) {
                    imageCleanupWarning = true;
                    console.error(`Unable to remove replaced product image ${image.public_id}:`, cleanupError);
                }
            }
        }

        return res.status(200).json({
            message: imageCleanupWarning
                ? "Product updated, but one or more removed images could not be deleted from storage."
                : "Product updated successfully",
            updatedProduct
        });
    } catch (error) {
        for (const uploaded of uploadedImages) {
            if (uploaded.public_id) {
                try {
                    await deleteOnCloudinary(uploaded.public_id);
                } catch (cleanupError) {
                    console.error(`Unable to clean up uploaded product image ${uploaded.public_id}:`, cleanupError);
                }
            }
        }
        console.log("ERROR :", error);
        if (error.code === 11000) {
            return res.status(409).json({ message: "A product with conflicting data already exists" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Internal Server Error" })
    } finally {
        removeLocalUploads(req.files);
    }
}


export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);

        if (!product)
            return res.status(404).json({ message: "product not found" })

        for (let file of product.images) {
            await deleteOnCloudinary(file.public_id);
        }

        await Product.findByIdAndDelete(id);

        return res.status(200).json({ message: "product deleted successfully" })

    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}
