import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { login, logout, register, loginInvitado } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post(
    '/login',
    async (req, res, next) => {
        await check('email')
            .isEmail().withMessage('Debe ingresar un correo electrónico válido')
            .run(req);
        await check('password')
            .notEmpty().withMessage('La contraseña es obligatoria')
            .run(req);
        await check('captchaA')
            .notEmpty().withMessage('Falta parámetro CAPTCHA A')
            .run(req);
        await check('captchaB')
            .notEmpty().withMessage('Falta parámetro CAPTCHA B')
            .run(req);
        await check('captchaInput')
            .notEmpty().withMessage('Debe resolver el CAPTCHA')
            .run(req);

        const resultado = validationResult(req);
        if (!resultado.isEmpty()) {
            return res.send({ mensaje: resultado.array() });
        }
        next();
    },
    login
);

router.post(
    '/registro',
    async (req, res, next) => {
        await check('nombre')
            .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
            .run(req);
        await check('email')
            .isEmail().withMessage('Debe ingresar un correo electrónico válido (ej: usuario@gmail.com)')
            .run(req);
        await check('password')
            .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
            .run(req);
        await check('rol')
            .optional()
            .run(req);

        const resultado = validationResult(req);
        if (!resultado.isEmpty()) {
            return res.send({ mensaje: resultado.array() });
        }
        next();
    },
    register
);

router.post('/invitado', loginInvitado);
router.post('/logout', verifyToken, logout);

export default router;
