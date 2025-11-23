import { Router } from 'express';
import { userRegister, userLogin, userLogOut, userProfile, updateProfile, deleteUser, userAddress, updateAddress, deleteAddress } from '../controllers/user.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register',userRegister);
router.post('/login',userLogin);
router.post('/logout',verifyJWT,userLogOut);


router.get('/profile',verifyJWT,userProfile );
router.put('/profile', verifyJWT,updateProfile );
router.delete('/account', verifyJWT, deleteUser);
router.get('/address', verifyJWT,userAddress );
router.post('/address', verifyJWT,updateAddress );
router.delete('/address', verifyJWT,deleteAddress );
export default router;  