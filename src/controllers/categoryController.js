import { pool } from '../config/db.js';

export const getCategorias = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id_categoria AS id, nombre, descripcion, imagen_url, activo
             FROM categoria
             WHERE activo = TRUE`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías de la base de datos' });
    }
};