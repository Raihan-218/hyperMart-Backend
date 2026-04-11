import mongoose from "mongoose";
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comments: [{
    text: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

export const Review = mongoose.model('Review', reviewSchema);