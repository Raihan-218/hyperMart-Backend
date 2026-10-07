import mongoose from "mongoose";
import { addressSchema } from "./users.models.js";
const Schema = mongoose.Schema;

// This defines a single item within an order
const orderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true }, // Denormalized for easy access
  price: { type: Number, required: true }, // Price at time of purchase
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String },
  size: { type: String }
}, { _id: false });

const orderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: { type: Number, min: 0, default: 0 },
  taxAmount: { type: Number, min: 0, default: 0 },
  shippingAmount: { type: Number, min: 0, default: 0 },
  discountAmount: { type: Number, min: 0, default: 0 },
  shippingAddress: {
    type: addressSchema,
    default: {}
  },
  paymentId: {
    type: String,
    required: true,
    default: 'pending'
  },
  refundStatus: {
    type: String,
    enum: ['not_required', 'pending', 'processed'],
    default: 'not_required'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, trim: true },
  deliveryPerson: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  trackingHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);