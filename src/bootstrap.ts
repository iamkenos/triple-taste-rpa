import axios from "axios";
import dotenv from "dotenv";

import { BOT_API_SET_WEBHOOK_URL } from "../fixtures/services/telegram/telegram.constants";

dotenv.config();
(async() => {
  try {
    const url = process.argv[2];

    if (!url) {
      console.error("Usage: npm run bootstrap -- <webhook-url>");
      process.exit(1);
    }

    const key = process.env.TELEGRAM_BOT_KEY;
    const response = await axios.post(`${BOT_API_SET_WEBHOOK_URL(key)}`, { url });
    console.log(response.data);
  } catch (error) {
    console.error(error?.data || error.message);
  }
})();
