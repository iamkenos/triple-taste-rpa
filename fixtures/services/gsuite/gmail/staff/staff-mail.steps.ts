import { When } from "@cucumber/cucumber";

import type { This as GMail } from "~/fixtures/services/gsuite/gmail/gmail.steps";

export interface This extends GMail {
}

When("the service account sends the daily invoicing email", async function(this: This) {
  await this.staff.sendDailyInvoicingEmail();
});

When("the service account collates the pay advice data", async function(this: This) {
  this.parameters.gmail.staff.advices = await this.staff.collatePayAdviceData();
});

When("the service account sends the fortnightly pay advice email", async function(this: This) {
  await this.staff.sendFortnightlyPayAdviceEmail();
});

When("the service account sends the fortnightly pay reminder email", async function(this: This) {
  await this.staff.sendFortnightlyPayReminderEmail();
});

When("the service account collates the shift rotation data", async function(this: This) {
  this.parameters.gmail.staff.rotation = await this.staff.collateShiftRotationData();
});

When("the service account sends the fortnightly shift rotation email", async function(this: This) {
  await this.staff.sendFortnightlyShiftRotationEmail();
});

