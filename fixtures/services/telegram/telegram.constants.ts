export const API_URL = "https://api.telegram.org";

export const BOT_BASE_PATH = (key: string) => `/bot${key}`;

export const BOT_API_URL = (key: string) => `${API_URL}${BOT_BASE_PATH(key)}`;
export const BOT_API_SEND_MESSAGE_URL = (key: string) => `${BOT_API_URL(key)}/sendMessage`;
export const BOT_API_ANSWER_QUERY_URL = (key: string) => `${BOT_API_URL(key)}/answerCallbackQuery`;
export const BOT_API_SET_WEBHOOK_URL = (key: string) => `${BOT_API_URL(key)}/setWebhook`;
export const BOT_API_GET_CHAT_MEMBER_URL = (key: string, chatId: string, userId: any) => `${BOT_API_URL(key)}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
export const BOT_API_GET_ME_URL = (key: string) => `${BOT_API_URL(key)}/getMe`;

export const BOT_COMMANDS = {
  create_order: "Creates an order on the OOS.",
  fetch_deposit_amount: "Fetches the expected deposit amount for today.",
  fetch_shift_rotation: "Fetches the shift rotation for the next pay cycle.",
  update_inventory: "Updates the remaining inventory for today."
};

export const BOT_COMMANDS_WITH_REPLIES = {
  update_inventory: "Please reply to this message with the current remaining stock levels for today.",
  create_order: "Before we proceed, please make sure the inventory sheet is updated with accurate product quantities to order.\n\nHave you done your part?"
};

export const BOT_ACK_MESSAGES = {
  default: [
    (user: string, command: string) => `Got it, *${user}*! You selected *${command}*.`,
    (user: string, command: string) => `Acknowledged, *${user}*. *${command}* is now in progress.`,
    (user: string, command: string) => `Understood, *${user}*. You've chosen *${command}*.`,
    (user: string, command: string) => `Okay *${user}*! Executing *${command}*.`,
    (user: string, command: string) => `Roger that, *${user}*! You've selected *${command}*.`
  ]
};

export const BOT_WIP_MESSAGES = {
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

export const BOT_SUCCESS_MESSAGES = {
  default: [
    "Great! It's done.",
    "Sweet! All good.",
    "Perfect! Mission accomplished.",
    "Awesome! You're all set.",
    "Excellent! Done and dusted."
  ]
};

export const BOT_FAILURE_MESSAGES = {
  default: [
    "Whoops! Something went wrong.",
    "Hmm, that didn't work out.",
    "Darn! There was an issue.",
    "Sorry, an error occurred.",
    "Blast! We hit a snag."
  ]
};

export const BOT_PROMPT_YN = {
  YES: ["y", "yes", "ofcourse", "proceed"],
  NO: ["n", "no"]
};
