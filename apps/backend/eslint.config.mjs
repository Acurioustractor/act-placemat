import baseConfig from '../../eslint.config.mjs';

export default [
  // Inherit base configuration
  ...baseConfig,
  
  // Backend-specific overrides
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      globals: {
        // Node.js globals
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      // Backend can use console for logging
      'no-console': 'off',
      
      // Allow require() in Node.js contexts
      '@typescript-eslint/no-var-requires': 'off',
      
      // Backend often needs any for middleware, etc.
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Node.js specific rules
      'no-process-exit': 'error',
      'no-path-concat': 'error',
    },
  },
  
  // Server/config files
  {
    files: ['server.js', '*.config.*', 'scripts/**/*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];