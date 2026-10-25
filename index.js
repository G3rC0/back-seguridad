import './src/config/env.js';
import express from 'express';
import cors from 'cors';
import { pool } from './src/config/db.js';

// Importación de rutas
import { generarImagenesVacias } from './src/utils/imageGenerator.js';
import authRoutes from './src/routes/authRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import categoryRoutes from './src/routes/categoryRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import logRoutes from './src/routes/logRoutes.js';


const app = express();

// Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Registro de Rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/categorias', categoryRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/logs', logRoutes);

// Ruta de ping para comprobar salud y base de datos
app.get('/ping', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT 'Pong! Conexión exitosa a bd_yasumi' AS mensaje");
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: `Error de base de datos: ${error.message}` });
    }
});

// Inicialización del servidor


const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Yasumi Backend] Servidor activo en http://localhost:${PORT}`);
    await generarImagenesVacias();
});
