import { Product } from "../db/products.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.utils.js";

const parseColors = (value) => {
    if (value == null || value === "") return [];
    const colors = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(colors)) throw new Error("Colors must be an array");

    return colors.map((color) => {
        if (typeof color === "string") return { name: color.trim() };
        const name = String(color?.name || "").trim();
        const rawHex = String(color?.hex || "").trim();
        const hex = rawHex && !rawHex.startsWith("#") ? `#${rawHex}` : rawHex;
        if (hex && !/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hex)) {
            throw new Error(`Invalid hex value for color "${name || "unnamed"}"`);
        }
        return { name, ...(hex ? { hex } : {}) };
    }).filter((color) => color.name);
};

const parseInventory = (value) => {
    if (value == null || value === "") return [];
    const inventory = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(inventory)) throw new Error("Inventory must be an array");

    return inventory.map((item) => {
        const color = String(item?.color ?? "").trim();
        const size = String(item?.size ?? "").trim();
        const stock = Number(item?.stock ?? 0);

        if (!color || !size) {
            throw new Error("Each inventory item must include both a color and size");
        }
        if (!Number.isInteger(stock) || stock < 0) {
            throw new Error("Inventory stock must be a non-negative whole number");
        }

        return {
            color,
            size,
            stock,
        };
    }).filter((item) => item.color && item.size);
};

const parseSizes = (value) => {
    if (value == null || value === "") return [];
    const sizes = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(sizes)) throw new Error("Sizes must be an array");

    return [...new Set(sizes.map((size) => String(size ?? "").trim()).filter(Boolean))];
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

        if (!name || !description || !price || !category || !type)
            return res.status(400).json({ message: "all fields are required" })

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
            price: Number(price),
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
    try {
        const { id } = req.params;
        const { name, description, price, category, type } = req.body;

        const updates = {}

        if (name) updates.name = name;
        if (description) updates.description = description;
        if (price) updates.price = Number(price);
        if (category) updates.category = category;
        if (type) updates.type = type;
        if (Object.hasOwn(req.body, "colors")) {
            try {
                updates.colors = parseColors(req.body.colors);
            } catch {
                return res.status(400).json({ message: "colors must be a valid array" });
            }
            if (Object.hasOwn(req.body, "sizes")) {
                try {
                    updates.sizes = parseSizes(req.body.sizes);
                } catch {
                    return res.status(400).json({ message: "sizes must be a valid array" });
                }
            }
        }
        if (Object.hasOwn(req.body, "inventory")) {
            try {
                updates.inventory = parseInventory(req.body.inventory);
            } catch (error) {
                return res.status(400).json({ message: error.message || "inventory must be a valid array" });
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, {
            $set: updates
        }, {
            new: true,
            runValidators: true
        })

        if (!updatedProduct)
            return res.status(404).json({ message: "product not found" })
        return res.status(201).json({ message: "product updated successfully", updatedProduct })


    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" })
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
