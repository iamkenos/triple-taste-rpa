
import path from "path";

import { GMailService } from "~/fixtures/services/gsuite/gmail/gmail.service";
import { FinancialsDriveService } from "~/fixtures/services/gsuite/gdrive/financials/financials-drive.service";
import { RevenueAndExpensesSheetService } from "~/fixtures/services/gsuite/gsheets/financials/revenue-and-expenses-sheet.service";
import { createDate, Format, Unit } from "~/fixtures/utils/date.utils";

export class AccountingMailService extends GMailService {

  private accountingTemplates = path.join(this.templates, "accounting");
  private financials = new FinancialsDriveService();
  private revxexp = new RevenueAndExpensesSheetService();

  private addressee = this.parameters.env.ACCTG_EMAIL_ADDRESSEE;
  private to = this.parameters.env.ACCTG_EMAIL_RECIPIENTS;
  private cc = this.parameters.env.ACCTG_EMAIL_RECIPIENTS_CC;

  protected getTemplateMarkers() {
    return {
      ...super.getTemplateMarkers(),
      driveFolderID: "[[DRIVE_FOLDER_ID]]",
      driveFolderName: "[[DRIVE_FOLDER_NAME]]",
      expensesViewLink: "[[EXPENSES_FILE_VIEW_LINK]]",
      expensesViewName: "[[EXPENSES_FILE_VIEW_NAME]]"
    };
  }

