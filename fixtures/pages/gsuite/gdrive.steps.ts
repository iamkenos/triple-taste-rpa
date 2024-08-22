import { Before, Given, Then } from "@cucumber/cucumber";
import { GDrivePage } from "./gdrive.page";

import type { This as BaseThis } from "../base.steps";

export interface This extends BaseThis {
  gdrive: GDrivePage;
}

Before({}, async function (this: This) {
  this.gdrive = new GDrivePage();
});

Given("I have a list of latest sfos invoices", async function (this: This) {
  this.parameters.driveSfosInvoices = await this.gdrive.getSFOSInvoices();
});

Then("I upload the downloaded files to the drive", async function (this: This) {
  await this.gdrive.uploadFiles();
});
