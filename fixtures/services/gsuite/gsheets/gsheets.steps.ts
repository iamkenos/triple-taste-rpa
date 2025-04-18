import { Before, DataTable, Given, Status, When } from "@cucumber/cucumber";
import { createDate, differenceInDays } from "~/fixtures/utils/date.utils";

import { RevenueAndExpensesSheetService } from "./financials/revenue-and-expenses-sheet.service";
import { PayoutSheetService } from "./hr/payout-sheet.service";
import { DailySalesSheetService } from "./sales/daily-sales-sheet.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  revxexp: RevenueAndExpensesSheetService;
  payout: PayoutSheetService;
  dailysales: DailySalesSheetService;
}

Before({}, async function(this: This) {
  this.revxexp = new RevenueAndExpensesSheetService();
  this.payout = new PayoutSheetService();
  this.dailysales = new DailySalesSheetService();
});

Given("it's {int} day/days before end of the pay cycle", async function(this: This, offset: number) {
  const { date } = createDate();
  const referenceDate = await this.payout.fetchPayCycleEndDate();
  const difference = differenceInDays(referenceDate, date);
  const isNotSameDay = difference !== offset;
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

When("the service account fetches the payout info for all staff", async function(this: This) {
  this.parameters.gsheets.hr.payout = await this.payout.fetchPayOutInfo();
});

When("the service account fetches the sales figures for the previous working day", async function(this: This) {
  const { date } = createDate();

  const days = date.weekday === 1 ? 3 : 1;
  const { date: scopeDate } = createDate({ from: date.minus({ days }) });
  this.parameters.gsheets.sales.daily.figures = await this.dailysales.fetchDailyFiguresFor(scopeDate);
});

When("the service account computes the data to invoice", async function(this: This) {
  this.parameters.gsheets.sales.daily.invoice = this.dailysales.computeDailyInvoiceData();

  const shouldIssueInvoice = this.parameters.gsheets.sales.daily.invoice.adjTotal > 0;
  if (!shouldIssueInvoice) return Status.SKIPPED.toLowerCase();
});

When("the service account creates a/an {input_string} expense record for each pay advise", async function(this: This, category: string) {
  const { advices } = this.parameters.gmail.staff;
  for (let i = 0; i < advices.length; i++) {
    const { payReminderInfo, date } = advices[i];
    const { grossPay, staffId, payCycleId } = payReminderInfo;
    const amount = this.revxexp.parseAmount(grossPay);
    const note = `${payCycleId} - ${staffId}`;
    await this.revxexp.createExpensesRecord({ date, category, amount, note });
  }
});

When("the service account creates expense records for:", async function(this: This, expenses: DataTable) {
  const { date } = createDate();
  const records = expenses.raw();
  for (let i = 0; i < records.length; i++) {
    const [category, expense, note = ""] = records[i];
    const amount = this.revxexp.parseAmount(expense);
    await this.revxexp.createExpensesRecord({ date, category, amount, note });
  }
});
