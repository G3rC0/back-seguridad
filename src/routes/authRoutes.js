import { Router } from 'express';
import { validate } from '../middleware/validatorMiddleware.js';
import { loginRules, registroRules } from '../validators/authValidators.js';
import { login, logout, register, loginInvitado } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', loginRules, validate, login);
router.post('/registro', registroRules, validate, register);

router.post('/invitado', loginInvitado);
router.post('/logout', verifyToken, logout);

export default router;
