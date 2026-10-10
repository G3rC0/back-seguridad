import { body } from 'express-validator';

export const productoRules = [
    body('nombre').notEmpty().withMessage('El nombre del producto es obligatorio'),
    body('precio').isFloat({ min: 0.1 }).withMessage('el precio del producto debe ser un número mayor a 0'),
    body('id_categoria').isInt().withMessage('La categoria es obligatoia y debe ser un id Valido'),
    body('stock').isInt({ min: 0 }).withMessage('El stock disponible debe ser un numero entero mayor a 0'),
];