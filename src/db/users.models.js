import mongoose from 'mongoose';
import jwt from "jsonwebtoken"
import bcrypt from 'bcrypt';
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
  phoneNumber: {
    type: String,
    // required: true,
    match: [/^\+?[1-9]\d{1,14}$/, "please enter a valid phone number"]
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'employee'],
    default: 'user'
  },
  refreshToken: {
    type: String
  },
  addresses: [addressSchema],

  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});
// password hashing before saving in the DB (pre hook executes before saving the data in the DB)
userSchema.pre("save", async function (next) {
  if (!this.isModified('password')) return next()
  try {
    this.password = await bcrypt.hash(this.password, 10)
    next();

  } catch (error) {
    next(error);
  }
})
// password checking method
userSchema.methods.isPasswordCorrect = async function (password) {
  try {
    const result = await bcrypt.compare(password, this.password)
    return result;

  } catch (error) {
    console.log("Error comparing the password :", error);
    return false;
  }
}
// method to generate the accessToken 
userSchema.methods.generateAccessToken = function() {
  return jwt.sign({
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    phoneNumber: this.phoneNumber
  },
    process.env.AccessTokenSecret,
    {
      expiresIn: process.env.AccessTokenExpiry
    }
  )
}
// method to generate the refreshToken 
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign({
    _id: this._id
  },
    process.env.RefreshTokenSecret,
    {
      expiresIn: process.env.RefreshTokenExpiry
    }
  )
}

// 4. Use 'export' instead of 'module.exports'
export const User = mongoose.model('User', userSchema);