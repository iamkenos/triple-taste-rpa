import axios from "axios";

import { RPA } from "~/fixtures/rpa.app";
import { createDate, Unit } from "~/fixtures/utils/date.utils";

export class TelegramSerice extends RPA {

  private token = this.parameters.env.TELEGRAM_BOT_KEY;
  private id = this.parameters.env.TELEGRAM_CHAT_ID;

  async sendMessage({ message }: { message: string }) {
    try {
      const result = await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`, {
          headers: {
            "Content-Type": "application/json"
          },
          chat_id: this.id,
          text: message
        });
      return result.data;
    }
    catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async fetchMessagesToday() {
    try {
      const offset = 0;
      const { date } = createDate();
      const response = await axios.get(`https://api.telegram.org/bot${this.token}/getUpdates`, { params: { offset } });
      const today = date.startOf(Unit.DAY).toUnixInteger();
      const messages = response.data.result.filter(v =>
        v.message?.date >= today &&
        v.message?.chat?.id === +this.id
      );
      return messages;
    }
    catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }
}