  async sendMonthlyExpandedWitholdingTaxEmail() {
    const { date } = createDate();
    const { montly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, montly, "ewt-mtl-0619E.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: submissionDate } = createDate({ from: date });
    const { date: scopeDate } = createDate({ from: date.minus({ month: 1 }) });
    const folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);

    const subject = `01619E Monthly Expanded Witholding Tax: ${submissionDate.toFormat(Format.DATE_SHORT_MY)} Filing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(markers.dateShortYM, scopeDate.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(markers.driveFolderID, folder.id)
      .replaceAll(markers.driveFolderName, folder.foldername);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendMonthlyBookkeepingEmail() {
    const { date } = createDate();
    const { montly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, montly, "bkk-mtl-expenses.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: scopeDate } = createDate({ from: date.minus({ month: 1 }) });
    const folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);

    const expensesFile = await this.revxexp.createExpensesFilterByMonth(scopeDate);

    const subject = `Bookkeeping Expenses: ${scopeDate.toFormat(Format.DATE_SHORT_MY)}`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(markers.dateShortYM, scopeDate.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(markers.driveFolderID, folder.id)
      .replaceAll(markers.driveFolderName, folder.foldername)
      .replaceAll(markers.expensesViewLink, expensesFile.link)
      .replaceAll(markers.expensesViewName, expensesFile.name);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendMonthlyAgency2307RequestEmail() {
    const { date } = createDate();
    const { montly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, montly, "sfa-mtl-2307.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: scopeDate } = createDate({ from: date });
    const folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);

    const subject = `2307 Form Request for Staffing Agency: ${scopeDate.toFormat(Format.DATE_SHORT_MY)} 1st & 2nd Billing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(markers.dateShortYM, scopeDate.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(markers.driveFolderID, folder.id)
      .replaceAll(markers.driveFolderName, folder.foldername);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendQuarterlyExpandedWitholdingTaxEmail() {
    const { date } = createDate();
    const { quarterly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, quarterly, "ewt-qtl-1601EQ.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: submissionDate } = createDate({ from: date });
    const { date: scopeDate } = createDate({ from: date.minus({ quarter: 1 }).endOf(Unit.QUARTER) });
    const firstMonthOfQ = scopeDate.startOf(Unit.QUARTER);
    const secondMonthOfQ = firstMonthOfQ.plus({ months: 1 });
    const thirdMonthOfQ = secondMonthOfQ.plus({ months: 1 });
    const folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);

    const subject = `1601EQ Quarterly Expanded Witholding Tax: ${submissionDate.toFormat(Format.DATE_SHORT_MY)} Filing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortMY}[1]`, firstMonthOfQ.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortMY}[2]`, secondMonthOfQ.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortMY}[3]`, thirdMonthOfQ.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortYM}[1]`, firstMonthOfQ.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(`${markers.dateShortYM}[2]`, secondMonthOfQ.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(`${markers.dateShortYM}[3]`, thirdMonthOfQ.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(markers.driveFolderID, folder.id)
      .replaceAll(markers.driveFolderName, folder.foldername);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendQuarterlyIncomeTaxEmail() {
    const { date } = createDate();
    const { quarterly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, quarterly, "itr-qtl-1701Q.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: submissionDate } = createDate({ from: date });
    const { date: scopeDate } = createDate({ from: date.minus({ quarter: 1 }).endOf(Unit.QUARTER) });
    const firstMonthOfQ = scopeDate.startOf(Unit.QUARTER);
    const secondMonthOfQ = firstMonthOfQ.plus({ months: 1 });
    const thirdMonthOfQ = secondMonthOfQ.plus({ months: 1 });
    const folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);

    const subject = `1701Q Quarterly Income Tax: ${submissionDate.toFormat(Format.DATE_SHORT_MY)} Filing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortMY}[1]`, firstMonthOfQ.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortMY}[2]`, secondMonthOfQ.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortMY}[3]`, thirdMonthOfQ.toFormat(Format.DATE_SHORT_MY))
      .replaceAll(`${markers.dateShortYM}[1]`, firstMonthOfQ.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(`${markers.dateShortYM}[2]`, secondMonthOfQ.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(`${markers.dateShortYM}[3]`, thirdMonthOfQ.toFormat(Format.DATE_SHORT_YM))
      .replaceAll(markers.driveFolderID, folder.id)
      .replaceAll(markers.driveFolderName, folder.foldername);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendQuarterlyPercentageTaxEmail() {
    const { date } = createDate();
    const { quarterly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, quarterly, "ptr-qtl-2551Q.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: submissionDate } = createDate({ from: date });
    const { date: scopeDate } = createDate({ from: date.minus({ quarter: 1 }).endOf(Unit.QUARTER) });

    const subject = `2551Q Quarterly Percentage Tax: ${submissionDate.toFormat(Format.DATE_SHORT_MY)} Filing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.DATE_SHORT_MY));

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendYearlyExpandedWitholdingTaxEmail() {
    const { date } = createDate();
    const { yearly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, yearly, "ewt-anl-1604E.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: submissionDate } = createDate({ from: date });
    const { date: scopeDate } = createDate({ from: date.minus({ year: 1 }).startOf(Unit.YEAR) });
    const q1Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);
    const q2Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate.plus({ quarter: 1 }));
    const q3Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate.plus({ quarter: 2 }));
    const q4Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate.plus({ quarter: 3 }));

    const subject = `1604E Annual Expanded Witholding Tax: ${submissionDate.toFormat(Format.DATE_SHORT_MY)} Filing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.YEAR))
      .replaceAll(`${markers.driveFolderID}[1]`, q1Folder.id)
      .replaceAll(`${markers.driveFolderName}[1]`, q1Folder.foldername)
      .replaceAll(`${markers.driveFolderID}[2]`, q2Folder.id)
      .replaceAll(`${markers.driveFolderName}[2]`, q2Folder.foldername)
      .replaceAll(`${markers.driveFolderID}[3]`, q3Folder.id)
      .replaceAll(`${markers.driveFolderName}[3]`, q3Folder.foldername)
      .replaceAll(`${markers.driveFolderID}[4]`, q4Folder.id)
      .replaceAll(`${markers.driveFolderName}[4]`, q4Folder.foldername);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }

  async sendYearlyIncomeTaxEmail() {
    const { date } = createDate();
    const { yearly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.accountingTemplates, yearly, "itr-anl-1701.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { date: submissionDate } = createDate({ from: date });
    const { date: scopeDate } = createDate({ from: date.minus({ year: 1 }).startOf(Unit.YEAR) });
    const q1Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate);
    const q2Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate.plus({ quarter: 1 }));
    const q3Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate.plus({ quarter: 2 }));
    const q4Folder = await this.financials.fetchQFolderUnderReceiptsFor(scopeDate.plus({ quarter: 3 }));

    const subject = `1701 Annual Income Tax: ${submissionDate.toFormat(Format.DATE_SHORT_MY)} Filing`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.addressee, this.addressee)
      .replaceAll(markers.scopeDate, scopeDate.toFormat(Format.YEAR))
      .replaceAll(`${markers.driveFolderID}[1]`, q1Folder.id)
      .replaceAll(`${markers.driveFolderName}[1]`, q1Folder.foldername)
      .replaceAll(`${markers.driveFolderID}[2]`, q2Folder.id)
      .replaceAll(`${markers.driveFolderName}[2]`, q2Folder.foldername)
      .replaceAll(`${markers.driveFolderID}[3]`, q3Folder.id)
      .replaceAll(`${markers.driveFolderName}[3]`, q3Folder.foldername)
      .replaceAll(`${markers.driveFolderID}[4]`, q4Folder.id)
      .replaceAll(`${markers.driveFolderName}[4]`, q4Folder.foldername);

    await this.sendEmail({ to: this.to, cc: this.cc, subject, body });
  }
}
