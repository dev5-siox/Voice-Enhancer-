import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import ws from "ws";

function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const u = new URL(databaseUrl);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Cannot run migrations.");
    process.exit(1);
  }

  console.log("Running migrations...");
  try {
    const connectionString = process.env.DATABASE_URL;
    if (isLocalDatabaseUrl(connectionString)) {
      const pool = new pg.Pool({ connectionString });
      const db = drizzlePg(pool);
      await migratePg(db, { migrationsFolder: "./migrations" });
      await pool.end();
    } else {
      neonConfig.webSocketConstructor = ws;
      const pool = new NeonPool({ connectionString });
      const db = drizzleNeon(pool);
      await migrateNeon(db, { migrationsFolder: "./migrations" });
      await pool.end();
    }
    console.log("Migrations complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
