import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: '43.137.106.186',
  port: 25424,
  user: 'root',
  password: 'Rsg@px@123',
  database: 'pls',
});