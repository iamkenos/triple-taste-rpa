import { When } from "@cucumber/cucumber";

import type { This as GMail } from "~/fixtures/services/gsuite/gmail/gmail.steps";

export interface This extends GMail {
}

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
