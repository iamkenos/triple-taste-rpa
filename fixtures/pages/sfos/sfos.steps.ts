import { Before, When, Status } from "@cucumber/cucumber";
import { SFOSPage } from "./sfos.page";

import type { This as BaseThis } from "~/fixtures/pages/base.steps";

export interface This extends BaseThis {
  sfos: SFOSPage;
}

Before({}, async function (this: This) {
  this.sfos = new SFOSPage();
});

When("I login to sfos", async function (this: This) {
  await this.sfos.login();
});

When("I download new sfos invoices", async function (this: This) {
  await this.sfos.showAllInvoices();
  await this.sfos.downloadNewInvoices();

  const hasNewInvoices = this.parameters.sfosNewInvoices.length > 0;
  if (!hasNewInvoices) {
    return Status.SKIPPED.toLowerCase();
  }
});
