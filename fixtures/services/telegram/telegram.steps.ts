import { Before, When } from "@cucumber/cucumber";

import { TelegramService } from "./telegram.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  telegram: TelegramService;
}

Before({}, async function(this: This) {
  this.telegram = new TelegramService();
});

When("the service account sends the fortnightly shift rotation announcement on the ops channel", async function(this: This) {
  await this.telegram.sendShiftRotationMessage();
});

When("the service account sends the expected deposit amount on the ops channel", async function(this: This) {
  await this.telegram.sendExpectedDepositAmountMessage();
});

When("the service account sends the order confirmation on the ops channel", async function(this: This) {
  await this.telegram.sendOrderConfirmation();
});

When("the service account sends the inventory update confirmation on the ops channel", async function(this: This) {
  await this.telegram.sendInventoryUpdateConfirmation();
});
