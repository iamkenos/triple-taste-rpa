const { configure } = require('@iamkenos/kyoko/config');

exports.default = configure({
  shouldUseVideoAttachment: true,
  paths: ['features/webhooks/*.feature'],
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts']
});
