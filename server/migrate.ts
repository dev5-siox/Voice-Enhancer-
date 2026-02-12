import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Cannot run migrations.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("Migrations complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
