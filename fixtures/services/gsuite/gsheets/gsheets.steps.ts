import { Before } from "@cucumber/cucumber";

import { RevenueAndExpensesSheetService } from "./financials/revenue-and-expenses-sheet.service";
import { PayoutSheetService } from "./hr/payout-sheet.service";
import { DailySalesSheetService } from "./sales/daily-sales-sheet.service";
import { InventoryManagementSheetService } from "./sales/inventory-management-sheet.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  revxexp: RevenueAndExpensesSheetService;
  payout: PayoutSheetService;
  dailysales: DailySalesSheetService;
  inventory: InventoryManagementSheetService;
}

Before({}, async function(this: This) {
  this.revxexp = new RevenueAndExpensesSheetService();
  this.payout = new PayoutSheetService();
  this.dailysales = new DailySalesSheetService();
  this.inventory = new InventoryManagementSheetService();
});

