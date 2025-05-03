import axios from "axios";

import { capitalCase } from "change-case";
import {
  BOT_API_SEND_MESSAGE_URL,
  BOT_COMMANDS,
  BOT_COMMANDS_WITH_REPLIES,
  BOT_FAILURE_MESSAGES,
  BOT_ID,
  BOT_SUCCESS_MESSAGES,
  BOT_WIP_MESSAGES
} from "../fixtures/services/telegram/telegram.constants";

import type { Parameters } from "../fixtures/rpa.steps";
import type { TelegramMessage, TelegramUpdate } from "../fixtures/services/telegram/telegram.types";

function getCommandFrom(message: TelegramMessage) {
  return Object.keys(BOT_COMMANDS).find(command => message.text?.includes(capitalCase(command)));
}

function getCommandFromReply(message: TelegramMessage) {
  const command = Object.entries(BOT_COMMANDS_WITH_REPLIES).find(([, value]) => value === hasCommandReply(message))[0];
  const parameters = message.text;
  return { command, parameters };
}

function getSupportedCommands() {
  return `${Object.entries(BOT_COMMANDS).map(([command, description]) => `*${capitalCase(command)}*:\n\t▸ ${description}`).join("\n\n")}`;
}

function getPromptItems() {
  return Object.keys(BOT_COMMANDS).map(command => ([capitalCase(command)]));
}

function getResponseMessage(responses: string[]) {
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

function getTaskWIPResponseMessage(variant?: string) {
  const responses = BOT_WIP_MESSAGES[variant] ?? BOT_WIP_MESSAGES.default;
  const message = getResponseMessage(responses);
  return message;
}

function getTaskCompleteResponseMessage(response: Response, sendOnSuccess = true, variant?: string) {
  const isSuccess = response.status === 200;
  const messages = isSuccess ? BOT_SUCCESS_MESSAGES : BOT_FAILURE_MESSAGES;
  const responses = messages[variant] ?? messages.default;
  const message = !isSuccess || (isSuccess && sendOnSuccess) ? getResponseMessage(responses) : undefined;
  return message;
}

function hasCommand(message: TelegramMessage) {
  return Object.keys(BOT_COMMANDS).some(command => message.text?.includes(capitalCase(command)));
}

function hasCommandReply(message: TelegramMessage) {
  return Object.values(BOT_COMMANDS_WITH_REPLIES).find(command => message.reply_to_message.text === command);
}

function isCommand(command: typeof BOT_COMMANDS[keyof typeof BOT_COMMANDS]) {
  return Object.entries(BOT_COMMANDS).find(([, value]) => value === command)[0];
}

function isBotMentioned(message: TelegramMessage) {
  return message.entities?.some((e) => e.type === "mention" && message.text.includes(`@${BOT_ID}`));
}

function isBotReply(message: TelegramMessage) {
  return message.reply_to_message?.from?.username === BOT_ID;
}

export default {
  async fetch(request: Request, env: Parameters["env"]): Promise<Response> {
    if (request.method !== "POST") return new Response("Triple Taste RPA Webhook", { status: 405 });

    const key = env.TELEGRAM_BOT_KEY;
    const url = `${BOT_API_SEND_MESSAGE_URL(key)}`;

    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message || !message.text) return new Response("No relevant message", { status: 200 });
    if (message.chat?.id !== +env.TELEGRAM_CHAT_ID) return new Response("Not authorized", { status: 409 });

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
      return await fetch(`http://localhost:${env.WEBHOOK_RPA_RUNNER_PORT}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, parameters })
      });
    };

    const success = new Response("OK", { status: 200 });

    if (isBotMentioned(message)) {
      await prompt();
    } else if (isBotReply(message)) {
      if (hasCommand(message)) {
        const command = getCommandFrom(message);

        if (command === isCommand(BOT_COMMANDS.update_inventory)) {
          await sendMessage({ text: BOT_COMMANDS_WITH_REPLIES.update_inventory });
          return success;
        }

        await sendMessage({ text: getTaskWIPResponseMessage() });
        const response = await runCommand({ command });
        await sendMessage({ text: getTaskCompleteResponseMessage(response, false) });
      } else if (hasCommandReply(message)) {
        const { command, parameters } = getCommandFromReply(message);
        await sendMessage({ text: getTaskWIPResponseMessage("short") });
        const response = await runCommand({ command, parameters });
        await sendMessage({ text: getTaskCompleteResponseMessage(response) });
      }
    }

    return success;
  }
};
