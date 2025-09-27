const dotenv = require('@dotenvx/dotenvx');
const { configure } = require('@iamkenos/kyoko/config');

dotenv.config()
exports.default = configure({
  browserOptions: {
    headless: process.env.HEADLESS !== 'false',
    recordVideo: true,
  },
  paths: process.env.PATHS ? [...process.env.PATHS] : [
    'features/invoice-download/*.feature',
    'features/send-emails/**/*.feature',
    'features/update-sheets/*.feature'
  ],
  debug: process.env.DEBUG === 'true',
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts'],
  tags: process.env.TAGS ?? '',
});
