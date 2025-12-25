import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { addCart, deleteCartItem, getCart } from "../controllers/cart.controller.js";


const router = Router();


router.post('/addCart', verifyJWT , addCart )
router.get('/getcart' ,verifyJWT , getCart)
router.delete('/getcart' ,verifyJWT , deleteCartItem)
router.post('/checkout' , verifyJWT , )


export default router;