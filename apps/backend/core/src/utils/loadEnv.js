import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

let envLoaded = false;

export function loadEnv() {
  if (envLoaded) return process.env;

  // On platforms like Vercel the environment is already injected
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    envLoaded = true;
    return process.env;
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rootEnvPath = path.resolve(__dirname, '../../../../../.env');
    dotenv.config({ path: rootEnvPath });
  } catch (error) {
    console.warn('⚠️ Failed to load .env file:', error.message);
  } finally {
    envLoaded = true;
  }

  return process.env;
}

export default loadEnv;
