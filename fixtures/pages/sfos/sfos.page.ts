import { DateTime } from "luxon";

import { BasePage } from "~/fixtures/pages/base.page";

export class SFOSPage extends BasePage {
  url = "https://sfosv2.shakeys.solutions/Identity/Account/Login";
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

  private async getRowsForThisQuarter() {
    const availableSOADates = await this.getInvoiceTableColumnContents("SOA Date");
    const rowsForThisQuarter = availableSOADates
      .map((i, idx) => ({ idx, r: this.isSOADateForThisQuarter(i) }))
      .filter(i => i.r)
      .map(i => i.idx)
    return { rowsForThisQuarter, availableSOADates };
  }

  private getUploadedIdsForThisQuarter() {
    const { driveSfosInvoices } = this.parameters;
    const uploadedIdsForThisQuarter = driveSfosInvoices
      .map(i => i.match(/^[\d]{8}_PC_OR_(.+)[.].+$/))
      .filter(Boolean).map(([, id]) => id);
    return uploadedIdsForThisQuarter;
  }

  private getDateTimeFromSOADate(soaDate: string) {
    return DateTime.fromFormat(soaDate, "LLLL dd, yyyy");
  }

  private isSOADateForThisQuarter(soaDate: string) {
    return this.getDateTimeFromSOADate(soaDate).quarter === DateTime.now().quarter;
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
    const { rowsForThisQuarter, availableSOADates } = await this.getRowsForThisQuarter();
    const availableIds = await this.getInvoiceTableColumnContents("Invoice Id");

    const scopedIds = rowsForThisQuarter.map(i => availableIds[i]);
    const uploadedIds = this.getUploadedIdsForThisQuarter();
    const wantedIds = scopedIds.filter(item => uploadedIds.indexOf(item) < 0);

    const downloads = [];
    for (let i = 0; i < wantedIds.length; i++) {
      const wantedId = wantedIds[i];
      const row = scopedIds.findIndex(i => i === wantedId);
      const dtstr = this.getDateTimeFromSOADate(availableSOADates[i]).toFormat("yyyyLLdd");
      const filename = `${dtstr}_PC_OR_${wantedId}.pdf`;

      await this.cbxSOSInvoice(row).check();
      await this.generatePDFFor(filename);
      await this.cbxSOSInvoice(row).uncheck();
      downloads.push(filename)
    }

    this.logger.info("Downloaded %s files.", downloads.length);
    this.parameters.driveFilesToUpload = downloads;
  }
}
