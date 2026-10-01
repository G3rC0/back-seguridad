import { pool } from '../config/db.js';

export const getAccessLogs = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT l.id_log AS id, l.ip_address AS ip, l.evento, l.browser, l.fecha_hora,
                    p.nombre, p.paterno, p.materno
             FROM log_acceso l
             JOIN persona p ON l.id_usuario = p.id_persona
             ORDER BY l.fecha_hora DESC
             LIMIT 150`
        );

        const logs = rows.map(l => ({
            id:       l.id,
            usuario:  `${l.nombre} ${l.paterno || ''}`.trim(),
            ip:       l.ip || '127.0.0.1',
            evento:   l.evento,
            browser:  l.browser || 'Desconocido',
            fechaHora: new Date(l.fecha_hora).toLocaleString('es-BO')
        }));

        res.json(logs);
    } catch (error) {
        console.error('Error al obtener logs de acceso:', error);
        res.status(500).json({ error: 'Error al obtener logs de acceso del servidor' });
    }
};