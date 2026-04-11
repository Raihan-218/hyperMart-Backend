import { Router } from 'express'
import { verifyJWT } from '../middleware/auth.middleware.js'
import { getReviews , addReviews , deleteReview } from '../controllers/reviews.controller.js';

const router = Router();

router.get('/:id',getReviews)
router.post('/:id',verifyJWT,addReviews)
router.delete('/comment/:commentId',verifyJWT,deleteReview)

export default router