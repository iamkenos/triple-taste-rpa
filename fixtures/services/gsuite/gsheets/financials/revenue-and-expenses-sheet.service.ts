
import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { Format } from "~/fixtures/utils/date.utils";

import type { DateTime } from "luxon";
import type { ExpenseAndRevenueInfo, UpdateRangeContentInfo, WorkbookResource } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export class RevenueAndExpensesSheetService extends GSheetsService {

  protected spreadsheetId = this.parameters.env.GSHEETS_FI_REV_X_EXP_TRACKER_ID;
  private tabs = { revenue: "Revenue Records", expenses: "Expense Records", invoice: "Invoice Records" };
  categories = {
    expenses: {
      rental: "Rental",
      electric_bill: "Electric Bill",
      accountant: "Accountant",
      courier: "Courier",
      salary: "Salary",
      cog: "Cost of Goods",
      mobile_data: "Mobile Data",
      kiosk_misc: "Kiosk Miscellaneous",
      documents_related: "Documents Related",
      tax: "Tax",
      service_fee: "Service Fee",
      salary_internal: "Salary Internal"
    },
    revenue: {
      sales: "Sales",
      reimbursements: "Reimbursements"
    },
    invoice: {
      walkIn: "Walk In",
      grab: "Grab Food",
      panda: "Food Panda"
    }
  };
  private ranges = {
    RECORD: "A2:D2"
  };

  getWebViewUrl({ sheetId, viewId }: Partial<WorkbookResource>) {
    return super.getWebViewUrl({ sheetId, viewId });
  }

  private async createNewRecord({ sheetName, values }: WorkbookResource & Pick<UpdateRangeContentInfo, "values">) {
    const range = this.ranges.RECORD;
    await this.clearFilters({ sheetName });
    await this.insertRows({ sheetName, startIndex: 1, endIndex: 2 });
    await this.updateRangeContents({ sheetName, range, values });
  }

  async createExpensesFilterByMonth(date: DateTime) {
    const start = this.serializeToGSheetsDate(date);
    const end = this.serializeToGSheetsDate(date.endOf("month"));

    const sheetName = this.tabs.expenses;
    const viewName = `${date.year} ${date.monthShort} Expenses`;
    const sheetId = await this.fetchWorksheetId({ sheetName });
    const viewId = await this.fetchViewId({ sheetId, viewName });

    const requestBody = {
      requests: [
        {
          addFilterView: {
            filter: {
              title: viewName,
              range: {
                sheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
                endColumnIndex: 7
              },
              criteria: {
                0: {
                  condition: {
                    type: "NUMBER_BETWEEN",
                    values: [
                      { userEnteredValue: `${start}` },
                      { userEnteredValue: `${end}` }
                    ]
                  }
                }
              }
            }
          }
        }
      ]
    };

    if (viewId) {
      return {
        name: viewName,
        link: this.getWebViewUrl({ sheetId, viewId })
      };
    } else {
      const response = await this.batchUpdate({ requestBody });
      const filterViewId = response.data.replies[0].addFilterView.filter.filterViewId;

      if (filterViewId) {
        return {
          name: viewName,
          link: this.getWebViewUrl({ sheetId, viewId })
        };
      } else {
        throw new Error(`Unable to find create a filter view for "${viewName}".`);
      }
    }
  }

  async createExpensesRecord({ date, category, amount, note }: ExpenseAndRevenueInfo) {
    const sheetName = this.tabs.expenses;
    const values = [date.toFormat(Format.DATE_SHORT_DMY), category, amount, note];
    await this.createNewRecord({ sheetName, values });
  }

  async createRevenueRecord({ date, category, amount, note }: ExpenseAndRevenueInfo) {
    const sheetName = this.tabs.revenue;
    const values = [date.toFormat(Format.DATE_SHORT_DMY), category, amount, note];
    await this.createNewRecord({ sheetName, values });
  }

  async createInvoiceRecord({ date, category, amount, note }: Partial<ExpenseAndRevenueInfo>) {
    if (amount > 0) {
      const sheetName = this.tabs.invoice;
      const values = [date.toFormat(Format.DATE_SHORT_DMY), category, amount, note];
      await this.createNewRecord({ sheetName, values });
    }
  }
}
