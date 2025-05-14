

import { TelegramBot } from "./telegram.bot";
import { RPA } from "~/fixtures/rpa.app";
import { EscapeSequence } from "~/fixtures/utils/string.utils";
import { Format } from "~/fixtures/utils/date.utils";

export class TelegramService extends RPA {

  private bot = new TelegramBot(this.parameters.env);

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
    await this.bot.sendMessage({ message });
  }

  async sendExpectedDepositAmountMessage() {
    const { amount, date } = this.parameters.gsheets.sales.deposit;
    const message = `
*Date:*
- ${date}
*Amount:*
- ${amount}`;
    await this.bot.sendMessage({ message });
  }

  async sendOrderConfirmation() {
    const { amount, deliveryDate, por, status, customerName, orderedBy } = this.parameters.gsheets.inventory.order;
    const message = `
────────────────
📦 *Order# ${por}*
────────────────

*Customer Name:*
- ${customerName}
*Ordered By:*
- ${orderedBy}
*Delivery Date:*
- ${deliveryDate.toFormat(Format.DATE_SHORT_DMC)}
*Total Amount:*
- ${amount}
*Status:*
- ${status}`;
    await this.bot.sendMessage({ message });
  }

  async sendInventoryUpdateConfirmation() {
    const { usage, remaining, missing } = this.parameters.gsheets.inventory;
    const negative = usage.filter(item => +item.value < 0);

    if (negative.length > 0) {
      const header = this.bot.getRandomMessageFrom({ messages: this.bot.BOT_FAILURE_MESSAGES.default });
      const getvalue = (name: string) => remaining.find(item => item.name === name).value;
      const message = `${header}

I completed the updates but it looks like the remaining values for these products may have some issues:

${negative.map(({ name, value }) => `*${name}*\n  ▸ Yesterday: ${getvalue(name)}\n  ▸ Today: ${+getvalue(name) + Math.abs(+value)}`).join("\n")}

Feel free to resend the updated values if necessary, by replying to the original prompt.`;
      await this.bot.sendMessage({ message });
    } else if (missing.length > 0) {
      const header = this.bot.getRandomMessageFrom({ messages: this.bot.BOT_SUCCESS_MESSAGES.default });
      const message = `${header}

I completed the updates but the following items seem to be missing from the report:

${missing.map(({ name, value }) => `▸ ${name}: ${value}`).join("\n")}

If you think there's an error with the report you sent, we can fix it if you reply to the original prompt with the corrected values.`;
      await this.bot.sendMessage({ message });
    } else {
      await this.bot.sendSuccessMessage();
    }
  }
}
