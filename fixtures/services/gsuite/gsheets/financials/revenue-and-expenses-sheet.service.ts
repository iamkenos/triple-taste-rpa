
import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { Format } from "~/fixtures/utils/date.utils";

import type { DateTime } from "luxon";
import type { ExpenseInfo, WorkbookResource } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export class RevenueAndExpensesSheetService extends GSheetsService {

  protected spreadsheetId = this.parameters.env.GSHEETS_FI_REV_X_EXP_TRACKER_ID;
  private tabs = { revenue: "Revenue Records", expenses: "Expense Records" };
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
    }
  };

  getWebViewUrl({ sheetId, viewId }: Partial<WorkbookResource>) {
    return super.getWebViewUrl({ sheetId, viewId });
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
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 4,
              endIndex: 7
            },
            properties: {
              hiddenByUser: true
            },
            fields: "hiddenByUser"
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

  async createExpensesRecord({ date, category, amount, note }: ExpenseInfo) {
    const sheetName = this.tabs.expenses;
    const range = "A2:D2";
    const values = [date.toFormat(Format.DATE_SHORT_DMY), category, amount, note];

    await this.clearFilters({ sheetName });
    await this.insertRows({ sheetName, startIndex: 1, endIndex: 2 });
    await this.updateRangeContents({ sheetName, range, values });
  }
}
