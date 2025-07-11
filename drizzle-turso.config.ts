require("dotenv").config();

import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./lib/drizzle-turso",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
