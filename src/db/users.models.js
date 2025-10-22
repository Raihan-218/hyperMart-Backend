const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    enum: ['user', 'admin', 'employee'],
    default: 'user'
  },

  addresses: [addressSchema], 

  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product' 
  }]

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);



// ## User's Address


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

