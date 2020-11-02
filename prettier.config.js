module.exports = require('@sumup/foundry/prettier')({}, {
  proseWrap: 'always',
  overrides: [
    {
      files: '*.md',
      options: { parser: 'markdown' }
    },
    {
      files: '*.yaml',
      options: { parser: 'yaml' }
    }
  ]
});
