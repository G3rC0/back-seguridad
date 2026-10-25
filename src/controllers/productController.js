import { pool } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { cleanCategoryName, getFrontendPublicDir, ensureDir } from '../utils/files.js';

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

        ensureDir(targetDir);

        const targetPath = path.join(targetDir, filename);
        fs.writeFileSync(targetPath, fileBuffer);

        return `/productos/${catFolder}/${filename}`;
    } catch (error) {
        console.error('Error al guardar la imagen base64:', error);
        throw error;
    }
};

const resolverImagen = async ({ imagen_url, emoji, imagen_base64, imagen_nombre, id_categoria }) => 
    imagen_base64 && imagen_nombre
    ? guardarImagenBase64(imagen_base64, imagen_nombre, id_categoria)
    : imagen_url || emoji ||  '🌸';

const valoresProducto = async (body) => [
    body.nombre,
    body.descripcion || null,
    body.id_categoria,
    body.tipo || 'Estándar',
    await resolverImagen(body),
    body.precio,
    body.stock ?? 0,
    body.stock_minimo ?? 1
];
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

//crear nuevo producto
export const crearProducto = async (req, res) => {
    try {
        const valores = await valoresProducto(req.body);

        const { rows } = await pool.query(
            `INSERT INTO producto (nombre, descripcion, id_categoria, tipo, imagen_url, precio, stock_disponible, stock_minimo, activo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8 TRUE)
            RETURNING id_producto`,
            valores
        );

        res.json ({
            ok: true,
            message: 'Producto creado exitosamente',
            id: rows[0].id_producto
        });
    }catch (error) {
        console.error('Error al crear producto: ', error);
        res.status(500).json({ error: 'Error al crear producto en el servidor'});
    }
};

//Editar Producto
export const editarProducto = async (req,res) => {
    try {
        const valores = await valoresProducto(req.body);

        await pool.query(
            `UPDATE producto
            SET nombre = $1, descripcion = $2, id_categoria = $3, tipo = $4,
            imagen_url = $5, precio = $6, stock_disponible = $7, stock_minimo = $8
            WHERE id_producto = $9`,
            [...valores, req.params.id]
        );
        res.json({ ok:true, message: 'Producto actualizado exitosamnete'});
    }catch (error) {
        console.error('Error al editar poducto: ', error);
        res.status(500).json({ error: 'Error al editar producto en el servidor' });
    }
}

const setProductoActivo = (activo) => async (req, res) => {
    const accion = activo ? 'reactivar': 'desactivar'; 

    try {
        await pool.query(
        ' UPDATE producto SET activo= $1 WHERE id_producto = $2',
        [activo, req.params.id]
        );
        res.json({ ok: true, message: `Productp ${activo ? 'reactivado' : 'desactivado'} exitosamente`})
    }catch ( error) {
        console.error(`Error al ${accion} producto: `, error);
        res.status(500).json({ error: `Error al ${accion} producto en el servidor`});
    }
};

export const eliminarProducto = setProductoActivo(false);
export const reactivarProducto = setProductoActivo(true);
