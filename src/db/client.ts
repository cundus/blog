import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) {
	throw new Error('DATABASE_URL is not set. See .env.example.');
}

// prepare: false + max: 1 are safer for serverless (Netlify Functions)
const client = postgres(url, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });

export * from './schema';
