import { Component, Locator, LocatorFilters } from "@iamkenos/kyoko/core";
import { createDate, Format } from "~/fixtures/utils/date.utils";

import type { DateTime } from "luxon";

export class DatePicker extends Component {

  constructor(filters?: LocatorFilters) {
    super("#ui-datepicker-div", filters);
  }

  tfDeliveryDate = () => this.page().locator("#request-deliver-date");
  lblDeliveryDate = () => this.page().locator("//label", { hasText: "Your Requested Delivery Date" });
  lblMonth = () => this.locator("//*[@class='ui-datepicker-month']");
  btnBackward = () => this.locator("//*[@data-handler='prev']");
  btnForward = () => this.locator("//*[@data-handler='next']");
  lnkDate = (date: DateTime) => this.locator(`//td[@data-month='${date.month - 1}'][@data-year='${date.year}']//a[@data-date='${date.day}']`);

  private async open() {
    const action = async() => {
      await this.lblDeliveryDate().click();
      await this.tfDeliveryDate().hoverIntoView();
      await this.tfDeliveryDate().click();
    };
    await this.doUntil(action, this.expect().displayed());
  }

  private async showCalendarFor(date: DateTime) {
    const selectedMonth = await this.lblMonth().textContent();
    const { date: selectedMonthDt } = createDate({ from: [selectedMonth, Format.MONTH] });
    const diffInMonths = date.month - selectedMonthDt.month;
    const action = async(locator: Locator) => await locator.clickUntil(this.expect().displayed(), { delay: 500, clickCount: Math.abs(diffInMonths) });

    if (diffInMonths < 0) {
      await action(this.btnBackward());
    } else if (diffInMonths > 0) {
      await action(this.btnForward());
    }
  }

  async select(date: DateTime) {
    await this.open();
    await this.showCalendarFor(date);
    await this.lnkDate(date).click();
    await this.expect().displayed({ not: true }).poll();
  }
}

