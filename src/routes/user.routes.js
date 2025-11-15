import { Router } from 'express';
import { userRegister, userLogin, userLogOut } from '../controllers/user.controller.js';

const router = Router();

router.route("/register").post(userRegister);
router.route("/login").post(userLogin);
router.route("/logout").post(userLogOut);

export default router;