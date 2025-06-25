import { Client } from 'pg';
import pool from './singletonConection';

export const queryDB = async (query: string) => {
  const client = await pool.connect(); // Get a connection from the pool
  try {
  // This is not production ready, some kind of input sanitization should be done
    const res = await client.query(query); // Run query
    return res.rows;
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await client.release(); // Close the connection
  }
}