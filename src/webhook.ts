import axios from "axios";

import { capitalCase } from "change-case";
import {
  BOT_ACK_MESSAGES,
  BOT_API_ANSWER_QUERY_URL,
  BOT_API_GET_CHAT_MEMBER_URL,
  BOT_API_SEND_MESSAGE_URL,
  BOT_COMMANDS,
  BOT_COMMANDS_WITH_REPLIES,
  BOT_FAILURE_MESSAGES,
  BOT_ID,
  BOT_PROMPT_YN,
  BOT_SUCCESS_MESSAGES,
  BOT_WIP_MESSAGES
} from "../fixtures/services/telegram/telegram.constants";

import type { Parameters } from "../fixtures/rpa.steps";
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from "../fixtures/services/telegram/telegram.types";

function getCommandFrom(callback: TelegramCallbackQuery) {
  return Object.keys(BOT_COMMANDS).find(command => callback.data === command);
}

function getCommandKey(command: typeof BOT_COMMANDS[keyof typeof BOT_COMMANDS]) {
  return Object.entries(BOT_COMMANDS).find(([, value]) => value === command)[0];
}

function getReply(message: TelegramMessage) {
  const command = Object.entries(BOT_COMMANDS_WITH_REPLIES).find(([, value]) => value === hasCommandReply(message))?.[0];
  const parameters = message?.text;
  return { command, parameters };
}

function getSupportedCommands() {
  return `${Object.entries(BOT_COMMANDS).map(([command, description]) => `*${capitalCase(command)}*:\n\t▸ ${description}`).join("\n\n")}`;
}

