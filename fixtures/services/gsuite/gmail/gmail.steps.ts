import fs from "fs";
import path from "path";

import { Before, When, Status, world } from "@cucumber/cucumber";
import { FORMATS, MONTHS, getDate, formatOrdinal } from "~/fixtures/utils/date";
import { GDriveService } from "~/fixtures/services/gsuite/gdrive/gdrive.service";
import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { GMailService } from "./gmail.service";

import type { This as BaseThis } from "~/fixtures/pages/base.steps";

const ACCTG_EMAIL_TEMPLATE_PATH = "resources/email-templates/accounting";
const ACCTG_EMAIL_DATE_DELIMITER = "_";
const ACCTG_EMAIL_SUBJ_PREFIX = "[TripleTaste]";
const ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN = "[[ADDRESSEE]]";
const ACCTG_EMAIL_SCOPE_DATE_TOKEN = "[[SCOPE_DATE]]";
const ACCTG_EMAIL_MONTH_YEAR_TOKEN = "[[MONTH_YEAR]]";
const ACCTG_EMAIL_YEAR_MONTH_TOKEN = "[[YEAR_MONTH]]";
const ACCTG_EMAIL_YEAR_MONTH_DAY_TOKEN = "[[YEAR_MONTH_DAY]]";
const ACCTG_EMAIL_FOLDER_ID_TOKEN = "[[FOLDER_ID]]";
const ACCTG_EMAIL_FOLDER_NAME_TOKEN = "[[FOLDER_NAME]]";
const ACCTG_EMAIL_BKK_VIEW_LINK = "[[EXPENSES_FILE_VIEW_LINK]]";
const ACCTG_EMAIL_BKK_VIEW_NAME = "[[EXPENSES_FILE_VIEW_NAME]]";
const ACCTG_EMAIL_ORDINAL_TOKEN = "[[NTH]]";
const ACCTG_EMAIL_SIG_SENDER_TOKEN = "[[SENDER_EMAIL]]";
const ACCTG_EMAIL_SIG_CONTACT_TOKEN = "[[SENDER_CONTACT]]";

const CREW_EMAIL_TEMPLATE_PATH = "resources/email-templates/crew";
const CREW_EMAIL_SUBJ_PREFIX = ACCTG_EMAIL_SUBJ_PREFIX;
const CREW_EMAIL_SCOPE_DATE_TOKEN = ACCTG_EMAIL_SCOPE_DATE_TOKEN;
const CREW_EMAIL_QTY_TOKEN = "[[QTY]]";
const CREW_EMAIL_AMOUNT_TOKEN = "[[AMOUNT]]";

const {
  GMAIL_USER,
  ACCTG_EMAIL_REMINDER_ADDRESSEE,
  ACCTG_EMAIL_REMINDER_RECIPIENTS,
  ACCTG_EMAIL_REMINDER_RECIPIENTS_CC,
  ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO,
  CREW_EMAIL_RECIPIENTS,
} = process.env;

export interface This extends BaseThis {
  gdrive: GDriveService;
  gmail: GMailService;
  gsheets: GSheetsService;
}

Before({}, async function (this: This) {
  this.gdrive = new GDriveService();
  this.gmail = new GMailService();
  this.gsheets = new GSheetsService();
});

