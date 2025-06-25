import { Pool } from 'pg';

const pool = new Pool({
connectionString: process.env.PG_CONNECTION_STRING,
  max: 10, // Max connections in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error if connection takes more than 2 seconds
});

export default pool;