import { Before, Given, Status, When } from "@cucumber/cucumber";
import { OOSPage } from "./oos.page";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  oos: OOSPage;
}

Before({}, async function(this: This) {
  this.oos = new OOSPage();
});

Given("the service account logs in to OOS", async function(this: This) {
  await this.oos.login();
});

When("the service account adds each product to order in the OOS cart", async function(this: This) {
  const { products: fixed, adhoc } = this.parameters.gsheets.inventory.order;
  const products = [...fixed, ...adhoc].filter(i => +i.value);

  if (products.length > 0) {
    await this.oos.addToCart();
  } else {
    return Status.SKIPPED.toLowerCase();
  }
});

When("the service account views the OOS cart", async function(this: This) {
  await this.oos.viewCart();
});

When("the service account accepts any products subject for OOS auto issuance", async function(this: This) {
  this.parameters.gsheets.inventory.order.autoIssuance = await this.oos.acknowledgeAutoIssuance();
});

When("the service account selects the delivery date and checks out the OOS cart contents", async function(this: This) {
  await this.oos.checkout();
});

When("the service account completes the OOS order", async function(this: This) {
  await this.oos.completeOrder();
});

When("the service account extracts the OOS order details", async function(this: This) {
  const { amount, por, status } = await this.oos.extractOrderDetails();
  this.parameters.gsheets.inventory.order.por = por;
  this.parameters.gsheets.inventory.order.status = status;
  this.parameters.gsheets.inventory.order.amount = amount;
});
