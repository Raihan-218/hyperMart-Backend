import { Product } from "../db/products.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.utils.js";

export const getProducts = async (req, res) => {
    try {
        const { category, type } = req.query;
        let query = {};
        if (category) query.category = category;
        if (type) query.type = type;

        const products = await Product.find(query);

        if (!products || products.length === 0)
            return res.status(200).json({ products: [] })


        return res.status(200).json({ products })
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

export const getSingleProduct = async (req, res) => {
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