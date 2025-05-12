import { Given, When } from "@cucumber/cucumber";

import type { This as GDrive } from "~/fixtures/services/gsuite/gdrive/gdrive.steps";

export interface This extends GDrive {
}

Given("the service account fetches the list of SFOS invoices from the drive", async function(this: This) {
  this.parameters.gdrive.financials.receipts.sfos = await this.financials.fetchSFOSInvoices();
});

When("the service account uploads the new SFOS invoices to the drive", async function(this: This) {
  await this.financials.uploadNewSFOSInvoices();
});
