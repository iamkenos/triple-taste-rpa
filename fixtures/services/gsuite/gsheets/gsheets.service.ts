import { google } from "googleapis";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";
import { GAppsScript } from "~/fixtures/services/gappsscript/gappsscript.service";
import { FORMATS } from "~/fixtures/utils/date";

import type { DateTime } from "luxon";

type SheetInfo = {
  spreadsheetId: string;
  sheetName?: string;
  sheetId?: number
}

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

  private serializeToGSheetsDate(date: DateTime) {
    const result = date.toMillis() / (1000 * 60 * 60 * 24) + 25569;
    return result;
  }

  private serializeToGSheetsCellAddress({ col, row }: { col: number, row: number }) {
    let column = '';
    while (col >= 0) {
      column = String.fromCharCode((col % 26) + 65) + column;
      col = Math.floor(col / 26) - 1;
    }

    const result = `${column}${row + 1}`;
    return result;
  }

  private async getSheetIdByName({ spreadsheetId, sheetName }: SheetInfo) {
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

  private async insertRows({ spreadsheetId, sheetName, startIndex, endIndex }: SheetInfo & { startIndex: number, endIndex:  number }) {
    const { connection, auth } = this.sheets;
    const sheetId = await this.getSheetIdByName({ spreadsheetId, sheetName });

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

  private async getFilterView({ spreadsheetId, sheetId, filterViewName }: SheetInfo & { filterViewName: string }) {
    const { connection } = this.sheets;
    const response = await connection.spreadsheets.get({ spreadsheetId });
    const filterViews = response.data.sheets.find(i => i.properties.sheetId === sheetId)?.filterViews;

    const filterView = filterViews?.find(view => view.title === filterViewName);
    return filterView ? filterView.filterViewId : undefined;
  }

  private async getRangeValue<T = any>({ spreadsheetId, range }: SheetInfo & { range: string }) {
    const { connection } = this.sheets;
    const response = await connection.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;
    const value: T = values?.[0]?.[0] || null;

    return { values, value };
  }

  private async searchForCell({ spreadsheetId, sheetName, rowStart, rowEnd, colStart, colEnd, searchFor }:
    SheetInfo & { rowStart: number, colStart: number, rowEnd: number, colEnd: number, searchFor: any, }) {
    const rangeStart = this.serializeToGSheetsCellAddress({ col: colStart, row: rowStart });
    const rangeEnd = this.serializeToGSheetsCellAddress({ col: colEnd, row: rowEnd });
    const range = `${sheetName}!${rangeStart}:${rangeEnd}`;
    const { values } = await this.getRangeValue({ spreadsheetId, range });

    if (!values) return null;

    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
      for (let colIndex = 0; colIndex < values[rowIndex].length; colIndex++) {
        if (values[rowIndex][colIndex] === searchFor) {
          return { rowIndex, colIndex };
        }
      }
    }

    return null;
  }

  async updateRevenueAndExpensesSheetDataForExpenses(values: any[]) {
    const { GSHEETS_REVENUE_AND_EXPENSES_ID } = process.env;
    const { connection, auth } = this.sheets;

    const spreadsheetId = GSHEETS_REVENUE_AND_EXPENSES_ID;
    const sheetName = this.RVE_EXPENSES_SHEET;
    const startIndex = 1, endIndex = 2;

    await this.insertRows({ spreadsheetId, sheetName, startIndex, endIndex })
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
    const start = this.serializeToGSheetsDate(from);
    const end = this.serializeToGSheetsDate(from.endOf("month"));

    const spreadsheetId = GSHEETS_REVENUE_AND_EXPENSES_ID;
    const sheetName = this.RVE_EXPENSES_SHEET;

    const filterTitle = `Expenses ${from.monthShort} ${from.year}`;
    const sheetId = await this.getSheetIdByName({ spreadsheetId, sheetName });
    const existingFilter = await this.getFilterView({ spreadsheetId, sheetId, filterViewName: filterTitle });

    if (existingFilter) {
      return {
        name: filterTitle,
        link: buildSheetsLink(sheetId, existingFilter)
      }
    } else {
      const requestBody = {
        requests: [
          {
            addFilterView: {
              filter: {
                title: filterTitle,
                range: {
                  sheetId,
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
                sheetId,
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
          link: buildSheetsLink(sheetId, filterViewId)
        }
      } else {
        throw new Error(`Unable to find create a filter view for "${filterTitle}".`);
      }
    }
  }

  async getCohAndGCashDailySalesAmount(day: DateTime) {
    const { GSHEETS_DAILY_SALES_ID } = process.env;
    const sheetName = day.toFormat(FORMATS.YEAR_QUARTER.replace(" ", "_"))
    const spreadsheetId = GSHEETS_DAILY_SALES_ID;
    const searchFor = day.toFormat(FORMATS.DDMMM);

    const parseAmounts = (amount: string) => parseFloat(amount.replace(/[^0-9\.-]+/g, ""));

    const colStart = 10, rowStart = 5; // K6
    const colEnd = 29, rowEnd = 199; // AD200
    const cell = await this.searchForCell({ spreadsheetId, sheetName, rowStart, rowEnd, colStart , colEnd, searchFor });

    if (!cell) throw new Error(`Failed to read any data for "${searchFor}" on the daily sales tracker.`);

    const cupsCol = cell.colIndex + colStart;
    const cupsRow = cell.rowIndex + rowStart + 4;
    const cupsRange = `${sheetName}!${this.serializeToGSheetsCellAddress({ col: cupsCol, row: cupsRow })}`;
    const { value: cupsValue } = await this.getRangeValue<string>({ spreadsheetId, range: cupsRange });

    const totalsRow = cell.rowIndex + rowStart + 7;

    const cohCol = cell.colIndex + colStart;
    const cohRange = `${sheetName}!${this.serializeToGSheetsCellAddress({ col: cohCol, row: totalsRow })}`;
    const { value: cohValue } = await this.getRangeValue<string>({ spreadsheetId, range: cohRange });

    const gCashCol = cell.colIndex + colStart + 1;
    const gCashRange = `${sheetName}!${this.serializeToGSheetsCellAddress({ col: gCashCol, row: totalsRow })}`;
    const { value: gCashValue } = await this.getRangeValue<string>({ spreadsheetId, range: gCashRange });

    const hasNull = [cupsValue, cohValue, gCashValue].some(value => value === null);
    if (hasNull) throw new Error(`Failed to get COH / GCASH data for "${searchFor}" on the daily sales tracker.`);

    const bmPct = 0.3
    const cups = cupsValue.split(" / ").map(i => +i).reduce((a,c) => a + c);
    const bmCups = Math.floor(cups - (cups * (bmPct + 0.05)));
    const total = parseAmounts(cohValue) + parseAmounts(gCashValue);
    const bmTotal = new Intl.NumberFormat('en-US').format(total - (total * bmPct));

    return { total, bmTotal, cups, bmCups, date: day.toFormat(FORMATS.MONTH_DAY_YEAR) };
  }
}
