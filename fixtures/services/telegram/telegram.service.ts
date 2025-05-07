import { distance } from "fastest-levenshtein";

import axios from "axios";

import { RPA } from "~/fixtures/rpa.app";
import { EscapeSequence, unescapeJsonRestricted } from "~/fixtures/utils/string.utils";
import { BOT_API_SEND_MESSAGE_URL } from "~/fixtures/services/telegram/telegram.constants";
import { Format } from "~/fixtures/utils/date.utils";

import type { InventoryInfo } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export class TelegramService extends RPA {

  private token = this.parameters.env.TELEGRAM_BOT_KEY;
  private id = this.parameters.env.TELEGRAM_CHAT_ID;

  async sendMessage({ message }: { message: string }) {
    try {
      const result = await axios.post(
        `${BOT_API_SEND_MESSAGE_URL(this.token)}`, {
          headers: {
            "Content-Type": "application/json"
          },
          chat_id: this.id,
          text: message,
          parse_mode: "Markdown"
        });
      return result.data;
    }
    catch (error) {
      this.logger.error(error.message, error?.response?.data?.description);
      throw error;
    }
  }

  async sendShiftRotationMessage() {
    const shiftRotationInfo = this.parameters.gmail.staff.rotation;
    const firstName = (staffName: string) => staffName.split(" ")[0];

    const message = `
────────────────
📌 *Announcement: Shift Rotation*
────────────────

*Date Range:*
- ${shiftRotationInfo[0].period}

*Roster:*
${shiftRotationInfo.map(v => `- ${v.shiftIcon} ${firstName(v.staffName)}: ${v.shift}`).join(EscapeSequence.LF[0])}
────────────────`;
    await this.sendMessage({ message });
  }

  async sendExpectedDepositAmountMessage() {
    const { amount, date } = this.parameters.gsheets.sales.deposit;
    const message = `
*Date:*
- ${date}
*Amount:*
- ${amount}`;
    await this.sendMessage({ message });
  }

  async parseRemainingItems() {
    const input = unescapeJsonRestricted(this.parameters.webhook).split(EscapeSequence.LF[0]);
    const items = this.parameters.gsheets.inventory.products;

    const normalize = (text: string) => text.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const findBestMatch = (name: string, filters: string[]) => {
      const normalizedName = normalize(name);

      // try partial matches first
      for (const filter of filters) {
        const normalizedFilter = normalize(filter);
        if (normalizedName.includes(normalizedFilter) || normalizedFilter.includes(normalizedName)) {
          return filter;
        }
      }

      // fallback: fuzzy match
      for (const filter of filters) {
        const normalizedFilter = normalize(filter);
        const score = distance(normalizedName, normalizedFilter);
        if (score <= 3) {
          return filter;
        }
      }
    };
    const splitProductLine = (line: string) => {
      const lastEqual = line.lastIndexOf("=");
      const lastDash = line.lastIndexOf("-");
      const splitIndex = Math.max(lastEqual, lastDash);

      if (splitIndex === -1) return null; // not a valid product line
      const rawName = line.slice(0, splitIndex).trim();
      const rawValue = line.slice(splitIndex + 1).trim();

      return [rawName, rawValue];
    };
    const buildInventoryData = (input: string[], filters: string[]) => {
      const output: InventoryInfo[] = [];
      for (const line of input) {
        const split = splitProductLine(line);
        if (!split) continue; // skip non-product lines

        const [rawName, rawValue] = split;
        const name = findBestMatch(rawName, filters);

        if (name) {
          const numericMatch = rawValue.match(/\d+/);
          const value = numericMatch ? numericMatch[0] : "0";
          output.push({ name, value });
        }
      }
      return output;
    };

    const inventoryData = buildInventoryData(input, items);
    await this.page.expect({ timeout: 1 }).truthy(() => inventoryData.length > 0).poll();
    return inventoryData ;
  }

  async sendOrderConfirmation() {
    const { amount, deliveryDate, por, status, customerName } = this.parameters.gsheets.inventory.order;
    const message = `
────────────────
📦 *Order# ${por}*
────────────────

*Customer Name:*
- ${customerName}
*Delivery Date:*
- ${deliveryDate.toFormat(Format.DATE_SHORT_DMC)}
*Total Amount:*
- ${amount}
*Status:*
- ${status}`;
    await this.sendMessage({ message });
  }
}
