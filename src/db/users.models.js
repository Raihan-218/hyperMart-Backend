// Use 'import' instead of 'require'
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// 1. Define addressSchema FIRST
const addressSchema = new Schema({
  street: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  postalCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    default: 'India'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

// 2. Define userSchema SECOND
const userSchema = new Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  role: {
    type: String,
    // Note: I'm using your 'employee' role here.
    enum: ['user', 'admin', 'employee'], 
    default: 'user'
  },
  // 3. Now this line will work
  addresses: [addressSchema], 

  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product' 
  }]
}, {
  timestamps: true
});

// 4. Use 'export' instead of 'module.exports'
export const User = mongoose.model('User', userSchema);