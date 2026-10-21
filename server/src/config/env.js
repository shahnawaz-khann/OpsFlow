import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  databaseUrl: isTest
    ? process.env.TEST_DATABASE_URL || 'postgresql://postgres:shahnawaz@localhost:5432/opsflow_test?schema=public'
    : process.env.DATABASE_URL || 'postgresql://postgres:shahnawaz@localhost:5432/opsflow?schema=public',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:shahnawaz@localhost:5432/opsflow_test?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'opsflow-dev-secret-key-min-32-chars-long',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isProduction: nodeEnv === 'production',
  nodeEnv,
};
