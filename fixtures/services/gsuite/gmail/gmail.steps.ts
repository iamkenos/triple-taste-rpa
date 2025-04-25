import { Before, When } from "@cucumber/cucumber";
import { GDriveService } from "~/fixtures/services/gsuite/gdrive/gdrive.service";
import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { GMailService } from "./gmail.service";
import { AccountingMailService } from "./accounting/accounting-mail.service";
import { StaffMailService } from "./staff/staff-mail.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  accounting: AccountingMailService;
  staff: StaffMailService;
  gdrive: GDriveService;
  gmail: GMailService;
  gsheets: GSheetsService;
}

Before({}, async function(this: This) {
  this.accounting = new AccountingMailService();
  this.staff = new StaffMailService();
});

When("the service account sends the monthly expanded witholding tax reminder email", async function(this: This) {
  await this.accounting.sendMonthlyExpandedWitholdingTaxEmail();
});

When("the service account sends the monthly bookkeeping reminder email", async function(this: This) {
  await this.accounting.sendMonthlyBookkeepingEmail();
});

When("the service account sends the monthly staffing agency 2307 request email", async function(this: This) {
  await this.accounting.sendMonthlyAgency2307RequestEmail();
});

When("the service account sends the quarterly expanded witholding tax reminder email", async function(this: This) {
  await this.accounting.sendQuarterlyExpandedWitholdingTaxEmail();
});

When("the service account sends the quarterly income tax reminder email", async function(this: This) {
  await this.accounting.sendQuarterlyIncomeTaxEmail();
});

When("the service account sends the quarterly percentage tax reminder email", async function(this: This) {
  await this.accounting.sendQuarterlyPercentageTaxEmail();
});

When("the service account sends the yearly expanded witholding tax reminder email", async function(this: This) {
  await this.accounting.sendYearlyExpandedWitholdingTaxEmail();
});

When("the service account sends the yearly income tax reminder email", async function(this: This) {
  await this.accounting.sendYearlyIncomeTaxEmail();
});

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
