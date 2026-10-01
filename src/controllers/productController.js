import { pool } from '../config/db.js';
import fs from 'fs';
import path from 'path';

const getFrontendPublicDir = () => {
    return process.env.FRONTEND_PUBLIC_DIR || path.resolve(process.cwd(), '../yasumi-vite/public');
};

const cleanCategoryName = (nombre) => {
    if (!nombre) return 'otros';
    return nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .trim();
};

const guardarImagenBase64 = async (base64Str, originalName, id_categoria) => {
    try {
        // 1. Obtener nombre de la categoría
        const { rows } = await pool.query(
            'SELECT nombre FROM categoria WHERE id_categoria = $1',
            [id_categoria]
        );
        const catNombre = rows.length > 0 ? rows[0].nombre : 'otros';
        const catFolder = cleanCategoryName(catNombre);

        // 2. Extraer datos del string Base64
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Formato base64 inválido');
        }

        const fileBuffer = Buffer.from(matches[2], 'base64');
        const ext       = path.extname(originalName) || '.jpg';
        const cleanName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const filename  = `${Date.now()}_${cleanName}${ext}`;

        // 3. Ruta de destino en el frontend
        const publicDir   = getFrontendPublicDir();
        const targetDir   = path.join(publicDir, 'productos', catFolder);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, filename);
        fs.writeFileSync(targetPath, fileBuffer);

        return `/productos/${catFolder}/${filename}`;
    } catch (error) {
        console.error('Error al guardar la imagen base64:', error);
        throw error;
    }
};

// Obtener todos los productos
export const getProductos = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT p.id_producto AS id, p.nombre, p.descripcion, p.tipo, p.imagen_url,
                    p.activo, p.precio, p.stock_disponible AS stock, p.stock_minimo,
                    p.id_categoria, c.nombre AS categoria
             FROM producto p
             JOIN categoria c ON p.id_categoria = c.id_categoria
             ORDER BY p.id_producto DESC`
        );

        const productos = rows.map(p => {
            const esUrl = p.imagen_url && (p.imagen_url.startsWith('http') || p.imagen_url.startsWith('/'));
            return {
                id:           p.id,
                nombre:       p.nombre,
                categoria:    p.categoria,
                id_categoria: p.id_categoria,
                precio:       Number(p.precio),
                stock:        p.stock,
                stock_minimo: p.stock_minimo,
                descripcion:  p.descripcion,
                tipo:         p.tipo,
                imagen_url:   p.imagen_url,
                emoji:        esUrl ? '🌸' : (p.imagen_url || '🌸'),
                activo:       p.activo
            };
        });

        res.json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos del servidor' });
    }
};

// Crear nuevo producto
export const crearProducto = async (req, res) => {
    const { nombre, descripcion, id_categoria, tipo, imagen_url, emoji, precio, stock, stock_minimo, imagen_base64, imagen_nombre } = req.body;

    try {
        let finalImageUrl = imagen_url || emoji || '🌸';

        if (imagen_base64 && imagen_nombre) {
            finalImageUrl = await guardarImagenBase64(imagen_base64, imagen_nombre, id_categoria);
        }

        const { rows } = await pool.query(
            `INSERT INTO producto (nombre, descripcion, id_categoria, tipo, imagen_url, precio, stock_disponible, stock_minimo, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
             RETURNING id_producto`,
            [nombre, descripcion || null, id_categoria, tipo || 'Estándar', finalImageUrl, precio, stock || 0, stock_minimo || 1]
        );

        res.json({
            ok:      true,
            message: 'Producto creado exitosamente',
            id:      rows[0].id_producto
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto en el servidor' });
    }
};

// Editar producto
export const editarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, id_categoria, tipo, imagen_url, emoji, precio, stock, stock_minimo, imagen_base64, imagen_nombre } = req.body;

    try {
        let finalImageUrl = imagen_url || emoji || '🌸';

        if (imagen_base64 && imagen_nombre) {
            finalImageUrl = await guardarImagenBase64(imagen_base64, imagen_nombre, id_categoria);
        }

        await pool.query(
            `UPDATE producto
             SET nombre = $1, descripcion = $2, id_categoria = $3, tipo = $4,
                 imagen_url = $5, precio = $6, stock_disponible = $7, stock_minimo = $8
             WHERE id_producto = $9`,
            [nombre, descripcion || null, id_categoria, tipo || 'Estándar', finalImageUrl, precio, stock, stock_minimo, id]
        );

        res.json({ ok: true, message: 'Producto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al editar producto:', error);
        res.status(500).json({ error: 'Error al editar producto en el servidor' });
    }
};

// Eliminación lógica (soft delete)
export const eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            'UPDATE producto SET activo = FALSE WHERE id_producto = $1',
            [id]
        );
        res.json({ ok: true, message: 'Producto desactivado exitosamente' });
    } catch (error) {
        console.error('Error al desactivar producto:', error);
        res.status(500).json({ error: 'Error al desactivar producto en el servidor' });
    }
};

// Reactivar producto
export const reactivarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            'UPDATE producto SET activo = TRUE WHERE id_producto = $1',
            [id]
        );
        res.json({ ok: true, message: 'Producto reactivado exitosamente' });
    } catch (error) {
        console.error('Error al reactivar producto:', error);
        res.status(500).json({ error: 'Error al reactivar producto en el servidor' });
    }
};