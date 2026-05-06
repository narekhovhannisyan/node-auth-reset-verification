import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url(),
  APP_SECRET: z.string().min(16),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  DATABASE_URL: z.string().min(1),
  MAILTRAP_API_TOKEN: z.string().min(1),
  MAIL_FROM_ADDRESS: z.string().email(),
  MAIL_FROM_NAME: z.string().min(1).default("Auth Team"),
  VERIFY_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(1440),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().positive().default(60),
});

export const env = envSchema.parse(process.env);
