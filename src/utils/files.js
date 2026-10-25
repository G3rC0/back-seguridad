import fs from 'fs';
import path from 'path'; 

//carpeta /public del frontend donde se guardan las imagenes
export const getFrontendPublicDir = () => 
    process.env.FRONTEND_PUBLIC_DIR || path.resolve(process.cwd(), '../yasumi-vite/public');

//crea la carpeta ( y las intermedias) solo si no existe
export const ensureDir = (dirPath) => {
    if(!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true});
    }
};

// "Te e Infuciones" -> "te_e_infusiones"
export const cleanCategoryName = (nombre) => {
    if(!nombre) return 'otros';
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .trim();
};