import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Devolvemos el primer error encontrado
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

export const evaluarFortaleza = (password) => {
    if (!password) return 'debil';
    const tieneMayus = /[A-Z]/.test(password);
    const tieneMinus = /[a-z]/.test(password);
    const tieneNum   = /[0-9]/.test(password);
    const tieneSimb  = /[^A-Za-z0-9]/.test(password);
    const longitud   = password.length;

    if (longitud < 6 || (!tieneNum && !tieneSimb)) return 'debil';
    if (longitud >= 12 && tieneMayus && tieneMinus && tieneNum && tieneSimb) return 'fuerte';
    return 'media';
};