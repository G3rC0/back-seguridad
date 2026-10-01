import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { getClientIp } from '../utils/helpers.js';
import { evaluarFortaleza } from '../middleware/validatorMiddleware.js';

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

        // 5. Mapear rol de BD a Frontend
        let rolFrontend = 'vendedor';
        const dbRol = (user.rol || '').toLowerCase().trim();
        if (dbRol === 'administrador' || dbRol === 'admin') {
            rolFrontend = 'admin';
        } else if (dbRol === 'cliente') {
            rolFrontend = 'cliente';
        }

        // 6. Generar token JWT
        const token = jwt.sign(
            {
                id:     user.id_persona,
                nombre: `${user.nombre} ${user.paterno || ''}`.trim(),
                email:  user.email,
                rol:    rolFrontend
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 7. Registrar LOG de acceso
        const ipLimpia = getClientIp(req);
        const browser  = req.headers['user-agent'] || 'Desconocido';

        await pool.query(
            `INSERT INTO log_acceso (id_usuario, ip_address, evento, browser)
             VALUES ($1, $2, 'INGRESO', $3)`,
            [user.id_persona, ipLimpia, browser]
        );

        // 8. Actualizar último acceso
        await pool.query(
            `UPDATE usuario SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1`,
            [user.id_persona]
        );

        res.json({
            ok: true,
            token,
            usuario: {
                nombre: `${user.nombre} ${user.paterno || ''}`.trim(),
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

    const client = await pool.connect();
    try {
        // 1. Validar fortaleza de contraseña
        const fortaleza = evaluarFortaleza(password);
        if (fortaleza === 'debil') {
            return res.status(400).json({ error: 'La contraseña es muy débil. Debe tener al menos 6 caracteres con letras y números.' });
        }

        // 2. Verificar si el email ya existe
        const { rows: existing } = await pool.query(
            'SELECT id_persona FROM persona WHERE email = $1',
            [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
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

        // 5. Iniciar transacción
        await client.query('BEGIN');

        // 6. Insertar en persona y obtener el id generado
        const { rows: personaRows } = await client.query(
            `INSERT INTO persona (nombre, paterno, materno, email)
             VALUES ($1, $2, $3, $4)
             RETURNING id_persona`,
            [nombre, paterno || null, materno || null, email]
        );
        const idPersona = personaRows[0].id_persona;

        // 7. Insertar en usuario
        await client.query(
            `INSERT INTO usuario (id_usuario, id_sucursal, password, rol, activo)
             VALUES ($1, 1, $2, $3, TRUE)`,
            [idPersona, passwordHash, rolBD]
        );

        // 8. Si es registro público (Cliente), también insertar en cliente
        if (rolBD === 'Cliente') {
            await client.query(
                `INSERT INTO cliente (id_cliente, telefono, direccion, fecha_nacimiento, activo)
                 VALUES ($1, NULL, NULL, NULL, TRUE)`,
                [idPersona]
            );
        }

        await client.query('COMMIT');

        res.json({
            ok: true,
            message: rolBD === 'Cliente' ? 'Registro completado como Cliente' : 'Usuario registrado exitosamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    } finally {
        client.release();
    }
};

// Logout de usuario
export const logout = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const ipLimpia = getClientIp(req);
        const browser  = req.headers['user-agent'] || 'Desconocido';

        await pool.query(
            `INSERT INTO log_acceso (id_usuario, ip_address, evento, browser)
             VALUES ($1, $2, 'SALIDA', $3)`,
            [req.user.id, ipLimpia, browser]
        );

        res.json({ ok: true, message: 'Salida registrada exitosamente' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error en el servidor al registrar salida' });
    }
};

// Obtener o crear el usuario invitado en la BD
const obtenerOCrearInvitado = async () => {
    const { rows } = await pool.query(
        'SELECT id_persona FROM persona WHERE email = $1',
        ['invitado@yasumi.com']
    );

    if (rows.length > 0) {
        return rows[0].id_persona;
    }

    // No existe — crear todo en una transacción
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: personaRows } = await client.query(
            `INSERT INTO persona (nombre, paterno, materno, email)
             VALUES ('Invitado', NULL, NULL, 'invitado@yasumi.com')
             RETURNING id_persona`
        );
        const idInvitado = personaRows[0].id_persona;

        const dummyPassword = await bcrypt.hash('invitado_password_2026', 10);
        await client.query(
            `INSERT INTO usuario (id_usuario, id_sucursal, password, rol, activo)
             VALUES ($1, 1, $2, 'Cliente', TRUE)`,
            [idInvitado, dummyPassword]
        );

        await client.query(
            `INSERT INTO cliente (id_cliente, telefono, direccion, fecha_nacimiento, activo)
             VALUES ($1, NULL, NULL, NULL, TRUE)`,
            [idInvitado]
        );

        await client.query('COMMIT');
        return idInvitado;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// Login como invitado
export const loginInvitado = async (req, res) => {
    try {
        const idInvitado = await obtenerOCrearInvitado();

        const ipLimpia = getClientIp(req);
        const browser  = req.headers['user-agent'] || 'Desconocido';

        await pool.query(
            `INSERT INTO log_acceso (id_usuario, ip_address, evento, browser)
             VALUES ($1, $2, 'INGRESO', $3)`,
            [idInvitado, ipLimpia, browser]
        );

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