import { pool } from '../config/db.js';
import fs from 'fs';
import path from 'path';

// 1x1 transparent PNG
const transparentPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);

const cleanCategoryName = (nombre) => {
    if (!nombre) return 'otros';
    return nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .trim();
};

export const generarImagenesVacias = async () => {
    try {
        console.log("[Yasumi DB] Iniciando sincronización de imágenes locales...");

        const { rows: productos } = await pool.query(
            `SELECT p.id_producto, p.nombre, p.imagen_url, c.nombre AS categoria
             FROM producto p
             JOIN categoria c ON p.id_categoria = c.id_categoria`
        );

        const frontendPublicDir = process.env.FRONTEND_PUBLIC_DIR || path.resolve(process.cwd(), '../yasumi-vite/public');
        let creados = 0;
        let actualizadosBD = 0;

        for (const p of productos) {
            let imgUrl = p.imagen_url;

            // Si la ruta es una URL externa de ejemplo o ficticia
            if (imgUrl && (imgUrl.includes('example.com') || (!imgUrl.startsWith('/') && !imgUrl.startsWith('http') && imgUrl.length > 5))) {
                const ext      = path.extname(imgUrl) || '.png';
                const filename = path.basename(imgUrl, ext).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() + '.png';
                const catFolder = cleanCategoryName(p.categoria);
                const nuevaRutaLocal = `/productos/${catFolder}/${filename}`;

                await pool.query(
                    'UPDATE producto SET imagen_url = $1 WHERE id_producto = $2',
                    [nuevaRutaLocal, p.id_producto]
                );
                console.log(`[Yasumi DB] BD actualizada para "${p.nombre}": de "${imgUrl}" a "${nuevaRutaLocal}"`);

                imgUrl = nuevaRutaLocal;
                actualizadosBD++;
            }

            // Si es una ruta local, generar el PNG vacío en el frontend si falta
            if (imgUrl && imgUrl.startsWith('/productos/')) {
                const absolutePath = path.join(frontendPublicDir, imgUrl);
                const dirPath = path.dirname(absolutePath);

                if (!fs.existsSync(absolutePath)) {
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    fs.writeFileSync(absolutePath, transparentPngBuffer);
                    console.log(`[Yasumi DB] PNG vacío creado para "${p.nombre}": ${imgUrl}`);
                    creados++;
                }
            }
        }

        if (creados > 0 || actualizadosBD > 0) {
            console.log(`[Yasumi DB] Sincronización completa. BD actualizadas: ${actualizadosBD}, PNGs creados: ${creados}.`);
        } else {
            console.log("[Yasumi DB] Todas las imágenes y rutas están sincronizadas.");
        }
    } catch (error) {
        console.error("[Yasumi DB] Error al verificar/generar imágenes:", error);
    }
};