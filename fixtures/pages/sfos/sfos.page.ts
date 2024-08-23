import path from "path";
import { DateTime } from "luxon";

import { BasePage } from "../base.page";

export class SFOSPage extends BasePage {
  url = "https://sfosv2.shakeys.solutions/Identity/Account/Login";
  title = "Log In";

  private tfEmail = () => this.page.locator("#Email");
  private tfPassword = () => this.page.locator("#Password");
  private btnSignIn = () => this.page.locator("#btLgnSbmt");

  private btnGenerateSOA = () => this.page.locator("//button[contains(.,'Generate SOA')]")
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

  private async generatePDFs() {
    const trigger = async () => {
      await this.btnGenerateSOA().click();
      await this.btnGenerateSOA().locator("//following-sibling::*//a[contains(., 'PDF')]").click();
    }
    await this.downloadFile(trigger)
  }

  private async getInvoiceTableColumnContents(label: string) {
    const index = await this.getInvoiceTableColumnIndex(label)
    const contents = await this.tdSOSInvoiceList(index).allTextContents();
    return contents;
  }

  private async getRowsForThisQuarter() {
    const availableSOADates = await this.getInvoiceTableColumnContents("SOA Date");
    const rowsForThisQuarter = availableSOADates
      .map((i, idx) => ({ idx, r: this.isDateOnThisQuarter(i, "LLLL dd, yyyy") }))
      .filter(i => i.r)
      .map(i => i.idx)
    return rowsForThisQuarter;
  }

  private getUploadedIdsForThisQuarter() {
    const { driveSfosInvoices } = this.parameters;
    const uploadedIdsForThisQuarter = driveSfosInvoices
      .map(i => i.match(/^[\d]{8}_PC_OR_(.+)[.].+$/))
      .filter(Boolean).map(([, id]) => id);
    return uploadedIdsForThisQuarter;
  }

  private isDateOnThisQuarter(text: string, fmt: string) {
    return DateTime.fromFormat(text, fmt).quarter === DateTime.now().quarter;
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
    const rowsForThisQuarter = await this.getRowsForThisQuarter();
    const availableIds = await this.getInvoiceTableColumnContents("Invoice Id");

    const scopedIds = rowsForThisQuarter.map(i => availableIds[i]);
    const uploadedIds = this.getUploadedIdsForThisQuarter();
    const wantedIds = scopedIds.filter(item => uploadedIds.indexOf(item) < 0);

    for (let i = 0; i < wantedIds.length; i++) {
      const wantedId = wantedIds[i];
      const row = scopedIds.findIndex(i => i === wantedId);
      await this.cbxSOSInvoice(row).check();
      await this.generatePDFs();
      await this.cbxSOSInvoice(row).uncheck();
    }
  }
}
