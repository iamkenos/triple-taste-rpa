import "dotenv/config";
import { DateTime, DateTimeUnit } from "luxon";
import { Before, DataTable, Given, Status } from "@cucumber/cucumber";
import { World } from "@iamkenos/kyoko/core";
import {
  createDate,
  Day,
  differenceInDays,
  Month,
  Unit
} from "~/fixtures/utils/date.utils";


import type { StaffPayAdviseFile, StaffPayReminderInfo } from "~/fixtures/services/gsuite/gmail/gmail.types";
import type {
  DailySales,
  DailySalesInvoiceData,
  StaffPayOutInfo
} from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export interface Parameters {
  env: {
    /** the shakey's franchise online system url */
    SFOS_URL: string;
    /** the shakey's franchise online system user email */
    SFOS_USER: string;
    /** the shakey's franchise online system user password */
    SFOS_PKEY: string;

    /** the gsuite service account client email */
    GSUITE_USER: string;
    /** the gsuite service account private key */
    GSUITE_PKEY: string;

    /** the gdrive resource id of financials > receipts folder */
    GDRIVE_FI_RECEIPTS_ID: string;

    /** the gsheets resource id financials > revenue and expenses tracker file */
    GSHEETS_FI_REV_X_EXP_TRACKER_ID: string;
    /** the gsheets resource id sales and inventory > daily sales tracker file — replaced annually */
    GSHEETS_SI_SALES_TRACKER_ID: string;
    /** the gsheets resource id hr > payout tracker file — replaced annually */
    GSHEETS_HR_PAYOUT_TRACKER_ID: string;

    /** the gmail service account user email */
    GMAIL_USER: string;
    /** the gmail service account app password */
    GMAIL_PKEY: string;

    /** the generic email service sender contact number */
    SENDER_EMAIL_CONTACT_NO: string;

    /** the accounting email service recipient name */
    ACCTG_EMAIL_ADDRESSEE: string;
    /** the accounting email service main recipient(s) — comma separated */
    ACCTG_EMAIL_RECIPIENTS: string;
    /** the accounting email service cc recipient(s) — comma separated */
    ACCTG_EMAIL_RECIPIENTS_CC: string;

    /** the staff email service main recipient(s) — comma separated */
    STAFF_EMAIL_RECIPIENTS: string;
    /** the staff email service cc recipient(s) — comma separated */
    STAFF_EMAIL_RECIPIENTS_CC: string;
  };
  sfos: {
    /** an array of downloaded invoices from SFOS ready to be uploaded to the drive */
    toUpload: { filename: string; date: DateTime }[];
    /** an array of new invoices from SFOS ready to be downloaded */
    toDownload: { index: number; id: string; date: string }[];
  };
  gdrive: {
    financials: {
      receipts: {
        /** an array of filenames of all SFOS invoices uploaded in the drive */
        sfos: string[];
      };
    };
  };
  gmail: {
    staff: {
      advices: {
        payReminderInfo: StaffPayReminderInfo;
        payAdvisePdf: StaffPayAdviseFile;
        timesheetPdf: StaffPayAdviseFile;
        date: DateTime;
      }[]
    }
  }
  gsheets: {
    sales: {
      daily: {
        /** the daily sales figures for the previous working day */
        figures: DailySales,
        /** the invoice data based on figures for the previous working day */
        invoice: DailySalesInvoiceData,
      };
    };
    hr: {
      payout: StaffPayOutInfo[];
    };
  };
}

export interface This extends World<Parameters> {}

Before({}, async function(this: This) {
  this.parameters.env = process.env as any;
  this.parameters.sfos = { toUpload: [], toDownload: [] };
  this.parameters.gdrive = { financials: { receipts: { sfos: [] } } };
  this.parameters.gsheets = { sales: { daily: { } as any }, hr: { payout: [] } };
  this.parameters.gmail = { staff: { advices: [] } };
});

Given("it's a weekday", async function(this: This) {
  const { date } = createDate();
  const isNotWeekday = ![1, 2, 3, 4, 5].includes(date.weekday);
  if (isNotWeekday) return Status.SKIPPED.toLowerCase();
});

Given("it's a {word}", async function(this: This, day: keyof typeof Day) {
  const { date } = createDate();
  const match = Object.entries(Day).find(([key]) => key.startsWith(day.toUpperCase()));
  const isNotSameDay = date.weekday !== match[1];
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

Given("it's the {ordinal} of the month", async function(this: This, day: number) {
  const { date } = createDate();
  const isNotSameDay = date.day !== day;
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

Given("it's {int} day/days before the end of {word}", async function(this: This, offset: number, unit: DateTimeUnit | keyof typeof Month) {
  const { date } = createDate();
  const referenceDate = Object.keys(Month).includes(unit.toUpperCase())
    ? date.set({ month: Month[unit.toUpperCase()] }).endOf(Unit.MONTH)
    : date.endOf(unit as DateTimeUnit);
  const difference = differenceInDays(referenceDate, date);
  const isNotSameDay = difference !== offset;
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

Given("it's {int} day/days before the {ordinal} of {word}", async function(this: This, offset: number, day: number, month: keyof typeof Month) {
  const { date } = createDate();
  const referenceDate = date.set({ month: Month[month.toUpperCase()], day });
  const difference = differenceInDays(referenceDate, date);
  const isNotSameDay = difference !== offset;
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

Given("it's {int} day/days before the {ordinal} of:", async function(this: This, offset: number, day: number, months: DataTable) {
  const { date } = createDate();
  const range = months.raw().flat().map((v) => v.toLowerCase());
  const isNotSameDay = range.every((v) => {
    const referenceDate = date.set({ month: Month[v.toUpperCase()], day });
    const difference = differenceInDays(referenceDate, date);
    return difference !== offset;
  });
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});

Given("it's {int} day/days before the end of:", async function(this: This, offset: number, months: DataTable) {
  const { date } = createDate();
  const range = months.raw().flat().map((v) => v.toLowerCase());
  const isNotSameDay = range.every((v) => {
    const referenceDate = date.set({ month: Month[v.toUpperCase()] }).endOf(Unit.MONTH);
    const difference = differenceInDays(referenceDate, date);
    return difference !== offset;
  });
  if (isNotSameDay) return Status.SKIPPED.toLowerCase();
});
