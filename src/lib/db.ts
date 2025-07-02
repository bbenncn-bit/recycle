import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: '118.89.111.78',
  port: 3306,
  user: 'remote_user',
  password: 'Monica00',
  database: 'pls',
});