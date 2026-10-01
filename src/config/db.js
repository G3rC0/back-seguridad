import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER     || 'yasumi_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME     || 'bd_yasumi',
});