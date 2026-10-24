import jwt from 'jsonwebtoken';
import { mapRolToFrontend } from '../utils/roles';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: 'Acceso denegado. No se proporcionó token.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'yasumi_secret_token_key_2026';
        const decoded = jwt.verify(token, secret);
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

export const isAdmin = (req, res, next) => {
    if (mapRolToFrontend(req.user?.rol)==='admin') {
        return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. Se requiere permisos de Administrador. '});
};
