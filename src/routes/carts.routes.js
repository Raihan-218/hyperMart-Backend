import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { addCart, deleteCartItem, getCart, cartCheckout } from "../controllers/cart.controller.js";


const router = Router();

router.post('/add', verifyJWT, addCart);
router.get('/', verifyJWT, getCart);
router.delete('/remove/:product_id', verifyJWT, deleteCartItem);
router.post('/checkout', verifyJWT, cartCheckout);


export default router;