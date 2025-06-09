const { configure } = require('@iamkenos/kyoko/config');

exports.default = configure({
  contextOptions: { timezoneId: 'Asia/Manila' },
  shouldUseVideoAttachment: true,
  paths: ['features/webhooks/*.feature'],
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts'],
  stealth: true
});
