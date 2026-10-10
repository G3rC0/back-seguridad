import { body } from 'express-validator';

export const loginRules =[
    body('email').isEmail().withMessage('DEbe ingresar un coreo electronico valido'),
    body('password').notEmpty().withMessage('La contraserña debe ser obligatoria'),
    body('captchaA').notEmpty().withMessage('Falta el parametro CAPTCHA A'),
    body('captchaB').notEmpty().withMessage('Falta el parametro CAPTCHA B'),
    body('captchaInput').notEmpty().withMessage('Debe resolver el CAPTCHA'),
];

export const registroRules = [
    body('nombre').isLength({ min: 3 }).withMessage('El nombre tener al menos 3 caracteres'),
    body('email').isEmail().withMessage('Debe ingresar un correo electronico valido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 carateres'),
    body('rol').optional(),
];