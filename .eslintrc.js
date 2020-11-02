module.exports = require('@sumup/foundry/eslint')({
  language: 'TypeScript',
  environments: ['Node'],
  frameworks: ['Jest'],
  openSource: false,
},

  {
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
          moduleDirectory: ['node_modules', 'api/'],
        },
      },
    },
    overrides: [
      {
        files: ['*.config.js', '.*rc.js', 'plopfile.js', '*/test-utils/*'],
        rules: {
          'import/no-extraneous-dependencies': [
            'error',
            { devDependencies: true },
          ],
        },
      },
    ],
    env: {
      jest: true,
    },
  },

);
