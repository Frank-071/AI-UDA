import { Pool } from 'pg';
const globalForDb = globalThis;
export const db = globalForDb.workdocDb || new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalForDb.workdocDb = db;
