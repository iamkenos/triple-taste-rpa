import { Before, When } from "@cucumber/cucumber";

import { TelegramSerice } from "./telegram.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  telegram: TelegramSerice;
}

Before({}, async function(this: This) {
  this.telegram = new TelegramSerice();
});

When("the service account sends an announcement:", async function(this: This, message: string) {
  await this.telegram.sendMessage({ message });
});

When("the service account sends the fortnightly shift rotation announcement", async function(this: This) {
  await this.telegram.sendShiftRotationMessage();
});

When("the service account fetches remaining inventory for the day from the ops channel", async function(this: This) {
  this.parameters.gsheets.inventory.remaining = await this.telegram.fetchInventoryDataForToday();
});
