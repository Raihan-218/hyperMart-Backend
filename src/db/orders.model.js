import mongoose from "mongoose";
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
  color: { type: String, required: true },
  size: { type: String, required: true }
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
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  paymentId: {
    type: String, // From Razorpay/Stripe
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  deliveryPerson: { // Your 'employee' role
    type: Schema.Types.ObjectId,
    ref: 'User' 
  },
  trackingHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);