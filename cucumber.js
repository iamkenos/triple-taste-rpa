const { configure } = require('@iamkenos/kyoko/config');

exports.default = configure({
  shouldUseVideoAttachment: true,
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts']
});
