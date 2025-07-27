import { When } from "@cucumber/cucumber";
import { createDate, createDateFromNearestWeekday, Day } from "~/fixtures/utils/date.utils";

import type { This as GSHeets } from "~/fixtures/services/gsuite/gsheets/gsheets.steps";

export interface This extends GSHeets {
}

When("the service account fetches the sales figures for the previous working day", async function(this: This) {
  const { date } = createDate();

  const days = date.weekday === 1 ? 3 : 1;
  const { date: scopeDate } = createDate({ from: date.minus({ days }) });
  this.parameters.gsheets.sales.daily.figures = await this.dailysales.fetchDailyFiguresFor(scopeDate);
});

When("the service account fetches the expected deposit amount for the day", async function(this: This) {
  const { date } = createDate();

  const shouldBeForTues = date.weekday <= Day.TUESDAY || date.weekday >= Day.SATURDAY;
  const nextDepositDay = shouldBeForTues ? Day.TUESDAY : Day.FRIDAY;
  const { date: scopeDate } = createDateFromNearestWeekday(nextDepositDay);

  this.parameters.gsheets.sales.deposit = await this.dailysales.fetchDepositAmountFor(scopeDate);
});

When("the service account computes the data to invoice", async function(this: This) {
  this.parameters.gsheets.sales.daily.invoice = await this.dailysales.computeDailyInvoiceData();
});
