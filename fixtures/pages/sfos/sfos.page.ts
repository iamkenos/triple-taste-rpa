import { BasePage } from "../base.page";

export class SFOSPage extends BasePage {
  url = "https://sfosv2.shakeys.solutions/Identity/Account/Login";
  title = "Log In";

  private tfEmail = () => this.page.locator("#Email");
  private tfPassword = () => this.page.locator("#Password");
  private btnSignIn = () => this.page.locator("#btLgnSbmt");

  async login() {
    const { SFOS_USERNAME, SFOS_PASSWORD } = process.env;
    await this.navigate();
    await this.tfEmail().fill(SFOS_USERNAME);
    await this.tfPassword().fill(SFOS_PASSWORD);
    await this.btnSignIn().click();
  }

  async downloadNewInvoices() {
    console.log("TODO");
  }
}
