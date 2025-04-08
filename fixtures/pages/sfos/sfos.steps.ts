import { Before, Given, Status, When } from "@cucumber/cucumber";
import { SFOSPage } from "./sfos.page";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  sfos: SFOSPage;
}

Before({}, async function(this: This) {
  this.sfos = new SFOSPage();
});

Given("the service account logs in to SFOS", async function(this: This) {
  await this.sfos.login();
});

When("the service account displays all SFOS entries", async function(this: This) {
  await this.sfos.showAllEntries();
});

When("the service account finds new SFOS invoices that hasn't been uploaded to the drive", async function(this: This) {
  this.parameters.sfos.toDownload = await this.sfos.findNewInvoices();

  const hasNewInvoices = this.parameters.sfos.toDownload.length > 0;
  if (!hasNewInvoices) return Status.SKIPPED.toLowerCase();
});

When("the service account downloads the new SFOS invoices", async function(this: This) {
  this.parameters.sfos.toUpload = await this.sfos.downloadNewInvoices();
});
