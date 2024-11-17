import { DateTime } from "luxon";

import { BasePage } from "~/fixtures/pages/base.page";

export class SFOSPage extends BasePage {
  url = process.env.SFOS_URL;
  title = "Log In";

  private tfEmail = () => this.page.locator("#Email");
  private tfPassword = () => this.page.locator("#Password");
  private btnSignIn = () => this.page.locator("#btLgnSbmt");

  private btnGenerateSOA = () => this.page.locator("//button[contains(.,'Generate SOA')]");
  private lnkPrintPDF = () => this.btnGenerateSOA().locator("//following-sibling::*//a[contains(., 'PDF')]");
  private ddlShowAll = () => this.page.locator("//select[@name='tblSOSInvoiceList_length']");

  private tblSOSInvoiceList = () => this.page.locator("//table[@id='tblSOSInvoiceList']");
  private thSOSInvoiceList = () => this.tblSOSInvoiceList().locator("//thead//th");
  private trSOSInvoiceList = () => this.tblSOSInvoiceList().locator("//tbody//tr");
  private tdSOSInvoiceList = (index: number) => this.trSOSInvoiceList().locator(`//td[${index + 1}]`);
  private cbxSOSInvoice = (index: number) => this.tdSOSInvoiceList(0).nth(index).locator("//input");

  private async getInvoiceTableColumnIndex(label: string) {
    const headers = await this.thSOSInvoiceList().allTextContents();
    const index = headers.findIndex(i => i === label);
    return index;
  }

  private async generatePDFFor(file: string) {
    const trigger = async () => {
      const conditions = this.lnkPrintPDF().given().displayed();
      await this.btnGenerateSOA().clickUntil(conditions)
      await this.lnkPrintPDF().click();
    }
    await this.page.downloadFile(trigger, file)
  }

  private async getInvoiceTableColumnContents(label: string) {
    const index = await this.getInvoiceTableColumnIndex(label)
    const contents = await this.tdSOSInvoiceList(index).allTextContents();
    return contents;
  }

  private getDateTimeFromSOADate(soaDate: string) {
    return DateTime.fromFormat(soaDate, "LLLL dd, yyyy");
  }

  async login() {
    const { SFOS_USERNAME, SFOS_PASSWORD } = process.env;
    await this.navigate();
    await this.tfEmail().fill(SFOS_USERNAME);
    await this.tfPassword().fill(SFOS_PASSWORD);
    await this.btnSignIn().click();
    await this.trSOSInvoiceList().given().countMoreThan(0).poll();
  }

  async showAllInvoices() {
    await this.ddlShowAll().selectOption("All");
    await this.trSOSInvoiceList().given().countMoreThan(10).poll();
  }

  async downloadNewInvoices() {
    const { driveUploadedSfosInvoices: driveSfosInvoices } = this.parameters;
    const availableInvoiceIds = await this.getInvoiceTableColumnContents("Invoice Id");
    const availableInvoiceIdsSOADates = await this.getInvoiceTableColumnContents("SOA Date");
    const newInvoiceIds = availableInvoiceIds.filter(id => !driveSfosInvoices.find(i => i.includes(id)));

    const downloads = [];
    for (let i = 0; i < newInvoiceIds.length; i++) {
      const newInvoiceId = newInvoiceIds[i];
      const row = availableInvoiceIds.findIndex(i => i === newInvoiceId);
      const soaDate = this.getDateTimeFromSOADate(availableInvoiceIdsSOADates[row]);
      const prefix = soaDate.toFormat("yyyyLLdd");
      const filename = `${prefix}_PC_OR_${newInvoiceId}.pdf`;

      await this.cbxSOSInvoice(row).check();
      await this.generatePDFFor(filename);
      await this.cbxSOSInvoice(row).uncheck();
      downloads.push({ filename, soaDate });
    }

    this.logger.info("Downloaded %s new files.", downloads.length);
    this.parameters.sfosNewInvoices = downloads;
  }
}
