import {
  Component,
  ExpectedConditionKwargs,
  ExpectedConditionOptions,
  LocatorConditions
} from "@iamkenos/kyoko";

export class Navigation extends Component {

  constructor() {
    super("//nav[@role='navigation']");
  }

  navItem = (text: string) => this.locator("//ul/li//a", { hasText: text });

  expect(options?: ExpectedConditionOptions) {
    return new NavigationConditions(this, options);
  }

  async clickItem(text: string) {
    const locator = this.navItem(text);
    await locator.hoverIntoView();
    await locator.clickUntil(this.expect().active(text));
  }

  async orders() {
    await this.clickItem("My Orders");
  }
}

class NavigationConditions extends LocatorConditions<Navigation> {

  active(text: string, kwargs?: ExpectedConditionKwargs) {
    const locator = this.locator.navItem(text);
    return locator.expect().attributeEquals("class", "current", kwargs);
  }
}