When(/^I send the (monthly) expanded witholding tax reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const filingMonths = [
    MONTHS.FEB, MONTHS.MAR,
    MONTHS.MAY, MONTHS.JUN,
    MONTHS.AUG, MONTHS.SEP,
    MONTHS.NOV, MONTHS.DEC,
  ];

  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  if (!shouldFileThisMonth) {
    return Status.SKIPPED.toLowerCase();
  }

  const filingDeadlineDay = 10;
  const emailDay = filingDeadlineDay - 5;
  const shouldSendEmail = date.day === emailDay;
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "ewt-mtl-0619E.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date, offset: { months: -1 }, format: FORMATS.MONTH_YEAR });
  const scopeDatePrefix = getDate({ date, offset: { months: -1 }, format: FORMATS.YEAR_MONTH }).formatted;
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 01619E Monthly Expanded Witholding Tax: ${submissionDate.formatted} Filing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_YEAR_MONTH_TOKEN, scopeDatePrefix)
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (monthly) staffing agency 2307 request email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const emailDay = 27;
  const shouldSendEmail = date.day === emailDay;

  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const billingInvoicesThisMonth = await this.gdrive.getStaffingBillingInvoicesForMonthOf(date);
  const areAllInvoicesUploaded = billingInvoicesThisMonth.length == 2;
  const nth = billingInvoicesThisMonth.map((_, index) => formatOrdinal(index + 1)).join(" & ");
  await this.page.expect()
    .setName(`Staffing billing invoice should be uploaded in the drive.`)
    .equals(areAllInvoicesUploaded, true).poll();

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "sfa-mtl-2307.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const scopeDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 2307 Form Request for Staffing Agency: ${scopeDate.formatted} ${nth} Billing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_ORDINAL_TOKEN, nth)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_YEAR_MONTH_TOKEN, billingInvoicesThisMonth[0].split(ACCTG_EMAIL_DATE_DELIMITER)[0].slice(0, 6))
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

    await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (monthly) bookkeeping reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const emailDay = 3;
  const shouldSendEmail = date.day === emailDay;

  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "bkk-mtl-expenses.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const scopeDate = getDate({ date, offset: { months: -1 }, format: FORMATS.MONTH_YEAR });
  const scopeDatePrefix = getDate({ date, offset: { months: -1 }, format: FORMATS.YEAR_MONTH }).formatted;
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)

  const expensesFile = await this.gsheets.createRevenueAndExpensesFilterByMonthForExpenses(scopeDate.date);
  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} Bookkeeping Expenses: ${scopeDate.formatted}`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_YEAR_MONTH_TOKEN, scopeDatePrefix)
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_BKK_VIEW_LINK, expensesFile.link)
    .replaceAll(ACCTG_EMAIL_BKK_VIEW_NAME, expensesFile.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (quarterly) expanded witholding tax reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const filingMonths = [
    MONTHS.JAN,
    MONTHS.APR,
    MONTHS.JUL,
    MONTHS.OCT,
  ];

  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  if (!shouldFileThisMonth) {
    return Status.SKIPPED.toLowerCase();
  }

  const filingDeadlineDay = 25;
  const emailDay = filingDeadlineDay - 10;
  const shouldSendEmail = date.day === emailDay;
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const { GMAIL_USER, ACCTG_EMAIL_REMINDER_RECIPIENTS, ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO } = process.env;
  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "ewt-qtl-1601EQ.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date: date.plus({ quarter: -1 }).endOf("quarter"), format: FORMATS.MONTH_YEAR });
  const firstMonthOfQ = scopeDate.date.plus({ months: -2 });
  const secondMonthOfQ = scopeDate.date.plus({ months: -1 });
  const thirdMonthOfQ = scopeDate.date;
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 1601EQ Quarterly Expanded Witholding Tax: ${submissionDate.formatted} Filing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(`${ACCTG_EMAIL_MONTH_YEAR_TOKEN}[1]`, firstMonthOfQ.toFormat(FORMATS.MONTH_YEAR))
    .replaceAll(`${ACCTG_EMAIL_MONTH_YEAR_TOKEN}[2]`, secondMonthOfQ.toFormat(FORMATS.MONTH_YEAR))
    .replaceAll(`${ACCTG_EMAIL_MONTH_YEAR_TOKEN}[3]`, thirdMonthOfQ.toFormat(FORMATS.MONTH_YEAR))
    .replaceAll(`${ACCTG_EMAIL_YEAR_MONTH_TOKEN}[1]`, firstMonthOfQ.toFormat(FORMATS.YEAR_MONTH))
    .replaceAll(`${ACCTG_EMAIL_YEAR_MONTH_TOKEN}[2]`, secondMonthOfQ.toFormat(FORMATS.YEAR_MONTH))
    .replaceAll(`${ACCTG_EMAIL_YEAR_MONTH_TOKEN}[3]`, thirdMonthOfQ.toFormat(FORMATS.YEAR_MONTH))
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (quarterly) income tax reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const filingMonths = [
    MONTHS.FEB,
    MONTHS.MAY,
    MONTHS.AUG,
    MONTHS.NOV,
  ];

  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  if (!shouldFileThisMonth) {
    return Status.SKIPPED.toLowerCase();
  }

  const filingDeadlineDay = 15;
  const emailDay = filingDeadlineDay - 10;
  const shouldSendEmail = date.day === emailDay;
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "itr-qtl-1701Q.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date: date.plus({ quarter: -1 }).endOf("quarter"), format: FORMATS.MONTH_YEAR });
  const firstMonthOfQ = scopeDate.date.plus({ months: -2 });
  const secondMonthOfQ = scopeDate.date.plus({ months: -1 });
  const thirdMonthOfQ = scopeDate.date;
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 1701Q Quarterly Income Tax: ${submissionDate.formatted} Filing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(`${ACCTG_EMAIL_MONTH_YEAR_TOKEN}[1]`, firstMonthOfQ.toFormat(FORMATS.MONTH_YEAR))
    .replaceAll(`${ACCTG_EMAIL_MONTH_YEAR_TOKEN}[2]`, secondMonthOfQ.toFormat(FORMATS.MONTH_YEAR))
    .replaceAll(`${ACCTG_EMAIL_MONTH_YEAR_TOKEN}[3]`, thirdMonthOfQ.toFormat(FORMATS.MONTH_YEAR))
    .replaceAll(`${ACCTG_EMAIL_YEAR_MONTH_TOKEN}[1]`, firstMonthOfQ.toFormat(FORMATS.YEAR_MONTH))
    .replaceAll(`${ACCTG_EMAIL_YEAR_MONTH_TOKEN}[2]`, secondMonthOfQ.toFormat(FORMATS.YEAR_MONTH))
    .replaceAll(`${ACCTG_EMAIL_YEAR_MONTH_TOKEN}[3]`, thirdMonthOfQ.toFormat(FORMATS.YEAR_MONTH))
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (quarterly) percentage tax reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const filingMonths = [
    MONTHS.JAN,
    MONTHS.APR,
    MONTHS.JUL,
    MONTHS.OCT,
  ];

  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  if (!shouldFileThisMonth) {
    return Status.SKIPPED.toLowerCase();
  }

  const filingDeadlineDay = date.endOf("month").day;
  const emailDay = filingDeadlineDay - 10;
  const shouldSendEmail = date.day === emailDay;

  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "ptr-qtl-2551Q.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date: date.plus({ quarter: -1 }).endOf("quarter"), format: FORMATS.MONTH_YEAR });

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 2551Q Quarterly Percentage Tax: ${submissionDate.formatted} Filing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (yearly) expanded witholding tax reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const filingMonths = [MONTHS.MAR];
  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  if (!shouldFileThisMonth) {
    return Status.SKIPPED.toLowerCase();
  }

  const filingDeadlineDay = date.endOf("month").day;
  const emailDay = filingDeadlineDay - 20;
  const shouldSendEmail = date.day === emailDay;
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "ewt-anl-1604E.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date: date.plus({ year: -1 }).startOf("year"), format: FORMATS.YYYY });
  const q1folder = await this.gdrive.getQFolder(scopeDate.date)
  const q2folder = await this.gdrive.getQFolder(scopeDate.date.plus({ quarter: 1 }))
  const q3folder = await this.gdrive.getQFolder(scopeDate.date.plus({ quarter: 2 }))
  const q4folder = await this.gdrive.getQFolder(scopeDate.date.plus({ quarter: 3 }))

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 1604E Annual Expanded Witholding Tax: ${submissionDate.formatted} Filing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[1]`, q1folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[1]`, q1folder.name)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[2]`, q2folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[2]`, q2folder.name)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[3]`, q3folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[3]`, q3folder.name)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[4]`, q4folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[4]`, q4folder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (yearly) income tax reminder email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const filingMonths = [MONTHS.APR];
  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  if (!shouldFileThisMonth) {
    return Status.SKIPPED.toLowerCase();
  }

  const filingDeadlineDay = 15;
  const emailDay = filingDeadlineDay - 20;
  const shouldSendEmail = date.day === emailDay;
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "itr-anl-1701.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date: date.plus({ year: -1 }).startOf("year"), format: FORMATS.YYYY });
  const q1folder = await this.gdrive.getQFolder(scopeDate.date)
  const q2folder = await this.gdrive.getQFolder(scopeDate.date.plus({ quarter: 1 }))
  const q3folder = await this.gdrive.getQFolder(scopeDate.date.plus({ quarter: 2 }))
  const q4folder = await this.gdrive.getQFolder(scopeDate.date.plus({ quarter: 3 }))

  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 1701 Annual Income Tax: ${submissionDate.formatted} Filing`;
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_ADDRESSEE_TOKEN, ACCTG_EMAIL_REMINDER_ADDRESSEE)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[1]`, q1folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[1]`, q1folder.name)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[2]`, q2folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[2]`, q2folder.name)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[3]`, q3folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[3]`, q3folder.name)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_ID_TOKEN}[4]`, q4folder.id)
    .replaceAll(`${ACCTG_EMAIL_FOLDER_NAME_TOKEN}[4]`, q4folder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (daily) revenue amount email$/, async function (this: This, freq: string) {
  const { date } = getDate();

  const shouldSendEmail = [1, 2, 3, 4, 5].includes(date.weekday);
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const offset = date.weekday == 1 ? -3 : -1;
  const scopeDate = getDate({ date: date.plus({ day: offset }), format: FORMATS.MONTH_DAY_YEAR });
  const dailySales = await this.gsheets.getCohAndGCashDailySalesAmount(scopeDate.date);

  const templatePath = path.join(world.config.baseDir, CREW_EMAIL_TEMPLATE_PATH, freq, "revenue-dly-invoicing.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const subject = `${CREW_EMAIL_SUBJ_PREFIX} Daily Revenue Invoicing: ${scopeDate.formatted}`;
  const html = template
    .replaceAll(CREW_EMAIL_SCOPE_DATE_TOKEN, dailySales.date)
    .replaceAll(CREW_EMAIL_QTY_TOKEN, `${dailySales.bmCups}`)
    .replaceAll(CREW_EMAIL_AMOUNT_TOKEN, `${dailySales.bmTotal}`)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: CREW_EMAIL_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});
