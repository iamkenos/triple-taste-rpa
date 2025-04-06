import { google } from "googleapis";
import { DateTime } from "luxon";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";
import { GAppsScript } from "~/fixtures/services/gappsscript/gappsscript.service";
import { FORMATS, getDate, isSameCalendarDay } from "~/fixtures/utils/date";

type SheetInfo = {
  spreadsheetId: string;
  sheetName?: string;
  sheetId?: number
}

type PaySlipsInfo = {
  jobInfoSection: {
    staffId: string;
    position: string;
    dailyRate: string;
  };
  recipientSection: {
    staffName: string;
    emailAddress: string;
    address: string;
    account: string;
    driveId: string;
  };
  payCycleSection: {
    frequency: string;
    number: string;
    period: string;
    retroAdjustments: string;
  };
  workHoursSection: {
    baseHours: string;
    overtimeHours: string;
    nightHours: string;
    totalHours: string;
  };
  earningsSection: {
    ytd: string;
    basePay: string;
    overtimePay: string;
    nightPay: string;
    tntMonthPay: string;
    holidayPay: string;
    otherAdjustments: string;
    grossPay: string;
  };
  fullTimeSheet: string;
  staffTimeSheet: string;
}[]

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

  private singleCellAddressToIndex(cell: string) {
    const colMatch = cell.match(/^([A-Z]+)/);
    const rowMatch = cell.match(/(\d+)$/);

    if (!colMatch || !rowMatch) {
      return null; // invalid single cell format
    }

    const colStr = colMatch[1];
    const rowStr = rowMatch[1];

    let colIndex = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    // adjust to 0-based index
    const rowIndex = parseInt(rowStr, 10) - 1;
    const colIndexZeroBased = colIndex - 1;
    return { col: colIndexZeroBased, row: rowIndex };
  }

  private deserializeGSheetsCellAddress(address: string) {
    const parts = address.toUpperCase().split(":");
    const start = parts[0];
    const end = parts.length > 1 ? parts[1] : start;

    const startCoords = this.singleCellAddressToIndex(start);
    const endCoords = this.singleCellAddressToIndex(end);

    if (!startCoords || !endCoords) {
      return null; // invalid address format
    }

    const minCol = Math.min(startCoords.col, endCoords.col);
    const maxCol = Math.max(startCoords.col, endCoords.col);
    const minRow = Math.min(startCoords.row, endCoords.row);
    const maxRow = Math.max(startCoords.row, endCoords.row);

    const cols = [];
    for (let i = minCol; i <= maxCol; i++) {
      cols.push(i);
    }

    const rows = [];
    for (let i = minRow; i <= maxRow; i++) {
      rows.push(i);
    }

    return { col: cols, row: rows };
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

  private async getSheetNames({ spreadsheetId, filter }: SheetInfo & { filter?: CallableFunction }) {
    try {
      const { connection } = this.sheets;
      const response = await connection.spreadsheets.get({ spreadsheetId });
      const sheets = response.data.sheets;

      if (sheets) {
        let worksheetNames = sheets.map((sheet) => sheet.properties.title);
        if (filter) {
          worksheetNames = worksheetNames.filter(filter  as any)
        }

        return worksheetNames;
      } else {
        throw [];
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

  private async getRangeValue({ spreadsheetId, range, filter }: SheetInfo & { range: string, filter?: CallableFunction }) {
    const { connection } = this.sheets;
    const response = await connection.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    let values: string[][] = response.data.values;
    if (filter) {
      values = values.filter(filter as any);
    }

    const value: string = values?.[0]?.[0] || null;
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

    const filterTitle = `${from.year} ${from.monthShort} Expenses`;
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
                  // 1: {
                  //   condition: {
                  //     type: "TEXT_NOT_EQ",
                  //     values: [
                  //       { userEnteredValue: "Salary Internal" },
                  //     ],
                  //   },
                  // },
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
    const { value: cupsValue } = await this.getRangeValue({ spreadsheetId, range: cupsRange });

    const dcCol = cell.colIndex + colStart;
    const dcRow = cell.rowIndex + rowStart + 6;
    const dcRange = `${sheetName}!${this.serializeToGSheetsCellAddress({ col: dcCol, row: dcRow })}`;
    const { value: dcValue } = await this.getRangeValue({ spreadsheetId, range: dcRange });

    const totalsRow = cell.rowIndex + rowStart + 7;

    const cohCol = cell.colIndex + colStart;
    const cohRange = `${sheetName}!${this.serializeToGSheetsCellAddress({ col: cohCol, row: totalsRow })}`;
    const { value: cohValue } = await this.getRangeValue({ spreadsheetId, range: cohRange });

    const gCashCol = cell.colIndex + colStart + 1;
    const gCashRange = `${sheetName}!${this.serializeToGSheetsCellAddress({ col: gCashCol, row: totalsRow })}`;
    const { value: gCashValue } = await this.getRangeValue({ spreadsheetId, range: gCashRange });

    const hasNull = [cupsValue, dcValue, cohValue, gCashValue].some(value => value === null);
    if (hasNull) throw new Error(`Failed to get COH / GCASH data for "${searchFor}" on the daily sales tracker.`);

    const sumBreakdown = (breakdown: string) => breakdown.split(" / ").map(i => +i).reduce((a,c) => a + c);
    const fmtAmount = (amount: number) => new Intl.NumberFormat('en-US').format(amount);
    const bmPct = 0.3;
    const cups = sumBreakdown(cupsValue);
    const discounts = sumBreakdown(dcValue);
    const bmCups = Math.floor(cups - (cups * (bmPct + 0.05)));
    const total = parseAmounts(cohValue) + parseAmounts(gCashValue);
    const bmTotal = total - (total * bmPct);
    const grandTotal = bmTotal - discounts;

    return { total,
      cups, bmCups,
      bmTotal: fmtAmount(bmTotal),
      discounts: fmtAmount(discounts),
      grandTotal: fmtAmount(grandTotal),
      date: day.toFormat(FORMATS.MONTH_DAY_YEAR) };
  }

  async getPayslipsInfo(date: DateTime): Promise<PaySlipsInfo> {
    const { GSHEETS_PAYROLL_ID } = process.env;
    const spreadsheetId = GSHEETS_PAYROLL_ID;
    const filter = (i: string) => i.startsWith("TTPC");
    let payslipInfo = [];

    const sheetNames = await this.getSheetNames({ spreadsheetId, filter });
    if (sheetNames.length > 0) {
      const { value: cycle } = await this.getRangeValue({ spreadsheetId, range: `${sheetNames.find(Boolean)}!K2` });
      const { value: forDt } = await this.getRangeValue({ spreadsheetId, range: `${sheetNames.find(Boolean)}!K4` });
      const payAdviceSchedule = getDate({ from: [forDt, "LLL d, yyyy"], offset: { day: -1 }}).date; // 1 day before end of pay cycle
      const shouldProceed = isSameCalendarDay(date, payAdviceSchedule);

      if (shouldProceed) {
        const dropTimeSheetIndex = (timesheet: string[][], index: number) => {
          return timesheet.map(innerArray => {
            if (innerArray.length > index) {
              const newInnerArray = [...innerArray];
              newInnerArray.splice(index, 1);
              return newInnerArray;
            } else {
              return innerArray;
            }
          });
        }
        const toTimeSheetStr = (timesheet: string[][]) => {
          const [header, ...data] = timesheet;
          const timesheetStr = `
            <tr class="timesheet timesheet-header">${header.map(i => `<td>${i}</td>`).join("")}</tr>
            ${data.map(i => i.map(j => `<td>${j}</td>`).join("")).
              map(i => i.includes("Sat") || i.includes("Sun")
                ? `<tr class="timesheet timesheet-weekend">${i}</tr>`
                : `<tr>${i}</tr>`).join("")}`;
          return timesheetStr;
        }

        for (let i = 0; i < sheetNames.length; i++) {
          const sheetName = sheetNames[i];
          const { values: employeeInfo } = await this.getRangeValue({ spreadsheetId, range: `${sheetName}!B2:D9` });
          const { values: payCycleInfo } = await this.getRangeValue({ spreadsheetId, range: `${sheetName}!J2:K9` });
          const { values: workHoursInfo } = await this.getRangeValue({ spreadsheetId, range: `${sheetName}!N2:O9` });
          const { values: payoutInfo } = await this.getRangeValue({ spreadsheetId, range: `${sheetName}!R2:S9` });
          const { values: timesheet } = await this.getRangeValue({ spreadsheetId, range: `${sheetName}!B11:T410` });

          const jobInfoSection = {
            staffId: employeeInfo[1][2],
            position: employeeInfo[3][2],
            dailyRate: payCycleInfo[3][1],
          }

          const recipientSection = {
            staffName: employeeInfo[2][2],
            emailAddress: employeeInfo[5][2],
            address: employeeInfo[6][2],
            account: `${employeeInfo[7][0].split(":").at(0)} @ ${employeeInfo[7][2]}`,
            driveId: `${payCycleInfo[7][1].split("/").at(-1)}`,
          }

          const payCycleSection = {
            frequency: "Fortnightly",
            number:  `${date.year}-${payCycleInfo[0][1]}`,
            period: `${payCycleInfo[1][1]} to ${payCycleInfo[2][1]}`,
            retroAdjustments: payCycleInfo[5][1],
          }

          const workHoursSection = {
            baseHours: workHoursInfo[0][1],
            overtimeHours: workHoursInfo[1][1],
            nightHours: workHoursInfo[2][1],
            totalHours: workHoursInfo[3][1],
          }

          const earningsSection = {
            ytd: payCycleInfo[6][1],
            basePay: payoutInfo[0][1],
            overtimePay: payoutInfo[1][1],
            nightPay: payoutInfo[2][1],
            tntMonthPay: payoutInfo[3][1],
            holidayPay: payoutInfo[4][1],
            otherAdjustments: payoutInfo[5][1],
            grossPay: payoutInfo[6][1],
          }

          const [header1, header2, ...rest] = timesheet;
          const header = header2.map((v,i) => {
            if (i < 5) return header2[i];
            else if ([10,12,14,16,18].includes(i)) return `${header1[i-1]} ${header2[i]}`;
            else return `${header1[i]} ${header2[i]}`;
          })
          const filtered = rest.filter((i: string[]) => i[5] === cycle).map(i => i.concat(Array(Math.max(header.length - i.length, 0)).fill("")));
          const timesheetData = dropTimeSheetIndex([header, ...filtered], 5);
          const fullTimeSheet = toTimeSheetStr(timesheetData);
          const staffTimeSheet = toTimeSheetStr(timesheetData.map(i => i.map((j,idx) => { if ([0,1,2,3,4].includes(idx)) return j }).filter(i => i !== undefined)));
          payslipInfo.push({ jobInfoSection, recipientSection, payCycleSection, workHoursSection, earningsSection, fullTimeSheet, staffTimeSheet })
        }
      }
    }

    return payslipInfo;
  }
}
