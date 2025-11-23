import { Router } from 'express'
import { addproducts, deleteProduct, getProducts, getSingleProduct, updateProduct } from '../controllers/products.controller.js';
import { isAdmin } from '../middleware/admin.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';

const router = Router();

router.get('/products', getProducts )
router.get('/product/:id',verifyJWT, getSingleProduct)
router.post('/addproducts' , verifyJWT , isAdmin, upload.array('images',5) , addproducts  )
router.put('/updateProduct/:id',verifyJWT , isAdmin ,updateProduct )
router.delete('/delete', verifyJWT , isAdmin , deleteProduct)
export default router;