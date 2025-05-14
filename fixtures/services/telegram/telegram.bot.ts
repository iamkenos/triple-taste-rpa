import axios from "axios";

import { capitalCase } from "change-case";

import type { SendMessageOptions, TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from "./telegram.types";
import type { Parameters } from "../../rpa.steps";

export class TelegramBot {
  private baseURL = "https://api.telegram.org";
  private botURL: string;
  private botToken: string;
  private botName: string;
  private botID: string;
  private chatID: string;
  private promptManual: string;
  private promptKeyboard: [{ text: string; callback_data: string; }][];

  BOT_COMMANDS = {
    create_order: "Creates an order on the OOS.",
    fetch_deposit_amount: "Fetches the expected deposit amount for today.",
    fetch_shift_rotation: "Fetches the shift assignments for the current or next pay cycle.",
    update_inventory: "Updates the remaining inventory for today."
  };

  BOT_COMMANDS_WITH_REPLIES = {
    create_order: "Before we proceed, please make sure the inventory sheet is updated with accurate product quantities to order.\n\nHave you done your part?",
    fetch_shift_rotation: "Please reply to this message with 'current' if you need the data for the current pay cycle.\n\nAny other response will get you the data for the next pay cycle.",
    update_inventory: "Please reply to this message with the current remaining stock levels for today."
  };

  BOT_ACKNOWLEDGE_MESSAGES = {
    default: [
      (user: string, command: string) => `Got it, *${user}*! You selected *${command}*.`,
      (user: string, command: string) => `Acknowledged, *${user}*. *${command}* is now in progress.`,
      (user: string, command: string) => `Understood, *${user}*. You've chosen *${command}*.`,
      (user: string, command: string) => `Okay *${user}*! Executing *${command}*.`,
      (user: string, command: string) => `Roger that, *${user}*! You've selected *${command}*.`
    ],
    reject: [
      (user: string, command: string) => `Apologies *${user}*, but *${command}* isn't supported.`,
      (user: string, command: string) => `Sorry, *${user}*. I can't handle *${command}* just yet.`,
      (user: string, command: string) => `Oops! *${command}* is not something I can do, *${user}*.`,
      (user: string, command: string) => `Unfortunately, *${command}* is beyond me, *${user}*.`,
      (user: string, command: string) => `Hey *${user}*! Regrettably, I'm unable to process *${command}*.`
    ],
    wait: [
      (user: string, command: string) => `I'll wait for your part *${user}* so we can carry on with *${command}*!`,
      (user: string, command: string) => `Ready when you've finished your input for *${command}*, *${user}*!`,
      (user: string, command: string) => `Over to you *${user}* then we can proceed with *${command}*!`,
      (user: string, command: string) => `Once your part for *${command}* is ready, please let me know *${user}*!`,
      (user: string, command: string) => `Alrighty *${user}*, just waiting for you to finish up on *${command}*!`
    ]
  };

  BOT_IN_PROGRESS_MESSAGES = {
    default: [
      "Hold tight while I process your request...",
      "Just a moment, please...",
      "Hang tight, I'm on it...",
      "Give me a second, I'm working on it...",
      "Almost there, just a bit more time..."
    ],
    short: [
      "Processing your request...",
      "Just a moment...",
      "Working on it...",
      "Hang tight...",
      "Give me a second..."
    ],
    long: [
      "This might take a few moments, please hold tight. I'll keep you posted.",
      "Processing... this will take a little while. I'll keep you posted on the progress.",
      "Working on it – this could take a minute or two. I'll keep you updated.",
      "Hang tight, this process will take some time. I'll let you know once it completes.",
      "Thank you for your patience, it will be worth the wait. I'll let you know when it's done."
    ]
  };

  BOT_CONFIRMATION_MESSAGES = {
    default: ["y", "yes", "ofcourse", "proceed"]
  };

  BOT_SUCCESS_MESSAGES = {
    default: [
      "Great! It's done.",
      "Sweet! All good.",
      "Perfect! Mission accomplished.",
      "Awesome! You're all set.",
      "Excellent! Done and dusted."
    ]
  };

  BOT_FAILURE_MESSAGES = {
    default: [
      "Whoops! Something went wrong.",
      "Hmm, that didn't work out.",
      "Darn! There was an issue.",
      "Sorry, an error occurred.",
      "Blast! We hit a snag."
    ]
  };

  constructor(env: Parameters["env"]) {
    this.botToken = env.TELEGRAM_BOT_KEY;
    this.botURL = `${this.baseURL}/bot${this.botToken}`;
    this.chatID = env.TELEGRAM_CHAT_ID;
    this.promptManual = Object.entries(this.BOT_COMMANDS)
      .map(([command, description]) => `*${capitalCase(command)}*:\n  ▸ ${description}`)
      .join("\n\n");
    this.promptKeyboard = Object.keys(this.BOT_COMMANDS)
      .map(command => ([ { text: capitalCase(command), callback_data: command } ]));
  }

  private getRandomMessageFrom({ messages }: { messages: string[] }) {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  async getMe() {
    const path = `${this.botURL}/${this.getMe.name}`;
    return await axios.get(path);
  }

  async getChatMember({ userId }: { userId: number }) {
    const path = `${this.botURL}/${this.getChatMember.name}?chat_id=${this.chatID}&user_id=${userId}`;
    return await axios.get(path);
  }

  async sendMessage({ message, options = {} }: { message: string, options?: Record<string, any> }) {
    const path = `${this.botURL}/${this.sendMessage.name}`;
    return await axios.post(path, {
      chat_id: this.chatID, text: message, parse_mode: "Markdown", ...options
    });
  }

  async setWebhook({ url }: { url: string }) {
    const path = `${this.botURL}/${this.setWebhook.name}`;
    return await axios.post(path, {
      url
    });
  }

  async answerCallbackQuery({ callback }: { callback: TelegramCallbackQuery }) {
    const path = `${this.botURL}/${this.answerCallbackQuery.name}`;
    return await axios.post(path, {
      callback_query_id: callback.id, show_alert: false
    });
  }

  async fetchBotName() {
    if (!this.botName) {
      const response = await this.getMe();
      const botName = response?.data?.result?.username;
      this.botName = botName;
    }
    return this.botName;
  }

  async fetchBotId() {
    if (!this.botID) {
      const response = await this.getMe();
      const botID = response?.data?.result?.id;
      this.botID = botID;
    }
    return this.botID;
  }

  async showPrompt() {
    const options = { reply_markup: { inline_keyboard: [...this.promptKeyboard] } };
    const message = `
Hi! I can help you with the following:

${this.promptManual}

Tap on the command you need help with so I can assist you with it.`;
    await this.sendMessage({ message, options });
  }

  async sendInProgressMessage(options?: SendMessageOptions) {
    const messages = this.BOT_IN_PROGRESS_MESSAGES[options?.variant] ?? this.BOT_IN_PROGRESS_MESSAGES.default;
    const message = this.getRandomMessageFrom({ messages });
    await this.sendMessage({ message });
  }

  async sendInLongProgressMessage() {
    await this.sendInProgressMessage({ variant: "long" });
  }

  async sendSuccessMessage(options?: SendMessageOptions) {
    const messages = this.BOT_SUCCESS_MESSAGES[options?.variant] ?? this.BOT_SUCCESS_MESSAGES.default;
    const message = this.getRandomMessageFrom({ messages });
    await this.sendMessage({ message });
  }

  async sendFailureMessage(options?: SendMessageOptions) {
    const messages = this.BOT_FAILURE_MESSAGES[options?.variant] ?? this.BOT_FAILURE_MESSAGES.default;
    const text = this.getRandomMessageFrom({ messages });
    const message = options?.notifyOnFailureLink ? `[${text}](${options?.notifyOnFailureLink})` : text;
    await this.sendMessage({ message });
  }

  async sendCommandAcknowledgedMessage(options: { update: TelegramUpdate, command: string } & SendMessageOptions) {
    const { update, command } = options;
    const { name } = this.getUserInfoFrom({ update });
    const functions = this.BOT_ACKNOWLEDGE_MESSAGES[options?.variant] ?? this.BOT_ACKNOWLEDGE_MESSAGES.default;
    const messages = functions.map(message => message(name, capitalCase(command)));
    const message = this.getRandomMessageFrom({ messages });
    await this.sendMessage({ message });
  }

  async sendCommandRejectedMessage({ update, command }: { update: TelegramUpdate, command: string }) {
    await this.sendCommandAcknowledgedMessage({ update, command, variant: "reject" });
  }

  async sendCommandParkedMessage({ update, command }: { update: TelegramUpdate, command: string }) {
    await this.sendCommandAcknowledgedMessage({ update, command, variant: "wait" });
  }

  async isBotMentioned({ message }: { message: TelegramMessage }) {
    const botName = await this.fetchBotName();
    return message.entities?.some((e) => e.type === "mention" && message.text.includes(`@${botName}`));
  }

  async isBotReply({ message }: { message: TelegramMessage }) {
    const botName = await this.fetchBotName();
    const username = message.reply_to_message?.from?.username ?? "";
    return username === botName;
  }

  async isFromGroupAdmin({ update }: { update: TelegramUpdate }) {
    const { userId } = this.getUserInfoFrom({ update });
    if (userId) {
      const response = await this.getChatMember({ userId });
      return ["administrator", "creator"].includes(response?.data?.result?.status);
    } else {
      return false;
    }
  }

  getCommandReplyFrom({ message }: { message: TelegramMessage }) {
    const isReplyToCommand = () => Object.values(this.BOT_COMMANDS_WITH_REPLIES)
      .find(command => message?.reply_to_message?.text === command);
    const command = Object.entries(this.BOT_COMMANDS_WITH_REPLIES)
      .find(([, value]) => value === isReplyToCommand())?.[0];
    const parameters = message?.text;
    return { command, parameters };
  }

  isMessage({ update }: { update: TelegramUpdate }) {
    return update.message && update.message?.text;
  }

  isPromptResponse({ update }: { update: TelegramUpdate }) {
    return update.callback_query?.data && update.callback_query?.message;
  }

  shouldProcess({ update }: { update: TelegramUpdate }) {
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    const isAllowedChannel = chatId === +this.chatID;
    const isAllowedUpdateType = this.isMessage({ update }) || this.isPromptResponse({ update });
    return isAllowedChannel && isAllowedUpdateType;
  }

  getUserInfoFrom({ update }: { update: TelegramUpdate }) {
    const userId = update.message?.from?.id ?? update.callback_query?.from?.id;
    const userName = update.message?.from?.username ?? update.callback_query?.from?.username;
    const firstName = update.message?.from?.first_name ?? update.callback_query?.from?.first_name;
    const name = firstName || userName;
    return { userId, name };
  }

  getCommandFrom({ callback }: { callback: TelegramCallbackQuery }) {
    return Object.keys(this.BOT_COMMANDS).find(command => callback.data === command);
  }

  getCommandKey({ command }: { command: string }) {
    return Object.entries(this.BOT_COMMANDS).find(([, value]) => value === command)[0];
  }
}
