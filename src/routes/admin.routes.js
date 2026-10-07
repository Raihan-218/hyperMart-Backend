import { Router } from 'express'
import { isAdmin } from '../middleware/admin.middleware.js'
import { verifyJWT } from '../middleware/auth.middleware.js'
import { getAllOrders, getAllUsers, getDeliveryPeople, getOrderDetails, updateOrderStatus } from '../controllers/admin.controller.js';
const router = Router();


router.get('/users', verifyJWT , isAdmin , getAllUsers )
router.get('/delivery-people', verifyJWT, isAdmin, getDeliveryPeople)
router.get('/orders', verifyJWT , isAdmin , getAllOrders )
router.get('/orders/:orderId', verifyJWT, isAdmin, getOrderDetails)
router.put('/orders/:orderId/status', verifyJWT , isAdmin , updateOrderStatus )


export default router;
