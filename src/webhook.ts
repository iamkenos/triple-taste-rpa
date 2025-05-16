import { TelegramBot } from "../fixtures/services/telegram/telegram.bot";

import type { Env, RPAPayload } from "./types";
import type { TelegramUpdate } from "../fixtures/services/telegram/telegram.types";

async function runCommand({ env, command, parameters = undefined, notifyOnSuccess = true }: RPAPayload & { env: Env } ) {
  const rpaEndpoint = `http://localhost:${env.WEBHOOK_RPA_RUNNER_PORT}/run`;
  const notifyOnFailureLink = env.WEBHOOK_RESULTS_TUNNEL_URL;
  await fetch(rpaEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, parameters, notifyOnSuccess, notifyOnFailureLink })
  });
}

function initBot({ env }: { env: Env }) {
  if (!bot) {
    bot = new TelegramBot(env);
  }
}

let bot: TelegramBot;
export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") return new Response("Triple Taste RPA Webhook", { status: 405 });

    try {
      initBot({ env });
      const update: TelegramUpdate = await request.json();
      const shouldProcess = bot.shouldProcess({ update });
      if (!shouldProcess) return new Response(undefined, { status: 204 });

      const { create_order, fetch_shift_rotation, update_inventory } = bot.BOT_COMMANDS;
      const isMessage = bot.isMessage({ update });
      const isPromptResponse = bot.isPromptResponse({ update });

      if (isMessage) {
        const isFromGroupAdmin = await bot.isFromGroupAdmin({ update });
        if (!isFromGroupAdmin) return new Response(undefined, { status: 204 });

        const message = update.message;
        const isBotMentioned = await bot.isBotMentioned({ message });
        const isBotReply = await bot.isBotReply({ message });

        if (isBotMentioned) {
          await bot.showPrompt();
        } else if (isBotReply) {
          const { command, parameters } = bot.getCommandReplyFrom({ message });

          switch (command) {
            case bot.getCommandKey({ command: create_order }): {
              const hasConfirmed = bot.BOT_CONFIRMATION_MESSAGES.default.includes(parameters.toLowerCase());
              if (hasConfirmed) {
                const botName = await bot.fetchBotName();
                const from = bot.getUserInfoFrom({ update }).name;
                await runCommand({ env, command, parameters: `${from} c/o ${botName}`, notifyOnStartedVariant: "long", notifyOnSuccess: false });
              } else {
                await bot.sendCommandParkedMessage({ update, command });
              }
              break;
            }
            case bot.getCommandKey({ command: fetch_shift_rotation }): {
              const isForCurrent = parameters.toLowerCase() === "current";
              await runCommand({ env, command, parameters: isForCurrent ? true : undefined });
              break;
            }
            case bot.getCommandKey({ command: update_inventory }): {
              await runCommand({ env, command, parameters, notifyOnStartedVariant: "long", notifyOnSuccess: false });
              break;
            }
            default:
              break;
          }
        }
      } else if (isPromptResponse) {
        const callback = update.callback_query;
        const command = bot.getCommandFrom({ callback });
        await bot.answerCallbackQuery({ callback });

        const isFromGroupAdmin = await bot.isFromGroupAdmin({ update });
        if (!isFromGroupAdmin) return new Response(undefined, { status: 204 });

        if (!command) {
          await this.sendCommandRejectedMessage({ update, command });
          return new Response(undefined, { status: 204 });
        }

        await bot.sendCommandAcknowledgedMessage({ update, command });
        switch (command) {
          case bot.getCommandKey({ command: create_order }): {
            await bot.sendMessage({ message: bot.BOT_COMMANDS_WITH_REPLIES.create_order });
            break;
          }
          case bot.getCommandKey({ command: fetch_shift_rotation }): {
            await bot.sendMessage({ message: bot.BOT_COMMANDS_WITH_REPLIES.fetch_shift_rotation });
            break;
          }
          case bot.getCommandKey({ command: update_inventory }): {
            await bot.sendMessage({ message: bot.BOT_COMMANDS_WITH_REPLIES.update_inventory });
            break;
          }
          default: {
            await runCommand({ env, command, notifyOnSuccess: false });
            break;
          }
        }
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Internal Server Error", "\n", err);
      return new Response("Internal Server Error", { status: 200 });
    }
  }
};
