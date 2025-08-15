export default {
  // extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding/updating tests
        'chore',    // Maintenance tasks
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous changes
      ],
    ],
    
    // Enforce subject case
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    
    // Subject length limits
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 3],
    
    // Body requirements
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    
    // Header requirements
    'header-max-length': [2, 'always', 100],
    
    // Scope requirements
    'scope-case': [2, 'always', 'lower-case'],
    
    // Footer requirements
    'footer-leading-blank': [2, 'always'],
    
    // Prevent empty components
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
  
  // Custom configuration for Australian English
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^)]*)\))?!?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  
  // Helpful commit message examples
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};