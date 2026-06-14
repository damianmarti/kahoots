import { Pool } from 'pg';

// Shared pool, cached on global so dev hot-reload and serverless reuse it
const globalForPg = global as any;

export const pool: Pool =
  globalForPg._pgPool ??
  (globalForPg._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
  }));
