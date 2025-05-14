import { DataTable, When } from "@cucumber/cucumber";
import { createDate } from "~/fixtures/utils/date.utils";

import type { This as GSHeets } from "~/fixtures/services/gsuite/gsheets/gsheets.steps";

export interface This extends GSHeets {
}

When("the service account creates a/an {input_string} with {input_string} expense record for each pay advise", async function(this: This, category: string, serviceFee: string) {
  const { advices } = this.parameters.gmail.staff;
  for (let i = 0; i < advices.length; i++) {
    const { payReminderInfo, date } = advices[i];
    const { grossPay, staffId, payCycleId } = payReminderInfo;
    const amount = this.revxexp.parseFloat(grossPay);
    const note = `${payCycleId} - ${staffId}`;
    await this.revxexp.createExpensesRecord({ date, category, amount, note });
    await this.revxexp.createExpensesRecord({ date, category: serviceFee, amount: 25, note });
  }
});

When("the service account creates an expense record for the newly created order", async function(this: This) {
  const { amount: cost, por: note, orderDate: date } = this.parameters.gsheets.inventory.order;
  const category = this.revxexp.categories.expenses.cog;
  const amount = this.revxexp.parseFloat(cost);
  await this.revxexp.createExpensesRecord({ date, category, amount, note });
});

When("the service account creates expense records for:", async function(this: This, expenses: DataTable) {
  const { date } = createDate();
  const records = expenses.raw();
  for (let i = 0; i < records.length; i++) {
    const [category, expense, note = ""] = records[i];
    const amount = this.revxexp.parseFloat(expense);
    await this.revxexp.createExpensesRecord({ date, category, amount, note });
  }
});

When("the service account creates an invoice record for the computed data", async function(this: This) {
  const { date, adjTotal: amount } = this.parameters.gsheets.sales.daily.invoice;
  await this.revxexp.createInvoiceRecord({ date, amount });
});
