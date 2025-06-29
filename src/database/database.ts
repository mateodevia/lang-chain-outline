import pool from './singleton-connection';

/**
 * Executes a SQL query against the PostgreSQL database using a connection from the pool.
 * 
 * @param query - The SQL query string to execute
 * @returns Promise that resolves to the query result rows, or undefined if an error occurs
 * 
 * @warning This function is not production ready. Input sanitization should be implemented
 * to prevent SQL injection attacks. Consider using parameterized queries instead.
 * 
 * @example
 * ```typescript
 * const users = await queryDB('SELECT * FROM users WHERE active = true');
 * ```
 */
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