import { BasePage } from "~/fixtures/pages/base.page";
import { createDate, Format } from "~/fixtures/utils/date.utils";
import { Ext } from "~/fixtures/utils/file.utils";

export class SFOSPage extends BasePage {
  url = this.parameters.env.SFOS_URL;
  title = "Log In";

  private tfEmail = () => this.page.locator("#Email");
  private tfPassword = () => this.page.locator("#Password");
  private btnSignIn = () => this.page.locator("#btLgnSbmt");

  private btnGenerateSOA = () => this.page.locator("//button[contains(.,'Generate SOA')]");
  private lnkPrintPDF = () => this.btnGenerateSOA().locator("//following-sibling::*//a[contains(., 'PDF')]");
  private ddlShowEntries = () => this.page.locator("//select[@name='tblSOSInvoiceList_length']");

  private tblSOSInvoiceList = () => this.page.locator("//table[@id='tblSOSInvoiceList']");
  private thSOSInvoiceList = () => this.tblSOSInvoiceList().locator("//thead//th");
  private trSOSInvoiceList = () => this.tblSOSInvoiceList().locator("//tbody//tr");
  private tdSOSInvoiceList = (index: number) => this.trSOSInvoiceList().locator(`//td[${index + 1}]`);
  private cbxSOSInvoiceForRow = (index: number) => this.tdSOSInvoiceList(0).nth(index).locator("//input");

  private async downloadAndRenameSelectedPdf(filename: string) {
    const trigger = async() => {
      const conditions = this.lnkPrintPDF().waitUntil().displayed();
      await this.btnGenerateSOA().clickUntil(conditions);
      await this.lnkPrintPDF().click();
    };
    await this.page.downloadFile(trigger, filename);
  }

  private async getInvoiceTableColumnIndexFrom(label: string) {
    const headers = await this.thSOSInvoiceList().allTextContents();

    const index = headers.findIndex(v => v === label);
    return index;
  }

  private async getInvoiceTableColumnContentsFrom(label: string) {
    const index = await this.getInvoiceTableColumnIndexFrom(label);

    const result = await this.tdSOSInvoiceList(index).allTextContents();
    return result;
  }

  private async getDisplayedInvoices() {
    const ids = await this.getInvoiceTableColumnContentsFrom("Invoice Id");
    const dates = await this.getInvoiceTableColumnContentsFrom("SOA Date");

    const result = ids.map((v, i) => ({ index: i, id: v, date: dates[i] }));
    this.logger.debug("%s invoices displayed.", result.length);
    return result;
  }

  async login() {
    const { SFOS_USER: email, SFOS_PKEY: password } = this.parameters.env;
    await this.navigate();
    await this.btnSignIn().waitUntil().displayed().poll();
    await this.tfEmail().fill(email);
    await this.tfPassword().fill(password);
    await this.btnSignIn().click();
    await this.trSOSInvoiceList().waitUntil().countMoreThan(0).poll();
  }

  async showAllEntries() {
    await this.ddlShowEntries().selectOption("All");
    await this.trSOSInvoiceList().waitUntil().countMoreThan(10).poll();
  }

  async findNewInvoices() {
    const { sfos } = this.parameters.gdrive.financials.receipts;
    const invoices = await this.getDisplayedInvoices();
    const result = invoices.filter(invoice => !sfos.find(filename => filename.includes(invoice.id)));
    this.logger.debug("%s new invoices available.", result.length);
    return result;
  }

  async downloadNewInvoices() {
    const { toDownload } = this.parameters.sfos;

    const result = [];
    for (let i = 0; i < toDownload.length; i++) {
      const { index, id, date: soaDate } = toDownload[i];
      const { date } = createDate({ from: [soaDate, Format.DATE_FULL] });
      const filename = `${id}.${Ext.PDF}`;

      await this.cbxSOSInvoiceForRow(index).check();
      await this.downloadAndRenameSelectedPdf(filename);
      await this.cbxSOSInvoiceForRow(index).uncheck();
      result.push({ filename, date });
    }

    this.logger.debug("Downloaded %s new files.", result.length);
    return result;
  }
}
