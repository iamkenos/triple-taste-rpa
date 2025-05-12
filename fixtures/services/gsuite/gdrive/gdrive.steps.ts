import { Before } from "@cucumber/cucumber";

import { FinancialsDriveService } from "./financials/financials-drive.service";
import { HRDriveService } from "./hr/hr-drive.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  financials: FinancialsDriveService;
  hr: HRDriveService;
}

Before({}, async function(this: This) {
  this.financials = new FinancialsDriveService();
  this.hr = new HRDriveService();
});

