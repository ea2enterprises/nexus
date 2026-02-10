import postgres from 'postgres';
import { config } from '../config/index.js';

export const sql = postgres(config.database.url, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as ok`;
    return result[0]?.ok === 1;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  await sql.end();
}
