import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './shared/schema';

neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Creating tables...');
  try {
    // Execute raw SQL to create tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        theme TEXT NOT NULL,
        currency TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        account_id INTEGER NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        category TEXT NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        account_type TEXT NOT NULL,
        balance INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Tables created successfully!');

    // Insert the default admin user
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'admin@example.com')
    });

    if (!existingAdmin) {
      await db.insert(schema.users).values({
        name: 'Admin User',
        email: 'admin@example.com',
        password: '$2b$10$PuVFZ9gXu1FSSG6sJiMAuOXMJ7jRRVmWJAuAoErm/2BKcvLFlAFi6', // hashed "password123"
        role: 'super_admin',
        theme: 'light',
        currency: 'USD'
      });
      console.log('Default admin user created!');
    }

    // Insert a regular test user
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'user@example.com')
    });

    if (!existingUser) {
      await db.insert(schema.users).values({
        name: 'Regular User',
        email: 'user@example.com',
        password: '$2b$10$PuVFZ9gXu1FSSG6sJiMAuOXMJ7jRRVmWJAuAoErm/2BKcvLFlAFi6', // hashed "password123"
        role: 'user',
        theme: 'light',
        currency: 'USD'
      });
      console.log('Default regular user created!');
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

main();