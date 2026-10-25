import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { evaluarFortaleza } from '../middleware/validatorMiddleware.js';
import { mapRolToFrontend } from '../utils/roles.js';
import { registrarAcceso } from '../services/logService.js';
import { buscarIdPorEmail, crearUsuarioCompleto } from '../services/userService.js';
import { nombreCompleto } from '../utils/helpers.js';

// Login de usuario
export const login = async (req, res) => {
    const { email, password, captchaA, captchaB, captchaInput } = req.body;

    try {
        // 1. Validar CAPTCHA matemático
        if (captchaA === undefined || captchaB === undefined || !captchaInput) {
            return res.status(400).json({ error: 'Debe resolver el CAPTCHA para continuar' });
        }
        if (parseInt(captchaA) + parseInt(captchaB) !== parseInt(captchaInput)) {
            return res.status(400).json({ error: 'Resultado del CAPTCHA incorrecto' });
        }

        // 2. Buscar usuario en base de datos (persona + usuario)
        const { rows } = await pool.query(
            `SELECT p.id_persona, p.nombre, p.paterno, p.email,
                    u.id_sucursal, u.password, u.rol, u.activo
             FROM persona p
             JOIN usuario u ON p.id_persona = u.id_usuario
             WHERE p.email = $1`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];

        // 3. Verificar si el usuario está activo
        if (!user.activo) {
            return res.status(403).json({ error: 'El usuario se encuentra inactivo' });
        }

        // 4. Contrastar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        //5. Mapear rol de BD a Frontend
        const rolFrontend = mapRolToFrontend(user.rol);
        const nombre = nombreCompleto(user);
        // 6. Generar token JWT
        const token = jwt.sign(
            {
                id:     user.id_persona,
                nombre,
                email:  user.email,
                rol:    rolFrontend
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 7. Registrar LOG de acceso
        await registrarAcceso(req, user.id_persona, 'INGRESO');

        // 8. Actualizar último acceso
        await pool.query(
            `UPDATE usuario SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1`,
            [user.id_persona]
        );

        res.json({
            ok: true,
            token,
            usuario: {
                nombre,
                rol:    rolFrontend
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
    }
};

// Registro de usuario
export const register = async (req, res) => {
    const { nombre, paterno, materno, email, password, rol } = req.body;

    try {
        // 1. Validar fortaleza de contraseña
        const fortaleza = evaluarFortaleza(password);
        if (fortaleza === 'debil') {
            return res.status(400).json({ error: 'La contraseña es muy débil. Debe tener al menos 6 caracteres con letras y números.' });
        }

        //2. Verificar si el email ya existe
        if (await buscarIdPorEmail(email)) {
            return res.status(400).json({ error: 'El correo ya esta registrado'});
        }

        // 3. Encriptar contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // 4. Determinar si la petición proviene de un administrador autenticado
        let rolBD = 'Cliente';
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded && decoded.rol === 'admin') {
                    rolBD = rol === 'admin' ? 'Administrador' : 'Atención al Cliente';
                }
            } catch {
                // Token inválido — se trata como registro público
            }
        }

        await crearUsuarioCompleto({
            nombre,
            paterno: paterno || null,
            materno: materno || null,
            email,
            passwordHash,
            rol: rolBD
        });

        res.json({
            ok: true,
            message: rolBD === 'Cliente' ? 'Registro Completado como cliente' : 'Usuario registrado exitosamente'
        });
    } catch (error) {
        console.error('Error en registro: ', error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
};

// Logout de usuario
export const logout = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        await registrarAcceso(req, req.user.id, 'SALIDA');

        res.json({ ok: true, message: 'Salida registrada exitosamente' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error en el servidor al registrar salida' });
    }
};

//Obtener o crear el usuario invitado en la BD
const obtenerOCrearInvitado = async () => {
    const idExistente = await buscarIdPorEmail('invitado@yasumi.com');
    if (idExistente) return idExistente;

    // no existe: crear persona + usuario + cliente
    return crearUsuarioCompleto({
        nombre: 'Invintado',
        email: 'invitado@yasumi.com',
        passwordHash: await bcrypt.hash('invitado_password_2026', 10),
        rol: 'Cliente'
    });
};

// Login como invitado
export const loginInvitado = async (req, res) => {
    try {
        const idInvitado = await obtenerOCrearInvitado();

        await registrarAcceso(req, idInvitado, 'INGRESO');
        
        const token = jwt.sign(
            { id: idInvitado, nombre: 'Invitado', email: 'invitado@yasumi.com', rol: 'invitado' },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            ok: true,
            token,
            usuario: {
                nombre: 'Invitado',
                rol:    'invitado'
            }
        });
    } catch (error) {
        console.error('Error en login de invitado:', error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión como invitado' });
    }
};