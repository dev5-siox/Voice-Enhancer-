import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import * as schema from "@shared/schema";

// Allow running without DATABASE_URL for in-memory storage mode
let db: any = null;

function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const u = new URL(databaseUrl);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    // If parsing fails, assume it's not local (Neon/serverless style).
    return false;
  }
}

if (process.env.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL;
  if (isLocalDatabaseUrl(connectionString)) {
    const pool = new pg.Pool({ connectionString });
    db = drizzlePg(pool, { schema });
    console.log("DB: using node-postgres driver (local DATABASE_URL)");
  } else {
    // Configure Neon for WebSocket support (required for Neon serverless driver).
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString });
    db = drizzleNeon(pool, { schema });
    console.log("DB: using Neon serverless driver");
  }
} else {
  console.warn("⚠️  DATABASE_URL not set. Using in-memory storage instead.");
}

export { db };
