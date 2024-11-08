const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

let connection;

const getConnection = async () => {
  if (!connection) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  }
  return connection;
};

module.exports = { getConnection };