import {
  Component,
  ExpectedConditionKwargs,
  ExpectedConditionOptions,
  LocatorConditions
} from "@iamkenos/kyoko";

export class Shipping extends Component {

  constructor() {
    super("//*[@id='shippingMethod']");
  }

  rdMethod = (text: string) => this.page().locator(`//label[contains(@for,'shipping_methods')][contains(.,'${text}')]`);
  lblAmount = () => this.page().locator("//span[text()='Shipping']/ancestor::*[@role='rowheader']/following-sibling::div[@role='cell']/span/attribute::*[local-name()='translate']");

  // @ts-ignore
  expect(options?: ExpectedConditionOptions) {
    return new ShippingConditions(this, options);
  }

  async open(method: string) {
    await this.clickUntil(this.rdMethod(method).expect().displayed());
  }

  async select(method: string) {
    await this.open(method);
    await this.rdMethod(method).clickUntil(this.expect().optionSelected(method));
    await this.lblAmount().expect().textEmpty({ not: true }).poll();
  }
}

class ShippingConditions extends LocatorConditions<Shipping> {

  optionSelected(text: string, kwargs?: ExpectedConditionKwargs) {
    const locator = this.locator.rdMethod(text);
    return locator.expect().attributeEquals("data-option-selected", "true", kwargs);
  }
}
