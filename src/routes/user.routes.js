import { Router } from 'express';
import {
  userRegister,
  userLogin,
  userLogOut,
  userProfile,
  getMyOrders,
  cancelMyOrder,
  updateProfile,
  deleteUser,
  userAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  verifyEmail,
  resendVerificationEmail
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', userRegister);
router.post('/login', userLogin);
router.post('/resend-verification', resendVerificationEmail);
router.get('/verify-email', verifyEmail);
router.post('/logout', verifyJWT, userLogOut);

router.get('/profile', verifyJWT, userProfile);
router.get('/me', verifyJWT, userProfile);
router.get('/orders', verifyJWT, getMyOrders);
router.post('/orders/:orderId/cancel', verifyJWT, cancelMyOrder);
router.put('/profile', verifyJWT, updateProfile);
router.delete('/account', verifyJWT, deleteUser);
router.get('/wishlist', verifyJWT, getWishlist);
router.post('/wishlist/:productId', verifyJWT, toggleWishlistItem);
router.delete('/wishlist/:productId', verifyJWT, removeWishlistItem);
router.get('/address', verifyJWT, userAddress);
router.post('/address', verifyJWT, updateAddress);
router.delete('/address', verifyJWT, deleteAddress);

export default router;