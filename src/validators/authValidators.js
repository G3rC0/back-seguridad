import { body } from 'express-validator';

export const loginRules = [
    body('email').isEmail().withMessage('Debe ingresar un correo electrónico válido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    body('captchaA').notEmpty().withMessage('Falta el parámetro CAPTCHA A'),
    body('captchaB').notEmpty().withMessage('Falta el parámetro CAPTCHA B'),
    body('captchaInput').notEmpty().withMessage('Debe resolver el CAPTCHA'),
];

export const registroRules = [
    body('nombre').isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
    body('email').isEmail().withMessage('Debe ingresar un correo electrónico válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').optional(),
];