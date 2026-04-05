
import { Cart } from '../db/carts.model.js';
import { Product } from '../db/products.model.js';
import { Order } from '../db/orders.model.js';
import { User } from '../db/users.models.js';

export const addCart = async (req, res) => {
    try {
        const { product_id, qty } = req.body;
        const user_id = req.user._id;

        if (!product_id || qty == null)
            return res.status(400).json({ message: "Cart Error : missing field" })

        // Check if product exists and get price
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const price = product.price;

        const productExistInCart = await Cart.findOne({ product: product_id, user: user_id });

        if (productExistInCart) {
            productExistInCart.qty += qty;
            productExistInCart.price = price; // Update price in case it changed
            await productExistInCart.save();
            return res.status(200).json({ message: "Cart updated", productExistInCart })
        } else {
            const newCartItem = await Cart.create({
                user: user_id,
                product: product_id,
                qty,
                price
            })
            return res.status(201).json({ message: "Product added to cart", newCartItem })
        }

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
            return res.status(200).json({ message: "cart is empty", cartItems})

        return res.status(200).json({ message: "cart Fetched successfully", cartItems })

    } catch (error) {
        console.log("ERROR :", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const deleteCartItem = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { product_id } = req.params;
        if (!product_id || !user_id)
            return res.status(400).json({ message: "all fields are required" })

        const itemDeleted = await Cart.findOneAndDelete({ user: user_id, product: product_id })

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

        if (!userId)
            return res.status(401).json({ message: "User login required" });

        const cartItems = await Cart.find({ user: userId })
            .populate("product")
            .lean();

        if (cartItems.length === 0)
            return res.status(200).json({ message: "Cart is empty", cartItems });

        let checkoutAmount = 0;

        for (let item of cartItems) {
            if (!item.product)
                return res.status(404).json({ message: "Product not found" });

            checkoutAmount += item.product.price * item.quantity;
        }

        const tax = checkoutAmount * 0.18;
        const finalAmt = checkoutAmount + tax;

        const userData = await User.findById(userId);

        // Razorpay integration here

        await Cart.deleteMany({ user: userId });

        const orderDetails = await Order.create({
            user: userId,
            items: cartItems,
            totalAmount: finalAmt,
            shippingAddress: userData.address,
            paymentId: "",
            deliveryPerson: "Not Assigned",
            trackingHistory: [
                { status: "Order Placed", date: new Date() }
            ]
        });

        return res.status(200).json({
            message: "Order created successfully",
            orderDetails
        });

    } catch (error) {
        console.log("ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};