import { Before, When, Status } from "@cucumber/cucumber";
import { FORMATS, getDate } from "~/fixtures/utils/date";
import { GSheetsService } from "./gsheets.service";

import type { This as BaseThis } from "~/fixtures/pages/base.steps";

export interface This extends BaseThis {
  gsheets: GSheetsService;
}

Before({}, async function (this: This) {
  this.gsheets = new GSheetsService();
});

When("I enter the monthly accountant fees to the revenue and expenses sheet", async function (this: This) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });

  const updateDay = 27;
  const shouldUpdate = date.day === updateDay;

  if (!shouldUpdate) {
    return Status.SKIPPED.toLowerCase();
  }

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Accountant", 2500, "Accountant Fees"]);
  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Service Fee", 30, `For Accountant Fees ${formatted}`]);
});

When("I enter the monthly rent fees to the revenue and expenses sheet", async function (this: This) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });

  const updateDay = getDate().date.startOf("month").day;
  const shouldUpdate = date.day === updateDay;

  if (!shouldUpdate) {
    return Status.SKIPPED.toLowerCase();
  }

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Rental", 40550, `${date.toFormat(FORMATS.MONTH)} Rental`]);
});

When("I enter the monthly storage fees to the revenue and expenses sheet", async function (this: This) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });

  const updateDay = 15;
  const shouldUpdate = date.day === updateDay;

  if (!shouldUpdate) {
    return Status.SKIPPED.toLowerCase();
  }

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Rental", 5000, `${date.toFormat(FORMATS.MONTH)} Storage Rent`]);
  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Service Fee", 30, `For Storage Rent ${formatted}`]);
});

When("I enter the weekly mobile data charges to the revenue and expenses sheet", async function (this: This) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });

  const shouldUpdate = date.weekday === 7;

  if (!shouldUpdate) {
    return Status.SKIPPED.toLowerCase();
  }

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Mobile Data", 99, `${date.toFormat(FORMATS.MONTH)} Ops Sim Load`]);
  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Service Fee", 2, `For Ops Sim Load ${formatted}`]);
});

When("I enter the weekly gcash transfer fees to the revenue and expenses sheet", async function (this: This) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });

  const shouldUpdate = date.weekday === 7;

  if (!shouldUpdate) {
    return Status.SKIPPED.toLowerCase();
  }

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Service Fee", 30, `For GCash Transfer ${formatted}`]);
});
