export type DailyRemainingInventory = {
  name: string;
  value: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramMessage = {
  message_id: number;
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  text?: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  entities?: TelegramEntity[];
  reply_to_message?: Omit<TelegramMessage, "reply_to_message">;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramMessage["from"];
  message: TelegramMessage;
  data: string;
};

export type TelegramEntity = {
  offset: number;
  length: number;
  type: string;
};
