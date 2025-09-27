const dotenv = require('@dotenvx/dotenvx');
const { configure } = require('@iamkenos/kyoko/config');

dotenv.config()
exports.default = configure({
  browserOptions: {
    headless: process.env.HEADLESS !== 'false',
    recordVideo: true,
    browserContextArgs: { timezoneId: 'Asia/Manila' }
  },
  paths: process.env.PATHS ? [...process.env.PATHS] : ['features/webhooks/*.feature'],
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts'],
  tags: process.env.TAGS ?? '',
});
