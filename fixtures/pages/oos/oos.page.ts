import { BasePage } from "~/fixtures/pages/base.page";
import { Format } from "~/fixtures/utils/date.utils";

import { DatePicker } from "./components/datepicker.component";
import { Navigation } from "./components/navigation.component";
import { Shipping } from "./components/shipping.component";

export class OOSPage extends BasePage {
  url = this.parameters.env.PCOOS_URL;
  title = "";

  private navigation = () => this.page.component(Navigation);
  private btnSearch = () => this.page.locator("//*[@class='nav-search']").first();
  private tfSearch = () => this.btnSearch().locator("//*[@aria-label='Search Site']");

  private divProducts = () => this.page.locator("//div[contains(@class,'products-grid')]");
  private lnkProduct = (hasText: string) => this.divProducts().locator("//a", { hasText });
  private headerProduct = (hasText: string) => this.page.locator("//header[contains(@class,'product-title')]", { hasText });

  private tfQty = () => this.page.locator("#quantity");
  private btnAddToCart = () => this.page.locator("#product-add-to-cart");
  private divModal = (type="success") => this.page.locator(`//div[contains(@class,'${type}-modal')]//div[contains(@class,'content')]`);
  private btnModalClose = () => this.divModal().locator("//a[contains(@class,'close')]");

  private datepicker = () => this.page.component(DatePicker);
  private btnViewCart = () => this.page.locator("#cartToggle");
  private lblSubTotal = () => this.page.locator("//*[@class='total-price']/p");
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
    await this.navigation().expect().displayed().poll();
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
    await this.lnkProduct(product).click();
    await this.headerProduct(product).expect().displayed().poll();
  }

  async addToCart() {
    const products = this.parameters.gsheets.inventory.order.products.filter(i => +i.value);
    for (let i = 0; i < products.length; i++) {
      const { name, value } = products[i];

      await this.searchProduct(name);
      await this.viewProduct(name);

      await this.tfQty().expect().enabled().poll();
      await this.tfQty().clear();
      await this.tfQty().fill(value);
      await this.tfQty().expect().valueEquals(value).poll();
      await this.btnAddToCart().click();
      await this.divModal().expect().textContains(name).poll();
      await this.btnModalClose().click();
    }
  }

  async checkout() {
    const { deliveryDate } = this.parameters.gsheets.inventory.order;
    await this.btnViewCart().click();
    await this.lblSubTotal().expect().displayed().poll();

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
