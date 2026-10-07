
import mongoose from 'mongoose';
import { Cart } from '../db/carts.model.js';
import { Product } from '../db/products.model.js';
import { Order } from '../db/orders.model.js';
import { User } from '../db/users.models.js';

const TAX_RATE = 0.18;

const roundMoney = (amount) => Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const calculateOrderTotals = (cartItems) => {
    const subtotalInCents = cartItems.reduce((sum, item) => {
        const unitPrice = Number(item.product?.price ?? item.price ?? 0);
        return sum + Math.round((unitPrice + Number.EPSILON) * 100) * Number(item.qty);
    }, 0);
    const taxInCents = Math.round(subtotalInCents * TAX_RATE);
    const shippingInCents = 0;
    const discountInCents = 0;

    return {
        subtotal: subtotalInCents / 100,
        taxAmount: taxInCents / 100,
        shippingAmount: shippingInCents / 100,
        discountAmount: discountInCents / 100,
        totalAmount: (subtotalInCents + taxInCents + shippingInCents - discountInCents) / 100
    };
};

const createHttpError = (status, message) => Object.assign(new Error(message), { status });

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
            return res.status(200).json({ message: "cart is empty", cartItems, totals: calculateOrderTotals(cartItems) })

        return res.status(200).json({ message: "cart Fetched successfully", cartItems, totals: calculateOrderTotals(cartItems) })

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
    let session;
    try {
        session = await mongoose.startSession();
        const userId = req.user._id;
        const { shippingAddress } = req.body || {};

        if (!userId)
            return res.status(401).json({ message: "User login required" });

        let orderDetails;
        let emptyCart = false;
        await session.withTransaction(async () => {
            const cartItems = await Cart.find({ user: userId }).populate('product').session(session);
            if (cartItems.length === 0) {
                emptyCart = true;
                return;
            }

            const userData = await User.findById(userId).session(session);
            const address = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : {};
            const resolvedShippingAddress = {
                street: String(address.street || userData?.address?.street || '').trim(),
                city: String(address.city || userData?.address?.city || '').trim(),
                state: String(address.state || userData?.address?.state || '').trim(),
                postalCode: String(address.postalCode || userData?.address?.postalCode || '').trim(),
                country: String(address.country || userData?.address?.country || 'India').trim()
            };

            if (!resolvedShippingAddress.street || !resolvedShippingAddress.city || !resolvedShippingAddress.state || !resolvedShippingAddress.postalCode) {
                throw createHttpError(400, 'Please provide a complete shipping address before checkout.');
            }

            const orderItems = [];
            const inventoryItems = [];
            for (const item of cartItems) {
                if (!item.product) {
                    throw createHttpError(404, 'Product not found');
                }

                const product = item.product;
                const inventory = Array.isArray(product.inventory) ? product.inventory : [];
                const quantity = Number(item.qty);
                const unitPrice = roundMoney(Number(product.price ?? item.price ?? 0));

                if (inventory.length > 0) {
                    if (!item.color || !item.size) {
                        throw createHttpError(400, 'Color and size are required for this product');
                    }

                    const variant = inventory.find((variantItem) => variantItem.color === item.color && variantItem.size === item.size);
                    if (!variant) {
                        throw createHttpError(400, `This color and size combination is unavailable for ${product.name}`);
                    }
                    if (quantity > Number(variant.stock)) {
                        throw createHttpError(409, `Requested quantity exceeds available stock for ${product.name}`);
                    }
                    inventoryItems.push({ productId: product._id, color: item.color, size: item.size, quantity, name: product.name });
                }

                orderItems.push({
                    product: product._id,
                    name: product.name,
                    price: unitPrice,
                    quantity,
                    ...(item.color ? { color: item.color } : {}),
                    ...(item.size ? { size: item.size } : {})
                });
            }

            const totals = calculateOrderTotals(cartItems);
            for (const item of inventoryItems) {
                const result = await Product.updateOne(
                    {
                        _id: item.productId,
                        inventory: {
                            $elemMatch: {
                                color: item.color,
                                size: item.size,
                                stock: { $gte: item.quantity }
                            }
                        }
                    },
                    { $inc: { 'inventory.$.stock': -item.quantity } },
                    { session }
                );
                if (result.modifiedCount !== 1) {
                    throw createHttpError(409, `Requested quantity exceeds available stock for ${item.name}`);
                }
            }

            [orderDetails] = await Order.create([{
                user: userId,
                items: orderItems,
                ...totals,
                shippingAddress: resolvedShippingAddress,
                paymentId: 'pending',
                deliveryPerson: null,
                trackingHistory: [
                    { status: 'Order Placed', timestamp: new Date() }
                ]
            }], { session });

            await Cart.deleteMany({ user: userId }, { session });
        });

        if (emptyCart) return res.status(200).json({ message: "Cart is empty", cartItems: [] });
        return res.status(200).json({
            success: true,
            message: "Order created successfully",
            orderDetails
        });

    } catch (error) {
        console.log("ERROR:", error);
        if (error.status) return res.status(error.status).json({ message: error.message });
        return res.status(500).json({ message: "Internal Server Error" });
    } finally {
        if (session) await session.endSession();
    }
};