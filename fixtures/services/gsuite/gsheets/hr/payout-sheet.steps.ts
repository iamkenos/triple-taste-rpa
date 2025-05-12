import { Given, Status, When } from "@cucumber/cucumber";
import { createDate, differenceInDays } from "~/fixtures/utils/date.utils";

import type { This as GSHeets } from "~/fixtures/services/gsuite/gsheets/gsheets.steps";

export interface This extends GSHeets {
}

Given("it's {int} day/days before end of the pay cycle", async function(this: This, offset: number) {
  const { date } = createDate();
  const referenceDate = await this.payout.fetchPayCycleEndDate();
  const difference = differenceInDays(referenceDate, date);
  const isNotSameDay = difference !== offset;
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

Given("it's the end of the pay cycle", async function(this: This) {
  const { date } = createDate();
  const referenceDate = await this.payout.fetchPayCycleEndDate();
  const difference = differenceInDays(referenceDate, date);
  const isNotSameDay = difference !== 0;
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

When("the service account fetches the payout info for all staff", async function(this: This) {
  this.parameters.gsheets.hr.payout = await this.payout.fetchPayOutInfo();
});

When("the service account fetches the shift info for all staff", async function(this: This) {
  if (this.parameters.webhook) {
    this.parameters.gsheets.hr.payout = await this.payout.fetchPayOutInfo();
  } else {
    await this.payout.updateToNextPayCycle();
    this.parameters.gsheets.hr.payout = await this.payout.fetchPayOutInfo();
    await this.payout.revertToCurrentPayCycle();
  }
});
