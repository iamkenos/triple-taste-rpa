import { Before } from "@cucumber/cucumber";
import { AccountingMailService } from "./accounting/accounting-mail.service";
import { StaffMailService } from "./staff/staff-mail.service";

import type { This as RPA } from "~/fixtures/rpa.steps";

export interface This extends RPA {
  accounting: AccountingMailService;
  staff: StaffMailService;
}

Before({}, async function(this: This) {
  this.accounting = new AccountingMailService();
  this.staff = new StaffMailService();
});
