import {
  Component,
  ExpectedConditionKwargs,
  ExpectedConditionOptions,
  LocatorConditions
} from "@iamkenos/kyoko";

export class Shipping extends Component {

  constructor() {
    super("#shippingMethod-collapsible");
  }

  rdMethod = (text: string) => this.page().locator(`//label[contains(@for,'shipping_methods')][contains(.,'${text}')]`);
  lblAmount = () => this.page().locator("//span[text()='Shipping']/ancestor::*[@role='rowheader']/following-sibling::div[@role='cell']/span/attribute::*[local-name()='translate']");

  // @ts-ignore
  expect(options?: ExpectedConditionOptions) {
    return new ShippingConditions(this, options);
  }

  async open() {
    await this.clickUntil(this.expect().attributeEquals("aria-expanded", "true"));
  }

  async select(method: string) {
    await this.open();
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
