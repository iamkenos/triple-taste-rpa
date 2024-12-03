import { Before, Given, Then } from "@cucumber/cucumber";
import { GDriveService } from "./gdrive.service";

import type { This as BaseThis } from "~/fixtures/pages/base.steps";

export interface This extends BaseThis {
  gdrive: GDriveService;
}

Before({}, async function (this: This) {
  this.gdrive = new GDriveService();
});

Given("I have the list of uploaded sfos invoices", async function (this: This) {
  this.parameters.driveUploadedSfosInvoices = await this.gdrive.getSFOSInvoices();
});

Then("I upload the downloaded sfos invoices to the drive", async function (this: This) {
  await this.gdrive.uploadDownloadedSFOSInvoices();
});
