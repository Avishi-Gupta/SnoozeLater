const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'SnoozeLater-database',
  password: '', // add your password if you set one
  port: 5432,
});

module.exports = pool;