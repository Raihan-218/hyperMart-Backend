import { Router } from 'express'
import { isAdmin } from '../middleware/admin.middleware.js'
import { verifyJWT } from '../middleware/auth.middleware.js'
import { getAllOrders, getAllUsers, updateOrderStatus } from '../controllers/admin.controller.js';
const router = Router();


router.get('/users', verifyJWT , isAdmin , getAllUsers )
router.get('/orders', verifyJWT , isAdmin , getAllOrders )
router.put('/orderstatus', verifyJWT , isAdmin , updateOrderStatus )


export default router;