
import { Cart } from '../db/carts.model.js';
import { Product } from '../db/products.model.js';
import { Order } from '../db/orders.model.js';
import { User } from '../db/users.models.js';

export const addCart = async (req, res) => {
    try {
        const { product_id, qty, color, size } = req.body;
        const user_id = req.user._id;

        if (!product_id || !Number.isInteger(Number(qty)) || Number(qty) < 1)
            return res.status(400).json({ message: "Cart Error : missing field" })

        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const price = product.price;
        const inventory = Array.isArray(product.inventory) ? product.inventory : [];
        let variant;

        if (inventory.length) {
            if (!color || !size)
                return res.status(400).json({ message: "Color and size are required for this product" });

            variant = inventory.find((item) => item.color === color && item.size === size);
            if (!variant)
                return res.status(400).json({ message: "This color and size combination is unavailable" });
            if (Number(qty) > variant.stock)
                return res.status(409).json({ message: "Requested quantity exceeds available stock for this variant" });
        }

        const cartVariant = { color: color || null, size: size || null };
        const productExistInCart = await Cart.findOne({ product: product_id, user: user_id, ...cartVariant });

        if (variant && productExistInCart && productExistInCart.qty + Number(qty) > variant.stock)
            return res.status(409).json({ message: "Requested quantity exceeds available stock for this variant" });

        if (productExistInCart) {
            productExistInCart.qty += Number(qty);
            productExistInCart.price = price;
            await productExistInCart.save();
            return res.status(200).json({ message: "Cart updated", productExistInCart })
        }

        const newCartItem = await Cart.create({
            user: user_id,
            product: product_id,
            qty: Number(qty),
            price,
            ...cartVariant
        })

        return res.status(201).json({ message: "Product added to cart", newCartItem })

    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const getCart = async (req, res) => {
    try {
        const user_id = req.user._id;

        if (!user_id)
            return res.status(400).json({ message: "user id is required" })

        const cartItems = await Cart.find({ user: user_id }).populate("product").lean();

        if (cartItems.length === 0)
            return res.status(200).json({ message: "cart is empty", cartItems })

        return res.status(200).json({ message: "cart Fetched successfully", cartItems })

    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const updateCartItemQuantity = async (req, res) => {
    try {
        const { qty } = req.body;
        const { cartItemId } = req.params;
        const user_id = req.user._id;

        if (!cartItemId || !Number.isInteger(Number(qty)) || Number(qty) < 1) {
            return res.status(400).json({ message: "A valid quantity is required" });
        }

        const cartItem = await Cart.findOne({ _id: cartItemId, user: user_id }).populate('product');

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        const product = cartItem.product;
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const inventory = Array.isArray(product.inventory) ? product.inventory : [];

        if (inventory.length > 0) {
            if (!cartItem.color || !cartItem.size) {
                return res.status(400).json({ message: "Color and size are required for this product" });
            }

            const variant = inventory.find((item) => item.color === cartItem.color && item.size === cartItem.size);
            if (!variant) {
                return res.status(400).json({ message: "This color and size combination is unavailable" });
            }

            if (Number(qty) > Number(variant.stock)) {
                return res.status(409).json({ message: "Requested quantity exceeds available stock for this variant" });
            }
        }

        cartItem.qty = Number(qty);
        cartItem.price = product.price;
        await cartItem.save();

        return res.status(200).json({
            message: "Cart item updated successfully",
            cartItem
        });
    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deleteCartItem = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { product_id: cartItemId } = req.params;
        if (!cartItemId || !user_id)
            return res.status(400).json({ message: "all fields are required" })

        let itemDeleted = await Cart.findOneAndDelete({ _id: cartItemId, user: user_id });
        if (!itemDeleted) {
            itemDeleted = await Cart.findOneAndDelete({ user: user_id, product: cartItemId });
        }

        if (!itemDeleted)
            return res.status(404).json({ message: "Item not found" })

        return res.status(200).json({ message: "Item removed successfully" })

    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const cartCheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        const { shippingAddress } = req.body || {};

        if (!userId)
            return res.status(401).json({ message: "User login required" });

        const cartItems = await Cart.find({ user: userId }).populate('product');

        if (cartItems.length === 0)
            return res.status(200).json({ message: "Cart is empty", cartItems: [] });

        let subtotal = 0;
        const orderItems = [];
        const productsToUpdate = [];

        for (const item of cartItems) {
            if (!item.product) {
                return res.status(404).json({ message: "Product not found" });
            }

            const product = item.product;
            const inventory = Array.isArray(product.inventory) ? product.inventory : [];
            const quantity = Number(item.qty);
            const unitPrice = Number(product.price ?? item.price ?? 0);

            if (inventory.length > 0) {
                if (!item.color || !item.size) {
                    return res.status(400).json({ message: "Color and size are required for this product" });
                }

                const variant = inventory.find((variantItem) => variantItem.color === item.color && variantItem.size === item.size);
                if (!variant) {
                    return res.status(400).json({ message: `This color and size combination is unavailable for ${product.name}` });
                }

                if (quantity > Number(variant.stock)) {
                    return res.status(409).json({ message: `Requested quantity exceeds available stock for ${product.name}` });
                }

                const variantIndex = inventory.findIndex((variantItem) => variantItem.color === item.color && variantItem.size === item.size);
                if (variantIndex !== -1) {
                    inventory[variantIndex].stock = Number(inventory[variantIndex].stock) - quantity;
                    productsToUpdate.push(product);
                }
            }

            subtotal += unitPrice * quantity;
            orderItems.push({
                product: product._id,
                name: product.name,
                price: unitPrice,
                quantity,
                ...(item.color ? { color: item.color } : {}),
                ...(item.size ? { size: item.size } : {})
            });
        }

        for (const product of productsToUpdate) {
            product.markModified('inventory');
            await product.save();
        }

        const tax = subtotal * 0.18;
        const finalAmt = subtotal + tax;
        const userData = await User.findById(userId);
        const resolvedShippingAddress = shippingAddress && typeof shippingAddress === 'object'
            ? {
                street: String(shippingAddress.street || userData?.address?.street || '').trim(),
                city: String(shippingAddress.city || userData?.address?.city || '').trim(),
                state: String(shippingAddress.state || userData?.address?.state || '').trim(),
                postalCode: String(shippingAddress.postalCode || userData?.address?.postalCode || '').trim(),
                country: String(shippingAddress.country || userData?.address?.country || 'India').trim()
            }
            : userData?.address || {};

        if (!resolvedShippingAddress.street || !resolvedShippingAddress.city || !resolvedShippingAddress.state || !resolvedShippingAddress.postalCode) {
            return res.status(400).json({ message: 'Please provide a complete shipping address before checkout.' });
        }

        const orderDetails = await Order.create({
            user: userId,
            items: orderItems,
            totalAmount: finalAmt,
            shippingAddress: resolvedShippingAddress,
            paymentId: 'pending',
            deliveryPerson: null,
            trackingHistory: [
                { status: 'Order Placed', timestamp: new Date() }
            ]
        });

        await Cart.deleteMany({ user: userId });

        return res.status(200).json({
            message: "Order created successfully",
            orderDetails
        });

    } catch (error) {
        console.log("ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};