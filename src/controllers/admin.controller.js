import { User } from '../db/users.models.js';
import { Order } from '../db/orders.model.js';
import mongoose from 'mongoose';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
const NEXT_ORDER_STATUS = {
    Pending: 'Confirmed',
    Confirmed: 'Processing',
    Processing: 'Shipped',
    Shipped: 'Out for Delivery',
    'Out for Delivery': 'Delivered'
};

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching all users" });
    }
};

export const getDeliveryPeople = async (req, res) => {
    try {
        const deliveryPeople = await User.find({ role: 'employee' })
            .select('fullName email phoneNumber')
            .sort({ fullName: 1 })
            .lean();
        return res.status(200).json({ deliveryPeople });
    } catch (error) {
        console.error('Fetching delivery people failed:', error);
        return res.status(500).json({ message: 'Unable to fetch delivery people.' });
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

export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID.' });
        }

        const order = await Order.findById(orderId)
            .populate('user', 'fullName email phoneNumber')
            .populate('items.product', 'name images category type')
            .populate('deliveryPerson', 'fullName email phoneNumber role')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        return res.status(200).json({ order });
    } catch (error) {
        console.error('Fetching admin order details failed:', error);
        return res.status(500).json({ message: 'Unable to fetch order details.' });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, deliveryPerson } = req.body || {};
        const hasStatus = Object.hasOwn(req.body || {}, 'status');
        const hasDeliveryPerson = Object.hasOwn(req.body || {}, 'deliveryPerson');

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID.' });
        }
        if (!hasStatus && !hasDeliveryPerson) {
            return res.status(400).json({ message: 'Provide a status or delivery person update.' });
        }

        if (status === 'Cancelled') {
            return res.status(400).json({ message: "Use the customer cancellation flow to cancel an order." });
        }
        if (hasStatus && !ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid order status.' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.status === 'Cancelled') {
            return res.status(409).json({ message: "Cancelled orders cannot be reopened or changed." });
        }
        if (order.status === 'Delivered') {
            return res.status(409).json({ message: "Delivered orders cannot be changed." });
        }
        if (!ORDER_STATUSES.includes(order.status)) {
            return res.status(409).json({ message: "Order has an unsupported status and cannot be changed." });
        }

        const statusChanged = hasStatus && status !== order.status;
        if (statusChanged && NEXT_ORDER_STATUS[order.status] !== status) {
            return res.status(409).json({
                message: order.status === 'Delivered'
                    ? 'Delivered orders cannot be moved to another status.'
                    : `Order status can only move from ${order.status} to ${NEXT_ORDER_STATUS[order.status] || 'a valid next status'}.`
            });
        }

        let nextDeliveryPerson = order.deliveryPerson;
        if (hasDeliveryPerson && deliveryPerson !== null && deliveryPerson !== '') {
            if (!mongoose.Types.ObjectId.isValid(deliveryPerson)) {
                return res.status(400).json({ message: 'Invalid delivery person.' });
            }
            const employee = await User.findOne({ _id: deliveryPerson, role: 'employee' }).select('_id');
            if (!employee) {
                return res.status(400).json({ message: 'Delivery person must be an existing employee.' });
            }
            nextDeliveryPerson = employee._id;
        } else if (hasDeliveryPerson) {
            nextDeliveryPerson = null;
        }

        const update = { $set: { deliveryPerson: nextDeliveryPerson } };
        if (statusChanged) {
            const timestamp = new Date();
            update.$set.status = status;
            update.$push = { trackingHistory: { status, timestamp } };
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId, status: order.status },
            update,
            { new: true, runValidators: true }
        )
            .populate('user', 'fullName email phoneNumber')
            .populate('items.product', 'name images category type')
            .populate('deliveryPerson', 'fullName email phoneNumber role')
            .lean();

        if (!updatedOrder) {
            return res.status(409).json({ message: 'Order changed while you were updating it. Refresh and try again.' });
        }

        return res.status(200).json({ success: true, message: "Order updated successfully", order: updatedOrder });
    } catch (error) {
        console.error('Updating admin order failed:', error);
        return res.status(500).json({ message: "Error updating order" });
    }
};