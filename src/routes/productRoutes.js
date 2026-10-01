import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { getProductos, crearProducto, editarProducto, eliminarProducto, reactivarProducto } from '../controllers/productController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { generarImagenesVacias } from '../utils/imageGenerator.js';

const router = Router();

// Endpoint público para obtener productos (tanto catálogo como gestión)
router.get('/', getProductos);

// Endpoint temporal para forzar la sincronización de imágenes
router.get('/sync-images', async (req, res) => {
    try {
        await generarImagenesVacias();
        res.json({ ok: true, message: 'Imágenes sincronizadas con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoints protegidos para administración de productos
router.post(
    '/',
    verifyToken,
    isAdmin,
    async (req, res, next) => {
        await check('nombre')
            .notEmpty().withMessage('El nombre del producto es obligatorio')
            .run(req);
        await check('precio')
            .isFloat({ min: 0.1 }).withMessage('El precio debe ser un número mayor a 0')
            .run(req);
        await check('id_categoria')
            .isInt().withMessage('La categoría es obligatoria y debe ser un ID válido')
            .run(req);
        await check('stock')
            .isInt({ min: 0 }).withMessage('El stock disponible debe ser un número entero mayor o igual a 0')
            .run(req);

        const resultado = validationResult(req);
        if (!resultado.isEmpty()) {
            return res.send({ mensaje: resultado.array() });
        }
        next();
    },
    crearProducto
);

router.put(
    '/:id',
    verifyToken,
    isAdmin,
    async (req, res, next) => {
        await check('nombre')
            .notEmpty().withMessage('El nombre del producto es obligatorio')
            .run(req);
        await check('precio')
            .isFloat({ min: 0.1 }).withMessage('El precio debe ser un número mayor a 0')
            .run(req);
        await check('id_categoria')
            .isInt().withMessage('La categoría es obligatoria y debe ser un ID válido')
            .run(req);
        await check('stock')
            .isInt({ min: 0 }).withMessage('El stock disponible debe ser un número entero mayor o igual a 0')
            .run(req);

        const resultado = validationResult(req);
        if (!resultado.isEmpty()) {
            return res.send({ mensaje: resultado.array() });
        }
        next();
    },
    editarProducto
);

router.delete('/:id', verifyToken, isAdmin, eliminarProducto);
router.post('/:id/reactivar', verifyToken, isAdmin, reactivarProducto);

export default router;
