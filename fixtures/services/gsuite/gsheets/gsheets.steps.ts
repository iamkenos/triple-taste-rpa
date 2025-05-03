import { Before, DataTable, Given, Status, When } from "@cucumber/cucumber";
import { createDate, createDateFromNearestWeekday, Day, differenceInDays } from "~/fixtures/utils/date.utils";

import { RevenueAndExpensesSheetService } from "./financials/revenue-and-expenses-sheet.service";
import { PayoutSheetService } from "./hr/payout-sheet.service";
import { DailySalesSheetService } from "./sales/daily-sales-sheet.service";
import { InventoryManagementSheetService } from "./sales/inventory-management-sheet.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  revxexp: RevenueAndExpensesSheetService;
  payout: PayoutSheetService;
  dailysales: DailySalesSheetService;
  inventory: InventoryManagementSheetService;
}

Before({}, async function(this: This) {
  this.revxexp = new RevenueAndExpensesSheetService();
  this.payout = new PayoutSheetService();
  this.dailysales = new DailySalesSheetService();
  this.inventory = new InventoryManagementSheetService();
});

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

When("the service account fetches the next pay cycle shift info for all staff", async function(this: This) {
  await this.payout.updateToNextPayCycle();
  this.parameters.gsheets.hr.payout = await this.payout.fetchPayOutInfo();
  await this.payout.revertToCurrentPayCycle();
});

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
  this.parameters.gsheets.sales.daily.invoice = this.dailysales.computeDailyInvoiceData();

  const shouldIssueInvoice = this.parameters.gsheets.sales.daily.invoice.adjTotal > 0;
  if (!shouldIssueInvoice) return Status.SKIPPED.toLowerCase();
});

When("the service account creates a/an {input_string} with {input_string} expense record for each pay advise", async function(this: This, category: string, serviceFee: string) {
  const { advices } = this.parameters.gmail.staff;
  for (let i = 0; i < advices.length; i++) {
    const { payReminderInfo, date } = advices[i];
    const { grossPay, staffId, payCycleId } = payReminderInfo;
    const amount = this.revxexp.parseAmount(grossPay);
    const note = `${payCycleId} - ${staffId}`;
    await this.revxexp.createExpensesRecord({ date, category, amount, note });
    await this.revxexp.createExpensesRecord({ date, category: serviceFee, amount: 25, note });
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

When("the service account fetches the list of items from the inventory sheet", async function(this: This) {
  this.parameters.gsheets.inventory.items = await this.inventory.fetchListOfItems();
});

When("the service account updates the remaining items on the inventory sheet", async function(this: This) {
  const { date } = createDate();

  const days = date.weekday == 6 ? 2 : date.weekday == 7 ? 1 : 0;
  const { date: scopeDate } = createDate({ from: date.plus({ days }) });
  await this.inventory.updateRemainingInventoryFor(scopeDate);
});