function getPromptItems() {
  return Object.keys(BOT_COMMANDS).map(command => ([ { text: capitalCase(command), callback_data: command } ]));
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

function getTaskCompleteResponseMessage(env: Parameters["env"], response: Response, sendOnSuccess = true) {
  const isSuccess = response.status === 200;
  const messages = isSuccess ? BOT_SUCCESS_MESSAGES : BOT_FAILURE_MESSAGES;
  const responses = messages.default;
  const message = !isSuccess || (isSuccess && sendOnSuccess) ? getResponseMessage(responses) : undefined;
  const markedup = !isSuccess ? `[${message}](${env.WEBHOOK_RESULTS_TUNNEL_URL})` : message;
  return markedup;
}

function hasCommandReply(message: TelegramMessage) {
  return Object.values(BOT_COMMANDS_WITH_REPLIES).find(command => message.reply_to_message.text === command);
}

function isBotMentioned(message: TelegramMessage) {
  return message.entities?.some((e) => e.type === "mention" && message.text.includes(`@${BOT_ID}`));
}

function isBotReply(message: TelegramMessage) {
  const username = message.reply_to_message?.from?.username ?? "";
  return username.startsWith(BOT_ID) && username.endsWith("bot");
}

function isMessage(update: TelegramUpdate) {
  return update.message && update.message?.text;
}

function isPromptResponse(update: TelegramUpdate) {
  return update.callback_query?.data && update.callback_query?.message;
}

function shouldProcess(update: TelegramUpdate, env: Parameters["env"]) {
  const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
  const isChatIdAllowed = chatId === +env.TELEGRAM_CHAT_ID;
  const isUpdateTypeAllowed = isMessage(update) || isPromptResponse(update);
  const shouldProcess = isChatIdAllowed && isUpdateTypeAllowed;
  return shouldProcess;
}

function getUserId(update: TelegramUpdate) {
  const userId = update.message?.from?.id ?? update.callback_query?.from?.id;
  return userId;
}

async function fetchIsUpdateFromGroupAdmin({ env, userId }: { env: Parameters["env"], userId: number }) {
  if (userId) {
    const key = env.TELEGRAM_BOT_KEY; const chatId = env.TELEGRAM_CHAT_ID;
    const response = await axios.get(`${BOT_API_GET_CHAT_MEMBER_URL(key, chatId, userId)}`);
    return ["administrator", "creator"].includes(response?.data?.result?.status);
  } else {
    return false;
  }
}

async function showPrompt({ env }: { env: Parameters["env"] }) {
  const text = `
  Hi! I can help you with the following:

  ${getSupportedCommands()}

  Tap on the command you need help with so I can assist you with it.
        `;
  await axios.post(`${BOT_API_SEND_MESSAGE_URL(env.TELEGRAM_BOT_KEY)}`, {
    chat_id: +env.TELEGRAM_CHAT_ID,
    headers: { "Content-Type": "application/json" },
    text,
    reply_markup: {
      inline_keyboard: [...getPromptItems()],
      resize_keyboard: true,
      one_time_keyboard: true
    },
    parse_mode: "Markdown"
  });
}

async function sendMessage({ env, text }: { env: Parameters["env"], text: string }) {
  await axios.post(`${BOT_API_SEND_MESSAGE_URL(env.TELEGRAM_BOT_KEY)}`, {
    chat_id: +env.TELEGRAM_CHAT_ID, text, parse_mode: "Markdown"
  });
}

async function acknowledgeCallback({ env, callback }: { env: Parameters["env"], callback: TelegramCallbackQuery }) {
  await axios.post(`${BOT_API_ANSWER_QUERY_URL(env.TELEGRAM_BOT_KEY)}`, {
    callback_query_id: callback.id, show_alert: false
  });
}

async function acknowledgeCommand({ env, command }: { env: Parameters["env"], command: string }) {
  const randomIndex = Math.floor(Math.random() * BOT_ACK_MESSAGES.default.length);
  const func = BOT_ACK_MESSAGES.default[randomIndex];
  const text = func(capitalCase(command));
  await sendMessage({ env, text });
}

async function runPromptCommand({ env, command, parameters = undefined }: { env: Parameters["env"], command: string, parameters?: any }) {
  return await fetch(`http://localhost:${env.WEBHOOK_RPA_RUNNER_PORT}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, parameters })
  });
}

export default {
  async fetch(request: Request, env: Parameters["env"]) {
    if (request.method !== "POST") return new Response("Triple Taste RPA Webhook", { status: 405 });

    try {
      const update: TelegramUpdate = await request.json();

      if (!shouldProcess(update, env)) return new Response(undefined, { status: 204 });

      if (isMessage(update)) {
        const message = update.message;

        const userId = getUserId(update);
        const isFromGroupAdmin = await fetchIsUpdateFromGroupAdmin({ env, userId });
        if (!isFromGroupAdmin) return new Response(undefined, { status: 204 });

        if (isBotMentioned(message)) {
          await showPrompt({ env });
        } else if (isBotReply(message)) {
          const { command, parameters } = getReply(message);

          switch (command) {
            case getCommandKey(BOT_COMMANDS.update_inventory): {
              await sendMessage({ env, text: getTaskWIPResponseMessage("long") });
              const response = await runPromptCommand({ env, command, parameters });
              const message = getTaskCompleteResponseMessage(env, response);
              if (message) await sendMessage({ env, text: message });
              break;
            }
            case getCommandKey(BOT_COMMANDS.create_order): {
              if (BOT_PROMPT_YN.YES.includes(parameters.toLowerCase())) {
                await sendMessage({ env, text: getTaskWIPResponseMessage("long") });
                const response = await runPromptCommand({ env, command });
                const message = getTaskCompleteResponseMessage(env, response, false);
                if (message) await sendMessage({ env, text: message });
              } else {
                await sendMessage({ env, text: "Once your side is ready, please let me know." });
              }
              break;
            }
            default:
              break;
          }
        }
      } else if (isPromptResponse(update)) {
        const callback = update.callback_query;
        await acknowledgeCallback({ env, callback });

        const userId = getUserId(update);
        const isFromGroupAdmin = await fetchIsUpdateFromGroupAdmin({ env, userId });
        if (!isFromGroupAdmin) return new Response(undefined, { status: 204 });

        const command = getCommandFrom(callback);
        await acknowledgeCommand({ env, command });

        switch (command) {
          case getCommandKey(BOT_COMMANDS.update_inventory): {
            await sendMessage({ env, text: BOT_COMMANDS_WITH_REPLIES.update_inventory });
            break;
          }
          case getCommandKey(BOT_COMMANDS.create_order): {
            await sendMessage({ env, text: BOT_COMMANDS_WITH_REPLIES.create_order });
            break;
          }
          default: {
            await sendMessage({ env, text: getTaskWIPResponseMessage() });
            const response = await runPromptCommand({ env, command });
            const message = getTaskCompleteResponseMessage(env, response, false);
            if (message) await sendMessage({ env, text: message });
            break;
          }
        }
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Internal Server Error", "\n", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
