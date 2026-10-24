import { pool } from '../config/db.js';
import { mapRolToFrontend } from '../utils/roles.js';

export const getUsuarios = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT p.id_persona AS id, p.nombre, p.paterno, p.materno, p.email,
                    u.id_sucursal, u.rol, u.activo, u.fecha_creacion, u.ultimo_acceso
             FROM persona p
             JOIN usuario u ON p.id_persona = u.id_usuario
             ORDER BY p.id_persona DESC`
        );

        const usuarios = rows.map(u => {
            const rolFrontend = mapRolToFrontend(u.rol);

            return {
                id:           u.id,
                nombre:       `${u.nombre} ${u.paterno || ''} ${u.materno || ''}`.trim(),
                primerNombre: u.nombre,
                paterno:      u.paterno,
                materno:      u.materno,
                email:        u.email,
                rol:          rolFrontend,
                id_sucursal:  u.id_sucursal,
                activo:       u.activo,
                fechaCreacion: new Date(u.fecha_creacion).toLocaleDateString('es-BO'),
                ultimoAcceso:  u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-BO') : null
            };
        });

        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios del servidor' });
    }
};

export const toggleActivo = async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await pool.query(
            'SELECT activo FROM usuario WHERE id_usuario = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // En pg, activo ya es boolean — simplemente se invierte
        const nuevoEstado = !rows[0].activo;

        await pool.query(
            'UPDATE usuario SET activo = $1 WHERE id_usuario = $2',
            [nuevoEstado, id]
        );

        res.json({
            ok:      true,
            message: `Usuario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
            activo:  nuevoEstado
        });
    } catch (error) {
        console.error('Error al cambiar estado de usuario:', error);
        res.status(500).json({ error: 'Error al cambiar estado de usuario en el servidor' });
    }
};