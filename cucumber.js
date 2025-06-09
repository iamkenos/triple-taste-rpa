const { configure } = require('@iamkenos/kyoko/config');

exports.default = configure({
  shouldUseVideoAttachment: true,
  paths: [
    'features/invoice-download/*.feature',
    'features/send-emails/**/*.feature',
    'features/update-sheets/*.feature'
  ],
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts'],
  stealth: true
});
