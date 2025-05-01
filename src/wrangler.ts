import axios from "axios";

import type { Parameters } from "../fixtures/rpa.steps";
import type { TelegramMessage, TelegramUpdate } from "../fixtures/services/telegram/telegram.types";

const TELEGRAM_API = "https://api.telegram.org";
const TELEGRAM_BOT_ID = "tripletastebot";
const COMMANDS = {
  "update_inventory": "Updates the remaining inventory for today.",
  "fetch_deposit_amt": "Fetches the expected deposit amount for today.",
  "fetch_shift_rotation": "Fetches the shift rotation for the next pay cycle."
};

function getCommandFrom(message: TelegramMessage) {
  return Object.keys(COMMANDS).find(command => message.text?.includes(command));
}

function getSupportedCommands() {
  return `${Object.entries(COMMANDS).map(([command, description]) => `/${command}:\n\t▸ ${description}`).join("\n")}`;
}

function isBotMentioned(message: TelegramMessage) {
  return message.entities?.some((e) => e.type === "mention" && message.text.includes(`@${TELEGRAM_BOT_ID}`));
}

function isBotReply(message: TelegramMessage) {
  return message.reply_to_message?.from?.username === TELEGRAM_BOT_ID;
}

function hasCommand(message: TelegramMessage) {
  return Object.keys(COMMANDS).some(command => message.text?.includes(command));
}

export default {
  async fetch(request: Request, env: Parameters["env"]): Promise<Response> {
    if (request.method !== "POST") return new Response("Triple Taste RPA Webhook", { status: 405 });

    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message || !message.text) return new Response("No relevant message", { status: 200 });

    const url = `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_KEY}/sendMessage`;
    const sendMessage = async({ text }) => {
      try {
        await axios.post(url, {
          chat_id: message.chat.id,
          text
        });
      } catch (error) {
        return new Response(`Unable to send message: ${error}`, { status: 400 });
      }
    };

    if (isBotMentioned(message)) {
      const text = `
Hi! I can help you with the following:

${getSupportedCommands()}

Tap on the command you need help with so I can assist you with it.
`;
      await sendMessage({ text });
    } else if (isBotReply(message)) {
      if (hasCommand(message)) {
        const command = getCommandFrom(message);
        await sendMessage({ text: "Give me a moment while I process your request..." });
        await fetch(`http://localhost:${env.WEBHOOK_RPA_RUNNER_PORT}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command })
        });
      }
    }

    return new Response("ok", { status: 200 });
  }
};
