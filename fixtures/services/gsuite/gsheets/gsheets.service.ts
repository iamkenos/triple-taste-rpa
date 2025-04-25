import { google } from "googleapis";
import { DateTime } from "luxon";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";

import type {
  FetchRangeContentInfo,
  FindCellInfo,
  FindCellResult,
  UpdateRangeContentInfo,
  WorkbookBatchUpdateInfo,
  WorkbookFetchSheetsFilter,
  WorkbookResource
} from "./gsheets.types";

export class GSheetsService extends GSuiteService {
  url = "https://www.googleapis.com/auth/spreadsheets";
  title = "";

  protected spreadsheetId = "";
  private sheets = this.connect();

  private connect() {
    const auth = this.auth();
    const connection = google.sheets({ version: "v4", auth });
    return { auth, connection };
  }

  protected async fetchWorksheetId({ sheetName }: WorkbookResource) {
    try {
      const { connection } = this.sheets;
      const spreadsheetId = this.spreadsheetId;
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

  protected async fetchWorksheets({ filter }: WorkbookFetchSheetsFilter = {}) {
    try {
      const { connection } = this.sheets;
      const spreadsheetId = this.spreadsheetId;
      const response = await connection.spreadsheets.get({ spreadsheetId });
      const sheets = response.data.sheets;

      if (sheets) {
        const result = sheets
          .map((sheet) => ({ sheetId: sheet.properties.sheetId, sheetName: sheet.properties.title }))
          .filter(filter ?? (() => true));
        return result;
      } else {
        return [];
      }
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  protected async fetchViews({ sheetId }: WorkbookResource) {
    const { connection } = this.sheets;
    const spreadsheetId = this.spreadsheetId;
    const response = await connection.spreadsheets.get({ spreadsheetId });

    const result = response.data.sheets.find(i => i.properties.sheetId === sheetId)?.filterViews;
    return result;
  }

  protected async fetchViewId({ sheetId, viewName }: WorkbookResource) {
    const filterViews = await this.fetchViews({ sheetId });
    const filterView = filterViews?.find(view => view.title === viewName);
    return filterView ? filterView.filterViewId : undefined;
  }

  protected async batchUpdate({ requestBody }: WorkbookBatchUpdateInfo) {
    const { connection } = this.sheets;
    const spreadsheetId = this.spreadsheetId;
    return await connection.spreadsheets.batchUpdate({ spreadsheetId, requestBody });
  }

  protected serializeToGSheetsDate(date: DateTime) {
    const result = date.toMillis() / (1000 * 60 * 60 * 24) + 25569;
    return result;
  }

  protected singleCellAddressToIndex(cell: string) {
    const colMatch = cell.match(/^([A-Z]+)/);
    const rowMatch = cell.match(/(\d+)$/);

    if (!colMatch || !rowMatch) {
      return null; // invalid single cell format
    }

    const colStr = colMatch[1];
    const rowStr = rowMatch[1];

    let colIndex = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIndex = colIndex * 26 + (colStr.charCodeAt(i) - "A".charCodeAt(0) + 1);
    }
    // adjust to 0-based index
    const rowIndex = parseInt(rowStr, 10) - 1;
    const colIndexZeroBased = colIndex - 1;
    return { col: colIndexZeroBased, row: rowIndex };
  }

  protected deserializeGSheetsCellAddress(address: string) {
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

  protected serializeToGSheetsCellAddress({ col, row }: { col: number, row: number }) {
    let column = "";
    while (col >= 0) {
      column = String.fromCharCode((col % 26) + 65) + column;
      col = Math.floor(col / 26) - 1;
    }

    const result = `${column}${row + 1}`;
    return result;
  }

  protected async fetchRangeContents({ sheetName, range, filter }: FetchRangeContentInfo) {
    const { connection } = this.sheets;
    const spreadsheetId = this.spreadsheetId;

    const fullRange = `${sheetName}!${range}`;
    const response = await connection.spreadsheets.values.get({ spreadsheetId, range: fullRange });
    const values: string[][] = response.data.values.filter(filter ?? (() => true));
    const value: string = values?.[0]?.[0] || null;

    return { values, value };
  }

  protected async findCell({ sheetName, searchRange, searchFor }: FindCellInfo) {
    const [start] = searchRange.split(":");
    const { values } = await this.fetchRangeContents({ sheetName, range: searchRange });
    const { col: colOffset, row: rowOffset } = this.deserializeGSheetsCellAddress(start);

    if (!values) return null;

    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
      for (let colIndex = 0; colIndex < values[rowIndex].length; colIndex++) {
        if (values[rowIndex][colIndex] === searchFor) {
          const col = colIndex + colOffset[0];
          const row = rowIndex + rowOffset[0];
          const address = this.serializeToGSheetsCellAddress({ col, row });
          return { col, row, address } as FindCellResult;
        }
      }
    }

    return null;
  }

  protected async insertRows({ sheetName, startIndex, endIndex }: WorkbookResource & { startIndex: number, endIndex: number }) {
    const spreadsheetId = this.spreadsheetId;

    const sheetId = await this.fetchWorksheetId({ spreadsheetId, sheetName });
    const requestBody = {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex
            }
          }
        },
        {
          copyPaste: {
            source: {
              sheetId,
              startRowIndex: endIndex,
              endRowIndex: endIndex + 1,
              startColumnIndex: 0
            },
            destination: {
              sheetId,
              startRowIndex: startIndex,
              endRowIndex: endIndex,
              startColumnIndex: 0
            },
            pasteType: "PASTE_FORMULA"
          }
        }
      ]
    };

    await this.batchUpdate({ requestBody });
  }

  protected async updateRangeContents({ sheetName, range, values }: UpdateRangeContentInfo) {
    const { connection, auth } = this.sheets;
    const spreadsheetId = this.spreadsheetId;

    const fullRange = `${sheetName}!${range}`;

    try {
      await connection.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: fullRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [values]
        }
      });
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  getWebViewUrl({ sheetId, viewId }: WorkbookResource) {
    const spreadsheetId = this.spreadsheetId;
    const gid = sheetId ? `gid=${sheetId}` : "";
    const fvid = viewId ? `&fvid=${viewId}` : "";
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#${gid}${fvid}`;
  }

  parseAmount(amount: string) {
    return parseFloat(amount.replace(/[^0-9.-]+/g, ""));
  }
}
