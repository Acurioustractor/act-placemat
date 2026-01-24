import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../../../..')

export function loadEnv() {
  const envFile = process.env.ACT_ENV_FILE || path.join(projectRoot, '.env')
  dotenv.config({ path: envFile })
}
