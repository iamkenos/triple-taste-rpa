import axios from "axios";
import { capitalCase } from "change-case";

import type { Parameters } from "../fixtures/rpa.steps";
import type { TelegramMessage, TelegramUpdate } from "../fixtures/services/telegram/telegram.types";

const TELEGRAM_API = "https://api.telegram.org";
const TELEGRAM_BOT_ID = "tripletastebot";
const COMMANDS = {
  update_inventory: "Updates the remaining inventory for today.",
  fetch_deposit_amount: "Fetches the expected deposit amount for today.",
  fetch_shift_rotation: "Fetches the shift rotation for the next pay cycle."
};
const COMMANDS_WITH_REPLIES = {
  update_inventory: "Please reply to this message with the current remaining stock levels for today."
};

function getCommandFrom(message: TelegramMessage) {
  return Object.keys(COMMANDS).find(command => message.text?.includes(capitalCase(command)));
}

function getCommandFromReply(message: TelegramMessage) {
  const command = Object.entries(COMMANDS_WITH_REPLIES).find(([, value]) => value === hasCommandReply(message))[0];
  const parameters = message.text;
  return { command, parameters };
}

function isCommand(command: typeof COMMANDS[keyof typeof COMMANDS]) {
  return Object.entries(COMMANDS).find(([, value]) => value === command)[0];
}

function getSupportedCommands() {
  return `${Object.entries(COMMANDS).map(([command, description]) => `*${capitalCase(command)}*:\n\t▸ ${description}`).join("\n\n")}`;
}

function getPromptItems() {
  return Object.keys(COMMANDS).map(command => ([capitalCase(command)]));
}

function isBotMentioned(message: TelegramMessage) {
  return message.entities?.some((e) => e.type === "mention" && message.text.includes(`@${TELEGRAM_BOT_ID}`));
}

function isBotReply(message: TelegramMessage) {
  return message.reply_to_message?.from?.username === TELEGRAM_BOT_ID;
}

function hasCommand(message: TelegramMessage) {
  return Object.keys(COMMANDS).some(command => message.text?.includes(capitalCase(command)));
}

function hasCommandReply(message: TelegramMessage) {
  return Object.values(COMMANDS_WITH_REPLIES).find(command => message.reply_to_message.text === command);
}

export default {
  async fetch(request: Request, env: Parameters["env"]): Promise<Response> {
    if (request.method !== "POST") return new Response("Triple Taste RPA Webhook", { status: 405 });

    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message || !message.text) return new Response("No relevant message", { status: 200 });
    if (message.chat?.id !== +env.TELEGRAM_CHAT_ID) return new Response("Not authorized", { status: 409 });

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

    const prompt = async() => {
      const text = `
Hi! I can help you with the following:

${getSupportedCommands()}

Tap on the command you need help with so I can assist you with it.
      `;
      try {
        await axios.post(url, {
          chat_id: message.chat.id,
          headers: { "Content-Type": "application/json" },
          text,
          reply_markup: {
            keyboard: [...getPromptItems()],
            resize_keyboard: true,
            one_time_keyboard: true
          },
          parse_mode: "Markdown"
        });
      } catch (error) {
        console.error("Telegram API error:", error.response?.data || error.message);
        return new Response(`${error.message} - ${error?.response?.data?.description} \n`, { status: 400 });
      }
    };

    const runCommand = async({ command, parameters = undefined }) => {
      await fetch(`http://localhost:${env.WEBHOOK_RPA_RUNNER_PORT}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, parameters })
      });
    };

    const getWipMessageFrom = (messages: string[]) => {
      const index = Math.floor(Math.random() * messages.length);
      return messages[index];
    };

    const success = new Response("OK", { status: 200 });

    const wipMessagesShort = [
      "Processing your request...",
      "Just a moment...",
      "Working on it...",
      "Hang tight...",
      "Give me a second..."
    ];

    const wipMessagesMed = [
      "Hold tight while I process your request...",
      "Just a moment, please...",
      "Hang tight, I'm on it...",
      "Give me a second, I'm working on it...",
      "Almost there, just a bit more time..."
    ];

    if (isBotMentioned(message)) {
      await prompt();
    } else if (isBotReply(message)) {
      if (hasCommand(message)) {
        const command = getCommandFrom(message);

        if (command === isCommand(COMMANDS.update_inventory)) {
          await sendMessage({ text: COMMANDS_WITH_REPLIES.update_inventory });
          return success;
        }

        await sendMessage({ text: getWipMessageFrom(wipMessagesMed) });
        await runCommand({ command });
      } else if (hasCommandReply(message)) {
        const { command, parameters } = getCommandFromReply(message);
        await sendMessage({ text: getWipMessageFrom(wipMessagesShort) });
        await runCommand({ command, parameters });
      }
    }

    return success;
  }
};
