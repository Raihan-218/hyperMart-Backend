import { Router } from 'express'
import { addproducts, deleteProduct, getProducts, getSingleProduct, updateProduct } from '../controllers/products.controller.js';
import { isAdmin } from '../middleware/admin.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { uploadProductImages } from '../middleware/multer.middleware.js';

const router = Router();

// Public Routes
router.get('/', getProducts);
router.get('/:id', getSingleProduct);

// Protected Admin Routes
router.post('/addproducts', verifyJWT, isAdmin, uploadProductImages, addproducts);
router.put('/updateProduct/:id', verifyJWT, isAdmin, uploadProductImages, updateProduct);
router.put('/inventory/:id', verifyJWT, isAdmin, updateProduct);
router.delete('/delete/:id', verifyJWT, isAdmin, deleteProduct);

export default router;
