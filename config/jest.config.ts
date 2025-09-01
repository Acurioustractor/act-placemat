import type { Config } from 'jest';
import { getJestProjectsAsync } from '@nx/jest';

export default async (): Promise<Config> => ({
  projects: await getJestProjectsAsync(),
  preset: './config/jest.preset.cjs',
  setupFilesAfterEnv: ['./config/jest.setup.js'],
});