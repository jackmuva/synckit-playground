import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env",
});

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./lib/drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "db.sqlite"
  },
});
