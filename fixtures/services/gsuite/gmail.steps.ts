import fs from "fs";
import path from "path";

import { Before, When, Status, world } from "@cucumber/cucumber";
import { FORMATS, MONTHS, getDate, formatOrdinal } from "~/fixtures/utils/date";
import { GDriveService } from "./gdrive.service";
import { GMailService } from "./gmail.service";

import type { This as BaseThis } from "~/fixtures/pages/base.steps";

const ACCTG_EMAIL_TEMPLATE_PATH = "resources/email-templates/accounting";
const ACCTG_EMAIL_DATE_DELIMITER = "_";
const ACCTG_EMAIL_SUBJ_PREFIX = "[TripleTaste]";
const ACCTG_EMAIL_SCOPE_DATE_TOKEN = "[[SCOPE_DATE]]";
const ACCTG_EMAIL_YEAR_MONTH_TOKEN = "[[YEAR_MONTH]]";
const ACCTG_EMAIL_YEAR_MONTH_DAY_TOKEN = "[[YEAR_MONTH_DAY]]";
const ACCTG_EMAIL_FOLDER_ID_TOKEN = "[[FOLDER_ID]]";
const ACCTG_EMAIL_FOLDER_NAME_TOKEN = "[[FOLDER_NAME]]";
const ACCTG_EMAIL_ORDINAL_TOKEN = "[[NTH]]";
const ACCTG_EMAIL_SIG_SENDER_TOKEN = "[[SENDER_EMAIL]]";
const ACCTG_EMAIL_SIG_CONTACT_TOKEN = "[[SENDER_CONTACT]]";

export interface This extends BaseThis {
  gdrive: GDriveService;
  gmail: GMailService;
}

Before({}, async function (this: This) {
  this.gdrive = new GDriveService();
  this.gmail = new GMailService();
});

When(/^I send the (monthly) EWT - Expanded Witholding Tax reminder email$/, async function (this: This, freq: string) {
  const filingDeadlineDay = 10;
  const emailDay = filingDeadlineDay - 5;
  const filingMonths = [
    MONTHS.FEB, MONTHS.MAR,
    MONTHS.MAY, MONTHS.JUN,
    MONTHS.AUG, MONTHS.SEP,
    MONTHS.NOV, MONTHS.DEC,
  ];

  const { date } = getDate();
  const shouldFileThisMonth = filingMonths.includes(date.monthShort);
  const shouldSendEmail = date.day === emailDay && shouldFileThisMonth;

  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const { GMAIL_USER, ACCTG_EMAIL_REMINDER_RECIPIENTS, ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO } = process.env;
  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "ewt-mtl-0619E.html");
  const template = fs.readFileSync(templatePath, "utf8");
  
  const submissionDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const scopeDate = getDate({ date, offset: { months: -1 }, format: FORMATS.MONTH_YEAR });
  const scopeDatePrefix = getDate({ date, offset: { months: -1 }, format: FORMATS.YEAR_MONTH }).formatted;
  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 01619E Monthly Expanded Witholding Tax: ${submissionDate.formatted} Filing`;
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_YEAR_MONTH_TOKEN, scopeDatePrefix)
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});

When(/^I send the (monthly) Staffing Agency 2307 Request email$/, async function (this: This, freq: string) {
  const { date } = getDate();
  const billingInvoiceUploadDays = [12, 24];
  const isFirstCutoff = date.day === billingInvoiceUploadDays[0];
  const isSecondCutoff = date.day === billingInvoiceUploadDays[1];

  if (!isFirstCutoff && !isSecondCutoff) {
    return Status.SKIPPED.toLowerCase();
  }

  const billingInvoicesThisMonth = await this.gdrive.getRobbeanBillingInvoicesForCurrentMonth();
  const hasInvoiceForCutoff = isFirstCutoff ? billingInvoicesThisMonth.length > 0 : billingInvoicesThisMonth.length > 1;
  const wantedInvoice = isFirstCutoff ? billingInvoicesThisMonth[0] : billingInvoicesThisMonth[1];
  const shouldSendEmail = hasInvoiceForCutoff;

  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const { GMAIL_USER, ACCTG_EMAIL_REMINDER_RECIPIENTS, ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO } = process.env;
  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "sfa-mtl-2307.html");
  const template = fs.readFileSync(templatePath, "utf8");
  
  const scopeDate = getDate({ date, format: FORMATS.MONTH_YEAR });
  const nth = formatOrdinal(isFirstCutoff ? 1 : 2)
  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} 2307 Form Request for Staffing Agency: ${scopeDate.formatted} ${nth} Billing`;
  const folder = await this.gdrive.getQFolder(scopeDate.date)
  const html = template
    .replaceAll(ACCTG_EMAIL_ORDINAL_TOKEN, nth)
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_YEAR_MONTH_DAY_TOKEN, wantedInvoice.split(ACCTG_EMAIL_DATE_DELIMITER)[0])
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, folder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, folder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

    await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});


When(/^I send the (monthly) bookkeeping reminder email$/, async function (this: This, freq: string) {
  const emailDay = 3;

  const { date } = getDate();
  const shouldSendEmail = date.day === emailDay;

  if (!shouldSendEmail) {
    return Status.SKIPPED.toLowerCase();
  }

  const { GMAIL_USER, ACCTG_EMAIL_REMINDER_RECIPIENTS, ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO } = process.env;
  const templatePath = path.join(world.config.baseDir, ACCTG_EMAIL_TEMPLATE_PATH, freq, "bkk-mtl-expenses.html");
  const template = fs.readFileSync(templatePath, "utf8");
  
  const scopeDate = getDate({ date, offset: { months: -1 }, format: FORMATS.MONTH_YEAR });
  const scopeDatePrefix = getDate({ date, offset: { months: -1 }, format: FORMATS.YEAR_MONTH }).formatted;
  const subject = `${ACCTG_EMAIL_SUBJ_PREFIX} Bookkeeping Expenses: ${scopeDate.formatted}`;
  const qfolder = await this.gdrive.getQFolder(scopeDate.date)
  const html = template
    .replaceAll(ACCTG_EMAIL_SCOPE_DATE_TOKEN, scopeDate.formatted)
    .replaceAll(ACCTG_EMAIL_YEAR_MONTH_TOKEN, scopeDatePrefix)
    .replaceAll(ACCTG_EMAIL_FOLDER_ID_TOKEN, qfolder.id)
    .replaceAll(ACCTG_EMAIL_FOLDER_NAME_TOKEN, qfolder.name)
    .replaceAll(ACCTG_EMAIL_SIG_SENDER_TOKEN, GMAIL_USER)
    .replaceAll(ACCTG_EMAIL_SIG_CONTACT_TOKEN, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);

  await this.gmail.sendEmail({ to: ACCTG_EMAIL_REMINDER_RECIPIENTS, cc: ACCTG_EMAIL_REMINDER_RECIPIENTS_CC, subject, html });
});