import jwt from 'jsonwebtoken';

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
    // Aceptamos rol 'admin' (mapeado en frontend) o 'Administrador' (guardado en BD)
    if (req.user && (req.user.rol === 'admin' || req.user.rol === 'Administrador')) {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    }
};
