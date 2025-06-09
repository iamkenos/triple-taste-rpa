import { BasePage } from "~/fixtures/pages/base.page";
import { Format } from "~/fixtures/utils/date.utils";
import { EscapeSequence } from "~/fixtures/utils/string.utils";

import { DatePicker } from "./components/datepicker.component";
import { Navigation } from "./components/navigation.component";
import { Shipping } from "./components/shipping.component";


export class OOSPage extends BasePage {
  url = this.parameters.env.PCOOS_URL;
  title = "";

  private tfEmail = () => this.page.locator("#customer_email");
  private tfPassword = () => this.page.locator("#customer_password");
  private btnLogin = () => this.page.locator("//input[@value='Login']");

  private navigation = () => this.page.component(Navigation);
  private btnSearch = () => this.page.locator("//*[@class='nav-search']").first();
  private tfSearch = () => this.btnSearch().locator("//*[@aria-label='Search Site']");

  private divProducts = () => this.page.locator("//div[contains(@class,'products-grid')]");
  private lnkProduct = (hasText: string) => this.divProducts().locator("//a", { hasText }).first();
  private headerProduct = (hasText: string) => this.page.locator("//header[contains(@class,'product-title')]", { hasText });

  private tfQty = () => this.page.locator("#quantity");
  private btnAddToCart = () => this.page.locator("#product-add-to-cart");
  private divModal = (type="success") => this.page.locator(`//div[contains(@class,'${type}-modal')]//div[contains(@class,'content')]`);
  private btnModalClose = () => this.divModal().locator("//a[contains(@class,'close')]");

  private datepicker = () => this.page.component(DatePicker);
  private btnViewCart = () => this.page.locator("#cartToggle");
  private lblSubTotal = () => this.page.locator("//*[@class='total-price']/p");
  private divModalAutoIssuance = () => this.page.locator("//div[contains(@class,'modal')][contains(.,'Auto Issuance')]");
  private lblListAutoIssuance = () => this.divModalAutoIssuance().locator("//div[contains(@class,'html-container')]");
  private btnAcceptAutoIssuance = () => this.divModalAutoIssuance().locator("//button", { hasText: "OK" });
  private btnCheckout = () => this.page.locator("#checkoutBtnId");

  private shipping = () => this.page.component(Shipping);
  private btnCompleteOrder = () => this.page.locator("#checkout-pay-button");
  private lblOrderConfirmation = () => this.page.locator("//h2[contains(text(),'Thank you! Your order has been sent for review.')]");

  private tblOrders = () => this.page.locator("#orderTab");
  private trOrderFor = (identifier: string) => this.tblOrders().locator(`//tbody//tr[td[contains(.,'${identifier}')]]`);
  private tdPOR = (identifier: string) => this.trOrderFor(identifier).locator("//td[2]//a");
  private tdStatus = (identifier: string) => this.trOrderFor(identifier).locator("//td[4]");
  private tdAmount = (identifier: string) => this.trOrderFor(identifier).locator("//td[10]");

  async login() {
    const domain = new URL(this.url).hostname;
    const { PCOOS_USER: name, PCOOS_PKEY: value } = this.parameters.env;
    await this.navigate();
    await this.page.context().addCookies([{ name, value, domain, path: "/" }]);
    await this.page.reload();

    const cookies = await this.page.context().cookies();
    await this.navigation().expect().displayed({ message: cookies }).poll();
    await this.navigation().orders();
  }

  async searchProduct(product: string) {
    const btnSearch = this.btnSearch();
    const tfSearch = this.tfSearch();
    await btnSearch.hoverIntoView();
    await btnSearch.clickUntil(this.tfSearch().expect().displayed());
    await tfSearch.fill(product);
    await this.page.keyboard.press("Enter");
    await this.lnkProduct(product).expect().displayed().poll();
  }

  async viewProduct(product: string) {
    await this.page.expect().domContentLoaded().poll();
    await this.lnkProduct(product).isEnabled();
    await this.lnkProduct(product).click();
    await this.headerProduct(product).expect().displayed().poll();
  }

  async addToCart() {
    const { products: fixed, adhoc } = this.parameters.gsheets.inventory.order;
    const products = [...fixed, ...adhoc].filter(i => +i.value);
    for (let i = 0; i < products.length; i++) {
      const { name, value } = products[i];
      const product = name.replaceAll(EscapeSequence.DBQT[0], "");

      await this.searchProduct(product);
      await this.viewProduct(product);

      await this.tfQty().expect().enabled().poll();
      await this.tfQty().clear();
      await this.tfQty().fill(value);
      await this.tfQty().expect().valueEquals(value).poll();
      await this.btnAddToCart().click();
      await this.divModal().expect().textContains(product).poll();
      await this.btnModalClose().click();
    }
  }

  async viewCart() {
    await this.btnViewCart().click();
    await this.lblSubTotal().expect().displayed().poll();
  }

  async acknowledgeAutoIssuance() {
    const timeout = 3000;
    const autoIssuanceNotice = this.divModalAutoIssuance();
    const hasAutoIssuance = await autoIssuanceNotice.waitUntil({ timeout }).displayed().poll();

    if (hasAutoIssuance) {
      const products = await this.lblListAutoIssuance().textContent();
      await this.btnAcceptAutoIssuance().clickUntil(autoIssuanceNotice.waitUntil({ timeout }).displayed({ not: true }));
      return products;
    }
  }

  async checkout() {
    const { deliveryDate } = this.parameters.gsheets.inventory.order;
    await this.datepicker().select(deliveryDate);
    await this.btnCheckout().click();
  }

  async completeOrder() {
    const { method } = this.parameters.gsheets.inventory.order;
    await this.shipping().select(method);
    await this.btnCompleteOrder().click();
    await this.lblOrderConfirmation().expect().displayed().poll();
  }

  async extractOrderDetails() {
    const { deliveryDate } = this.parameters.gsheets.inventory.order;
    const date = deliveryDate.toFormat(Format.DATE_SHORT_MDY.replaceAll("-", "/"));
    await this.navigate();

    const action = async() => await this.page.reload();
    const condition = this.trOrderFor(date).expect().exists();

    await this.tblOrders().doUntil(action, condition);
    const porData = await this.tdPOR(date).textContent();
    const statusData = await this.tdStatus(date).textContent();
    const amountData = await this.tdAmount(date).textContent();
    const por = porData.trim();
    const status = statusData.trim();
    const amount = amountData.trim();
    return { por, status, amount };
  }
}
