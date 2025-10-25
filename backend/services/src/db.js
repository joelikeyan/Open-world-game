import { Pool } from 'pg';
import { config } from './config.js';

const pool = new Pool({
  connectionString: config.database.connectionString,
  max: 10,
  idleTimeoutMillis: 30000
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export const closePool = async () => pool.end();
