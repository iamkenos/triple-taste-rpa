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

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Accountant", 2530, "Accountant Fees + Charges"])
});

When("I enter the monthly rent fees to the revenue and expenses sheet", async function (this: This) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });

  const updateDay = getDate().date.startOf("month").day;
  const shouldUpdate = date.day === updateDay;

  if (!shouldUpdate) {
    return Status.SKIPPED.toLowerCase();
  }

  await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Rental", 40550, `${date.toFormat(FORMATS.MONTH)} Rental`])
});
