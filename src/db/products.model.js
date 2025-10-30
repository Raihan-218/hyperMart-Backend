import mongoose from "mongoose";
const Schema = mongoose.Schema;

// A sub-schema for inventory management
const inventorySchema = new Schema({
  color: { type: String, required: true },
  size: { type: String, required: true },
  stock: { type: Number, required: true, min: 0, default: 0 }
}, { _id: false });

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['men', 'women', 'kids']
  },
  type: {
    type: String, // e.g., 'Jacket', 'T-Shirt', 'Pants'
    required: true
  },
  images: [{
    type: String, // URLs for the images
    required: true
  }],
  // Use the inventory sub-schema
  inventory: [inventorySchema]
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);