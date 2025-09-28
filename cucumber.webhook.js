const dotenv = require('@dotenvx/dotenvx');
const fs = require('fs');
const path = require('path');
const { configure } = require('@iamkenos/kyoko/config');

const envfile = path.join(__dirname, `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`);
if (fs.existsSync(envfile)) { dotenv.config({ path: envfile }); }
exports.default = configure({
  browserOptions: {
    headless: process.env.HEADLESS !== 'false',
    browserContextArgs: { timezoneId: 'Asia/Manila' }
  },
  paths: process.env.PATHS ? [...process.env.PATHS] : ['features/webhooks/*.feature'],
  require: ['fixtures/*.steps.ts', 'fixtures/**/*.steps.ts'],
  tags: process.env.TAGS ?? '',
});
