import { When } from "@cucumber/cucumber";
import { createDate } from "~/fixtures/utils/date.utils";

import type { This as GSHeets } from "~/fixtures/services/gsuite/gsheets/gsheets.steps";

export interface This extends GSHeets {
}

When("the service account fetches the list of items from the inventory sheet", async function(this: This) {
  this.parameters.gsheets.inventory.products = await this.inventory.fetchListOfProducts();
});

When("the service account fetches the order details from the inventory sheet", async function(this: This) {
  this.parameters.gsheets.inventory.order = await this.inventory.fetchOrderInfo();
});

When("the service account updates the remaining items on the inventory sheet", async function(this: This) {
  const { date } = createDate();

  const days = date.weekday == 6 ? 2 : date.weekday == 7 ? 1 : 0;
  const { date: scopeDate } = createDate({ from: date.plus({ days }) });
  await this.inventory.updateRemainingInventoryFor(scopeDate);
});

When("the service account updates the ordered and arriving items on the inventory sheet", async function(this: This) {
  const { orderDate, deliveryDate } = this.parameters.gsheets.inventory.order;

  await this.inventory.updateOrderedInventoryFor(orderDate);
  await this.inventory.updateArrivingInventoryFor(deliveryDate);
});

When("the service account reverts the master formula references on inventory sheet", async function(this: This) {
  await this.inventory.revertMasterSheetFormulas();
});

