import frontendConfig from './apps/frontend/eslint.config.js'

const scopedFrontendConfig = frontendConfig
  .filter((config) => config?.name !== 'react-refresh/vite')
  .map((config, index) => {
    if (!config.files) return config
    const scopedFiles = config.files.map((pattern) =>
      pattern.startsWith('apps/frontend/') ? pattern : pattern.replace('**/*', 'apps/frontend/**/*')
    )
    return {
      ...config,
      name: config.name ? `${config.name} (workspace scoped)` : `frontend-config-${index}`,
      files: scopedFiles,
    }
  })

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/backend/**',
      'packages/**',
      'supabase/**',
      'scripts/**',
      'docker/**',
    ],
  },
  ...scopedFrontendConfig,
]
