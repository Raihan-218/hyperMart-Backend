import { User } from '../db/users.models.js';
import { Order } from '../db/orders.model.js';

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching all users" });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'fullName email');
        return res.status(200).json(orders);

    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error " })
    }
}

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, deliveryPerson } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = status || order.status;
        if (deliveryPerson) {
            order.deliveryPerson = deliveryPerson; // Assign an 'employee'
        }

        // Add to tracking history
        order.trackingHistory.push({ status: order.status, timestamp: new Date() });

        await order.save();
        return res.status(200).json({ message: "Order status updated", order });

    } catch (error) {
        return res.status(500).json({ message: "Error updating order" });
    }
};