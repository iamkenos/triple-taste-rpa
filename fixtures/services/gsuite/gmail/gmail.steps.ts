import fs from "fs";
import path from "path";

import { string } from "@iamkenos/kyoko/common";
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
const CREW_EMAIL_DC_AMOUNT_TOKEN = "[[DC_AMOUNT]]";
const CREW_EMAIL_TOTAL_AMOUNT_TOKEN = "[[TOTAL_AMOUNT]]";

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
    .replaceAll(CREW_EMAIL_DC_AMOUNT_TOKEN, `${dailySales.discounts}`)
    .replaceAll(CREW_EMAIL_TOTAL_AMOUNT_TOKEN, `${dailySales.grandTotal}`)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: CREW_EMAIL_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (fortnightly) pay advise emails$/, async function (this: This, freq: string) {
  const { date, formatted } = getDate({ format: FORMATS.DDMMMYY });
  const payslipsInfo = await this.gsheets.getPayslipsInfo(date);
  const shouldSendEmail = payslipsInfo.length > 0;
  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const staffPayable: { staffName: string, staffId: string, grossPay: string, account: string, payCycleId: string }[] = [];
  const HEADER_TOKEN = "[[HEADER]]";
  const FOOTER_TOKEN = "[[FOOTER]]";
  const JOB_INFO_STAFF_ID_TOKEN = "[[STAFF_ID]]";
  const JOB_INFO_POSITION_TOKEN = "[[POSITION]]";
  const JOB_INFO_DAILY_RATE_TOKEN = "[[DAILY_RATE]]";
  const RCP_STAFF_NAME_TOKEN = "[[STAFF_NAME]]";
  const RCP_EMAIL_TOKEN = "[[EMAIL]]";
  const RCP_ADDRESS_TOKEN = "[[ADDRESS]]";
  const RCP_ACCOUNT_TOKEN = "[[ACCOUNT]]";
  const PAY_CYC_FREQ_TOKEN = "[[FREQ]]";
  const PAY_CYC_ID_TOKEN = "[[ID]]";
  const PAY_CYC_PERIOD_TOKEN = "[[PERIOD]]";
  const PAY_CYC_RETRO_ADJ_TOKEN = "[[RETRO_ADJ]]";
  const WK_HRS_BASE_HOURS_TOKEN = "[[BASE_HOURS]]";
  const WK_HRS_OVERTIME_HOURS_TOKEN = "[[OVERTIME_HOURS]]";
  const WK_HRS_NIGHT_HOURS_TOKEN = "[[NIGHT_HOURS]]";
  const WK_HRS_TOTAL_HOURS_TOKEN = "[[TOTAL_HOURS]]";
  const EAR_YTD_TOKEN = "[[YTD]]";
  const EAR_BASE_PAY_TOKEN = "[[BASE_PAY]]";
  const EAR_OVERTIME_PAY_TOKEN = "[[OVERTIME_PAY]]";
  const EAR_NIGHT_PAY_TOKEN = "[[NIGHT_PAY]]";
  const EAR_TNT_MONT_PAY_TOKEN = "[[TNT_MONT_PAY]]";
  const EAR_HOLIDAY_PAY_TOKEN = "[[HOLIDAY_PAY]]";
  const EAR_OTHER_ADJ_TOKEN = "[[OTHER_ADJ]]";
  const EAR_GROSS_PAY_TOKEN = "[[GROSS_PAY]]";
  const TBL_DATA = `<td colspan="5">[[TBL_DATA]]</td>`;

  const crewEmailDir = path.join(world.config.baseDir, CREW_EMAIL_TEMPLATE_PATH, freq);
  const header = fs.readFileSync(path.join(crewEmailDir, "header.html"), "utf8");
  const footer = fs.readFileSync(path.join(crewEmailDir, "footer.html"), "utf8");

  for (let i = 0; i < payslipsInfo.length; i++) {
    const payslipInfo = payslipsInfo[i];
    const {
      jobInfoSection, recipientSection, payCycleSection,
      workHoursSection, earningsSection, staffTimeSheet, fullTimeSheet
    } = payslipInfo;
    const staffId = jobInfoSection.staffId;
    const staffName = recipientSection.staffName;
    const account = recipientSection.account;
    const payCycleId = payCycleSection.number;
    const grossPay = earningsSection.grossPay;
    const to = recipientSection.emailAddress;

    staffPayable.push({ staffName, grossPay, account, payCycleId, staffId })
    const payBreakdownPdfTemplatePath = path.join(crewEmailDir, "pay-breakdown-pdf.html");
    const pdfBreakdownPdfTemplate = fs.readFileSync(payBreakdownPdfTemplatePath, "utf8");
    const pdfBreakdownPdf = pdfBreakdownPdfTemplate
      .replaceAll(HEADER_TOKEN, header)
      .replaceAll(FOOTER_TOKEN, footer)
      .replaceAll(JOB_INFO_STAFF_ID_TOKEN, staffId)
      .replaceAll(PAY_CYC_ID_TOKEN, payCycleSection.number)
      .replaceAll(WK_HRS_TOTAL_HOURS_TOKEN, workHoursSection.totalHours)
      .replaceAll(EAR_GROSS_PAY_TOKEN, grossPay)
      .replaceAll(TBL_DATA, fullTimeSheet);

    const payAdviceSubject = `${CREW_EMAIL_SUBJ_PREFIX} Pay Advice ${payCycleId} for ${staffId}`;
    const payAdviceEmailTemplatePath = path.join(crewEmailDir, "pay-advice.html");
    const payAdviceEmailTemplate = fs.readFileSync(payAdviceEmailTemplatePath, "utf8");
    const payAdviceEmail = payAdviceEmailTemplate
      .replaceAll(RCP_STAFF_NAME_TOKEN, staffName)
      .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
      .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);
    const payAdvicePdfTemplatePath = path.join(crewEmailDir, "pay-advice-pdf.html");
    const pdfAdvicePdfTemplate = fs.readFileSync(payAdvicePdfTemplatePath, "utf8");
    const pdfAdvisePdf = pdfAdvicePdfTemplate
      .replaceAll(HEADER_TOKEN, header)
      .replaceAll(FOOTER_TOKEN, footer)
      .replaceAll(JOB_INFO_STAFF_ID_TOKEN, staffId)
      .replaceAll(JOB_INFO_POSITION_TOKEN, jobInfoSection.position)
      .replaceAll(JOB_INFO_DAILY_RATE_TOKEN, jobInfoSection.dailyRate)
      .replaceAll(RCP_STAFF_NAME_TOKEN, staffName)
      .replaceAll(RCP_EMAIL_TOKEN, to)
      .replaceAll(RCP_ADDRESS_TOKEN, recipientSection.address)
      .replaceAll(RCP_ACCOUNT_TOKEN, account)
      .replaceAll(PAY_CYC_FREQ_TOKEN, payCycleSection.frequency)
      .replaceAll(PAY_CYC_ID_TOKEN, payCycleSection.number)
      .replaceAll(PAY_CYC_PERIOD_TOKEN, payCycleSection.period)
      .replaceAll(PAY_CYC_RETRO_ADJ_TOKEN, payCycleSection.retroAdjustments)
      .replaceAll(WK_HRS_BASE_HOURS_TOKEN, workHoursSection.baseHours)
      .replaceAll(WK_HRS_OVERTIME_HOURS_TOKEN, workHoursSection.overtimeHours)
      .replaceAll(WK_HRS_NIGHT_HOURS_TOKEN, workHoursSection.nightHours)
      .replaceAll(WK_HRS_TOTAL_HOURS_TOKEN, workHoursSection.totalHours)
      .replaceAll(EAR_YTD_TOKEN, earningsSection.ytd)
      .replaceAll(EAR_BASE_PAY_TOKEN, earningsSection.basePay)
      .replaceAll(EAR_OVERTIME_PAY_TOKEN, earningsSection.overtimePay)
      .replaceAll(EAR_NIGHT_PAY_TOKEN, earningsSection.nightPay)
      .replaceAll(EAR_TNT_MONT_PAY_TOKEN, earningsSection.tntMonthPay)
      .replaceAll(EAR_HOLIDAY_PAY_TOKEN, earningsSection.holidayPay)
      .replaceAll(EAR_OTHER_ADJ_TOKEN, earningsSection.otherAdjustments)
      .replaceAll(EAR_GROSS_PAY_TOKEN, grossPay)
      .replaceAll(TBL_DATA, staffTimeSheet);

    const payBreakdownFilename = `${string.changecase.kebabCase(`${payCycleId}-${staffId}-breakdown`)}.pdf`;
    const payBreakdownPdfPath = path.join(crewEmailDir, payBreakdownFilename);
    await this.gmail.createPDF(pdfBreakdownPdf, payBreakdownPdfPath, true);

    const payAdviceFilename = `${string.changecase.kebabCase(`${payCycleId}-${staffId}`)}.pdf`;
    const payAdvicePdfPath = path.join(crewEmailDir, payAdviceFilename);
    await this.gmail.createPDF(pdfAdvisePdf, payAdvicePdfPath);

    const pdfs = [
      { filename: payBreakdownFilename, filepath: payBreakdownPdfPath },
      { filename: payAdviceFilename, filepath: payAdvicePdfPath  },
    ];
    const payAdviceAttachments = [{ filename: payAdviceFilename, path: payAdvicePdfPath, contentType: "application/pdf" }]
    try {
      await this.gdrive.uploadPdfsToStaffDrive(recipientSection.driveId, pdfs);
      await this.gmail.sendEmail({ to, cc: undefined, subject: payAdviceSubject, html: payAdviceEmail, attachments: payAdviceAttachments });
    } finally {
      pdfs.forEach(i => fs.rmSync(i.filepath));
    }
  }

  const payCycleId = payslipsInfo[0].payCycleSection.number;
  const payReminderSubject = `${CREW_EMAIL_SUBJ_PREFIX} Pay Reminder for ${payCycleId}`;
  const payReminderEmailTemplatePath = path.join(crewEmailDir, "pay-reminder.html");
  const payReminderEmailTemplate = fs.readFileSync(payReminderEmailTemplatePath, "utf8");
  const payReminderData = staffPayable
    .map(i => `<table><colgroup><col class="col-header" /><col /></colgroup>${Object.keys(i)
    .map(k => `<tr><th>${string.changecase.capitalCase(k)}:</th><td>${i[k]}</td></tr>`).join("")}</table>`)
    .join("");

  const payAdviceEmail = payReminderEmailTemplate
    .replaceAll(TBL_DATA, payReminderData)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, cc: undefined, subject: payReminderSubject, html: payAdviceEmail });
  for (let i = 0; i < staffPayable.length; i++) {
    const { grossPay, payCycleId, staffId } = staffPayable[i];
    await this.gsheets.updateRevenueAndExpensesSheetDataForExpenses([formatted, "Salary Internal", +grossPay, `${payCycleId} - ${staffId}`]);
  }
});
