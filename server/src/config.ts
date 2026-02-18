import "dotenv/config";

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseIssuer: process.env.SUPABASE_JWT_ISSUER,
  supabaseAudience: process.env.SUPABASE_JWT_AUDIENCE,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
};
