import { Before, Given, When } from "@cucumber/cucumber";

import { FinancialsDriveService } from "./financials/financials-drive.service";
import { HRDriveService } from "./hr/hr-drive.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  financials: FinancialsDriveService;
  hr: HRDriveService;
}

Before({}, async function(this: This) {
  this.financials = new FinancialsDriveService();
  this.hr = new HRDriveService();
});

Given("the service account fetches the list of SFOS invoices from the drive", async function(this: This) {
  this.parameters.gdrive.financials.receipts.sfos = await this.financials.fetchSFOSInvoices();
});

When("the service account uploads the new SFOS invoices to the drive", async function(this: This) {
  await this.financials.uploadNewSFOSInvoices();
});

When("the service account uploads the new pay advices to the drive", async function(this: This) {
  await this.hr.uploadNewPayAdvices();
});
