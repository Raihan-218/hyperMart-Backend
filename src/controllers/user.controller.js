import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User } from '../db/users.models.js';
import { Product } from '../db/products.model.js';
import { Order } from '../db/orders.model.js';

const emailVerificationEnabled = () => process.env.EMAIL_VERIFICATION_ENABLED === 'true';

const generateRefreshTokenandAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Token Generation Error:', error);
    throw new Error('Token Error');
  }
};

const buildVerificationLink = (token) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
};

const sendVerificationEmail = async (user, token) => {
  const host = process.env.EMAIL_HOST;
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!host || !emailUser || !emailPassword) {
    throw new Error('SMTP configuration is incomplete');
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });

  const verificationLink = buildVerificationLink(token);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || emailUser,
    to: user.email,
    subject: 'Verify your HyperMart account',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Hello ${user.fullName || 'there'},</h2>
        <p>Thanks for creating your HyperMart account.</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p>
          <a href="${verificationLink}" style="display: inline-block; padding: 12px 20px; background: #111827; color: #fff; text-decoration: none; border-radius: 8px;">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p>${verificationLink}</p>
        <p>This verification link will expire in 24 hours.</p>
      </div>
    `
  });
};

const normalizeAddressPayload = (user, addressInput) => {
  const storedAddress = user?.address || {};
  const rawAddress = typeof addressInput === 'object' && addressInput !== null ? addressInput : {};

  return {
    street: rawAddress.street ?? storedAddress.street ?? '',
    city: rawAddress.city ?? storedAddress.city ?? '',
    state: rawAddress.state ?? storedAddress.state ?? '',
    postalCode: rawAddress.postalCode ?? storedAddress.postalCode ?? '',
    country: rawAddress.country ?? storedAddress.country ?? 'India'
  };
};

export const userRegister = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await User.create({
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      password
    });

    if (emailVerificationEnabled()) {
      const verificationToken = user.setEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (mailError) {
        console.error('Email verification failed to send:', mailError);
        return res.status(503).json({
          message: 'Your account was created, but the verification email could not be sent. Configure SMTP settings, then request a new verification email from the login page.'
        });
      }
    } else {
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });
    }

    const createdUser = await User.findById(user._id).select('-password -refreshToken');

    return res.status(201).json({
      message: emailVerificationEnabled()
        ? 'User registered successfully. Please verify your email to activate your account.'
        : 'User registered successfully. You can now log in.',
      user: createdUser
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    if (!emailVerificationEnabled()) {
      return res.status(400).json({ message: 'Email verification is currently disabled.' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        message: 'If an unverified account exists for that email, a verification link will be sent.'
      });
    }

    const verificationToken = user.setEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, verificationToken);

    return res.status(200).json({
      message: 'A new verification email has been sent. Check your inbox.'
    });
  } catch (error) {
    console.error('Resending verification email failed:', error);
    return res.status(503).json({
      message: 'The verification email could not be sent. Check the email service configuration and try again.'
    });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (emailVerificationEnabled() && !user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your inbox for the verification link.'
      });
    }

    const { accessToken, refreshToken } = await generateRefreshTokenandAccessToken(user._id);

    const loggedInUser = user.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;
    delete loggedInUser.__v;
    delete loggedInUser.createdAt;
    delete loggedInUser.updatedAt;

    const options = {
      httpOnly: true,
      secure: true
    };

    return res.status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json({
        user: loggedInUser,
        accessToken,
        refreshToken,
        message: 'User login successful'
      });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const userLogOut = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: undefined
    }
  }, {
    new: true
  });

  const options = {
    httpOnly: true,
    secure: true
  };

  return res.status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json({ message: 'User logged out' });
};

export const userProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken').lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ user });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Fetching customer orders failed:', error);
    return res.status(500).json({ message: 'Unable to fetch order history.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, address, city, state, postalCode, country } = req.body;

    if (!fullName && !phoneNumber && !address && !city && !state && !postalCode && !country) {
      return res.status(400).json({ message: 'No field provided to update' });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    if (fullName) updates.fullName = String(fullName).trim();
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber ? String(phoneNumber).trim() : '';

    const nextAddress = normalizeAddressPayload(currentUser, address);
    if (city !== undefined) nextAddress.city = String(city).trim();
    if (state !== undefined) nextAddress.state = String(state).trim();
    if (postalCode !== undefined) nextAddress.postalCode = String(postalCode).trim();
    if (country !== undefined) nextAddress.country = String(country).trim() || 'India';
    if (address && typeof address === 'string') nextAddress.street = String(address).trim();

    const hasAddressUpdates = [address, city, state, postalCode, country].some(
      (value) => value !== undefined && String(value).trim() !== ''
    );

    if (hasAddressUpdates) {
      updates.address = nextAddress;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updates }, {
      new: true,
      runValidators: true
    }).select('-refreshToken -password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    if (!emailVerificationEnabled()) {
      return res.status(400).json({ message: 'Email verification is currently disabled.' });
    }

    const token = req.query.token;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired.' });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ message: 'This email is already verified.' });
    }

    user.clearEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Verification Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const options = {
      httpOnly: true,
      secure: true
    };

    return res.status(200)
      .clearCookie('refreshToken', options)
      .clearCookie('accessToken', options)
      .json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('wishlist', 'name price images category type averageRating numReviews')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ wishlist: user.wishlist || [] });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const toggleWishlistItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const alreadySaved = user.wishlist.some((wishlistProductId) => wishlistProductId.toString() === productId);

    if (alreadySaved) {
      user.wishlist = user.wishlist.filter((wishlistProductId) => wishlistProductId.toString() !== productId);
      await user.save();
      return res.status(200).json({ message: 'Removed from wishlist', wishlist: user.wishlist });
    }

    user.wishlist.push(product._id);
    await user.save();

    return res.status(201).json({ message: 'Added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const removeWishlistItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const originalLength = user.wishlist.length;
    user.wishlist = user.wishlist.filter((wishlistProductId) => wishlistProductId.toString() !== productId);

    if (user.wishlist.length === originalLength) {
      return res.status(404).json({ message: 'Product not in wishlist' });
    }

    await user.save();
    return res.status(200).json({ message: 'Removed from wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const userAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.address || {};
    if (!address || Object.keys(address).length === 0) {
      return res.status(200).json({ message: 'No address found' });
    }

    return res.status(200).json({ address });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { street, city, state, postalCode, country } = req.body;
    if (!street || !city || !state || !postalCode || !country) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newAddress = { street, city, state, postalCode, country };
    const updatedAddress = await User.findByIdAndUpdate(req.user._id, {
      $set: { address: newAddress }
    }, {
      new: true,
      runValidators: true
    });

    if (!updatedAddress) {
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    return res.status(200).json(updatedAddress);
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, {
      $unset: { address: 1 }
    }, {
      new: true
    }).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Address deleted successfully', user });
  } catch (error) {
    console.log('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};