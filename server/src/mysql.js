import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'vybe';

export async function initDb() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      password VARCHAR(100) NOT NULL,
      securityQuestion VARCHAR(255),
      securityAnswer VARCHAR(100),
      createdAt VARCHAR(40),
      UNIQUE KEY uq_username (username)
    )
  `);
  await ensureColumn(conn, 'users', 'securityQuestion', 'VARCHAR(255)');
  await ensureColumn(conn, 'users', 'securityAnswer', 'VARCHAR(100)');
  await conn.end();
}

async function ensureColumn(conn, table, column, definition) {
  try {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }
}

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5
});
