import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

// drizzle beta.20 removed `schema` from DrizzlePgConfig. Tables are
// typed via their direct imports (`.from(table)`), not via the db client.
export const db = drizzle(databaseUrl);
