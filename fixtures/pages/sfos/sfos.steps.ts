import { Before, When } from "@cucumber/cucumber";
import { SFOSPage } from "./sfos.page";

import type { This as BaseThis } from "../base.steps";

export interface This extends BaseThis {
  sfos: SFOSPage;
}

Before({}, async function (this: This) {
  this.sfos = new SFOSPage();
});

When("I download new sfos invoices", async function (this: This) {
  await this.sfos.login();
  await this.sfos.showAllInvoices();
  await this.sfos.downloadNewInvoices();
});
