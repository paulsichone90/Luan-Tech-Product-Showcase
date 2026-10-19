
require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // Enable verified TLS when connecting to Aiven
    ssl: process.env.DB_SSL === 'true'
        ? {
            ca: fs.readFileSync(
                path.join(__dirname, 'ca.pem')
            )
        }
        : undefined
});

module.exports = pool;
