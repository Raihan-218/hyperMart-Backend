
import { Cart } from '../db/carts.model.js';
import { Product } from '../db/products.model.js';
import { Order } from '../db/orders.model.js';


export const addCart = async (req, res) => {
    try {
        const { user_id, product_id, qty } = req.body;

        if (!user_id || !product_id || qty == null || price == null)
            return res.status(400).json({ message: "Cart Error : missing field" })


        const productExistInCart = await Cart.findOneAndUpdate({ product: product_id, user: user_id },
            {
                $set: {
                    qty: qty,
                    price: price
                }
            }, {
            new: true,
            runValidators: true,
            upsert: false
        })

        if (!productExistInCart) {
            const newCartItem = await Cart.create({
                user: user_id,
                product: product_id,
                qty,
                price
            })
            return res.status(201).json({ message: "Product added to cart", newCartItem })
        }

        return res.status(200).json({ message: "Product updated to cart", productExistInCart })

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
            return res.status(200).json({ message: "cart is empty" }, cartItems)

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
        const user = req.user._id;

        if (!user)
            return res.status(401).json({ message: "User login Required" })

        const cartItems = await Cart.find({ user: user }).populate("product").lean();

        if (cartItems.length === 0)
            return res.status(200).json({ message: "cart is empty" }, cartItems)

        let checkoutAmount = 0;

        for (let product of cartItems) {
            const productExists = await Product.findById(product.product)
            if (!productExists)
                return res.status(404).json({ message: "Product not found" })

            checkoutAmount += productExists.price * qty;
        }
        const tax = checkoutAmount * 0.18
        const finalAmt = tax + checkoutAmount

        //RazorPay gateway     



        const deleteCart = await Cart.findByIdAndDelete(user)
        if (!deleteCart)
            return res.status(400).json({ message: "the cart items not found" })

        const orderDetails = await Order.create({
            user: user,
            items: cartItems,
            totalAmount: finalAmt,
            shippingAddress: user.address,
            paymentId: "", // payment id from the razor pay gateway
            deliveryPerson: "name",
            trackingHistory: Date.now()
        })
        return res.status(200).json({message:"Order created"} , orderDetails)

    } catch (error) {
        console.log("ERROR :", error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}