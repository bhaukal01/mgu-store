const mysql = require("mysql");
require("dotenv").config();

const db = mysql.createPool({
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

module.exports = db;
