import { google } from "googleapis";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";
import { GAppsScript } from "~/fixtures/services/gappsscript/gappsscript.service";

import type { DateTime } from "luxon";

export class GSheetsService extends GSuiteService {
  url = "https://www.googleapis.com/auth/spreadsheets";
  title = "";

  RVE_REVENUE_SHEET = "Revenue Records";
  RVE_EXPENSES_SHEET = "Expense Records";

  private sheets = this.connect();
  private scriptssvc = new GAppsScript();

  private connect() {
    const auth = this.auth();
    const connection = google.sheets({ version: "v4", auth });
    return { auth, connection };
  }

  private async getSheetIdByName(spreadsheetId: string, sheetName: string) {
    try {
      const { connection } = this.sheets;
      const response = await connection.spreadsheets.get({ spreadsheetId });
      const sheet = response.data.sheets.find((s) => s.properties.title === sheetName);

      if (sheet) {
        return sheet.properties.sheetId;
      } else {
        throw new Error(`Unable to find "${sheetName}" sheet from "${spreadsheetId}".`);
      }
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  private async insertRows(spreadsheetId: string, sheetName: string, startIndex: number, endIndex:  number) {
    const { connection, auth } = this.sheets;
    const sheetId = await this.getSheetIdByName(spreadsheetId, sheetName);
    
    await connection.spreadsheets.batchUpdate({
      auth,
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex, 
                endIndex,
              },
            },
          },
          {
            copyPaste: {
              source: {
                sheetId,
                startRowIndex: endIndex,
                endRowIndex: endIndex + 1,
                startColumnIndex: 0,
              },
              destination: {
                sheetId,
                startRowIndex: startIndex, 
                endRowIndex: endIndex,
                startColumnIndex: 0,
              },
              pasteType: 'PASTE_FORMULA',
            },
          },
        ],
      },
    });
  }

  private async getFilterView(spreadsheetId: string, sheetId: number, filterViewName: string) {
    const { connection } = this.sheets;
    const response = await connection.spreadsheets.get({ spreadsheetId });
    const filterViews = response.data.sheets.find(i => i.properties.sheetId === sheetId)?.filterViews;
    
    const filterView = filterViews?.find(view => view.title === filterViewName);
    return filterView ? filterView.filterViewId : undefined;
  }

  async updateRevenueAndExpensesSheetDataForExpenses(values: any[]) {
    const { GSHEETS_REVENUE_AND_EXPENSES_ID } = process.env;
    const { connection, auth } = this.sheets;

    const spreadsheetId = GSHEETS_REVENUE_AND_EXPENSES_ID;
    const sheetName = this.RVE_EXPENSES_SHEET;
    
    await this.insertRows(spreadsheetId, sheetName, 1, 2)
    await connection.spreadsheets.values.update({
      auth,
      spreadsheetId,
      range: `${this.RVE_EXPENSES_SHEET}!A2:D2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  }

  async createRevenueAndExpensesFilterByMonthForExpenses(from: DateTime) {
    const { GSHEETS_REVENUE_AND_EXPENSES_ID } = process.env;
    const { connection } = this.sheets;

    const buildSheetsLink = (sheetId: number, viewId: number) => `https://docs.google.com/spreadsheets/d/${GSHEETS_REVENUE_AND_EXPENSES_ID}/edit#gid=${sheetId}&fvid=${viewId}`
    const serializeToGSheetsDate = (date: DateTime) => date.toMillis() / (1000 * 60 * 60 * 24) + 25569;
    const start = serializeToGSheetsDate(from);
    const end = serializeToGSheetsDate(from.endOf("month"));
    
    const filterTitle = `Expenses ${from.monthShort} ${from.year}`;
    const sheet = await this.getSheetIdByName(GSHEETS_REVENUE_AND_EXPENSES_ID, this.RVE_EXPENSES_SHEET);
    const existingFilter = await this.getFilterView(GSHEETS_REVENUE_AND_EXPENSES_ID, sheet, filterTitle);
    
    if (existingFilter) {
      return {
        name: filterTitle,
        link: buildSheetsLink(sheet, existingFilter)
      }
    } else {
      const requestBody = {
        requests: [
          {
            addFilterView: {
              filter: {
                title: filterTitle,
                range: {
                  sheetId: sheet,
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                criteria: {
                  0: {
                    condition: {
                      type: "NUMBER_BETWEEN",
                      values: [
                        { userEnteredValue: `${start}` },
                        { userEnteredValue: `${end}` },
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: sheet,
                dimension: "COLUMNS",
                startIndex: 4,
                endIndex: 7,
              },
              properties: {
                hiddenByUser: true,
              },
              fields: "hiddenByUser",
            },
          },
        ],
      };

      const response = await connection.spreadsheets.batchUpdate({
        spreadsheetId: GSHEETS_REVENUE_AND_EXPENSES_ID,
        requestBody,
      });

      const filterViewId = response.data.replies[0].addFilterView.filter.filterViewId;
      if (filterViewId) {
        return {
          name: filterTitle,
          link: buildSheetsLink(sheet, filterViewId)
        }
      } else {
        throw new Error(`Unable to find create a filter view for "${filterTitle}".`);
      }
    }
  }
}
