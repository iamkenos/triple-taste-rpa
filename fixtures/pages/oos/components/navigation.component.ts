import { Component, LocatorFilters } from "@iamkenos/kyoko/core";
import { ExpectedConditionKwargs, ExpectedConditionOptions, LocatorConditions } from "@iamkenos/kyoko/conditions";

export class Navigation extends Component {

  constructor(filters?: LocatorFilters) {
    super("//nav[@role='navigation']", filters);
  }

  navItem = (text: string) => this.locator("//ul/li//a", { hasText: text });

  // @ts-ignore
  expect(options?: ExpectedConditionOptions) {
    return new NavigationConditions(this, options);
  }

  async clickItem(text: string) {
    const locator = this.navItem(text);
    await locator.hoverIntoView();
    await locator.clickUntil(this.expect().active(text), { delay: 500 });
  }

  async orders() {
    await this.clickItem("My Orders");
  }
}

class NavigationConditions extends LocatorConditions<Navigation> {

  // @ts-ignore
  active(text: string, kwargs?: ExpectedConditionKwargs) {
    const locator = this.locator.navItem(text);
    return locator.expect().attributeEquals("class", "current", kwargs);
  }
}

