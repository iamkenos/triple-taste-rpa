import { google } from "googleapis";
import { DateTime } from "luxon";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";

import type {
  BatchHideColumnsRequestInfo,
  BatchUpdateUserEnteredValueRequestInfo,
  FetchNamedRangeData,
  FetchRangeContentInfo,
  FindCellData,
  FindCellInfo,
  FindCellsData,
  FindCellsInfo,
  FindIn,
  PackRangeInfo,
  UnpackRangeData,
  UnpackRangeInfo,
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
  protected delimiters = { sheetName: "!", range: ":" };

  private connect() {
    const auth = this.auth();
    const connection = google.sheets({ version: "v4", auth });
    return { auth, connection };
  }

  private findIn({ values, partialMatch, searchFor, colOffset, rowOffset }: FindIn & { colOffset?: number, rowOffset?: number }) {
    if (!values) return null;

    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
      for (let colIndex = 0; colIndex < values[rowIndex].length; colIndex++) {
        const value = values[rowIndex][colIndex];
        const condition = partialMatch ? value.includes(searchFor) : value === searchFor;
        if (condition) {
          const col = colIndex + (colOffset ?? 0);
          const row = rowIndex + (rowOffset ?? 0);
          const address = this.serializeToGSheetsCellAddress({ col, row });

          return { col, row, address, value } as FindCellData;
        }
      }
    }
    return null;
  }

  protected batchUpdateUserEnteredValueRequest({ sheetId, row, col, value, type }: BatchUpdateUserEnteredValueRequestInfo) {
    return {
      updateCells: {
        rows: [
          {
            values: [ { userEnteredValue: { [`${type}Value`]: value } } ]
          }
        ],
        fields: "userEnteredValue",
        start: {
          sheetId,
          rowIndex: row,
          columnIndex: col
        }
      }
    };
  }

  protected batchUpdateHideColumnsRequest({ sheetId, startIndex, endIndex }: BatchHideColumnsRequestInfo) {
    return {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex,
          endIndex
        },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser"
      }
    };
  }

  private splitSheetNameAndAddress({ range }: UnpackRangeInfo) {
    const separator = range.lastIndexOf(this.delimiters.sheetName);
    const sheetNameWrapped = range.substring(0, separator);
    const sheetName = sheetNameWrapped?.replaceAll("'", "");
    const address = range.substring(separator + 1);
    return { sheetName, sheetNameWrapped, address };
  }

  protected unpackRange({ range }: UnpackRangeInfo) {
    const { sheetName, sheetNameWrapped, address } = this.splitSheetNameAndAddress({ range });
    const [start, end] = address.split(":");
    const getCoordinates = (from: string) => ({ col: from?.replaceAll(/[0-9]/g, ""), row: from?.replaceAll(/[A-Z]/g, "") });
    const { col: startCol, row: startRow } = getCoordinates(start);
    const { col: endCol, row: endRow } = getCoordinates(end);
    return { sheetName, sheetNameWrapped, address, startAddress: start, startCol, startRow, endAddress: end, endCol, endRow } as UnpackRangeData;
  }

  protected packRange({ startRow, startCol, endRow, endCol }: PackRangeInfo) {
    const startRange = `${startCol}${startRow}`;
    if (endRow) return `${startRange}${this.delimiters.range}${endCol || startCol}${endRow}`;
    return startRange;
  }

  protected async fetchNamedRangeInfo({ name }: { name: string }) {
    try {
      const { connection } = this.sheets;
      const spreadsheetId = this.spreadsheetId;
      const response = await connection.spreadsheets.get({ spreadsheetId, fields: "namedRanges,sheets.properties" });
      const namedRange = response.data.namedRanges?.find(nr => nr.name === name);

      if (namedRange) {
        const range = namedRange.range;
        const sheet = response.data.sheets?.find(s => s.properties?.sheetId === range?.sheetId);
        const sheetName = sheet.properties?.title;
        const startRow = range?.startRowIndex; const startCol = range?.startColumnIndex;
        const endRow = range?.endRowIndex - 1; const endCol = range?.endColumnIndex - 1;
        const startAddress = this.serializeToGSheetsCellAddress({ row: startRow, col: startCol });
        const endAddress = this.serializeToGSheetsCellAddress({ row: endRow, col: endCol });
        const address = startAddress !== endAddress ? `${startAddress}:${endAddress}` : startAddress;
        return { sheetName, startAddress, endAddress, address } as FetchNamedRangeData;
      } else {
        throw new Error(`Unable to find named range "${name}" sheet from "${spreadsheetId}".`);
      }
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
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

  protected batchUpdateUserEnteredNumberValueRequest({ sheetId, row, col, value }: Omit<BatchUpdateUserEnteredValueRequestInfo, "type">) {
    return this.batchUpdateUserEnteredValueRequest({ sheetId, row, col, value, type: "number" });
  }

  protected batchUpdateUserEnteredStringValueRequest({ sheetId, row, col, value }: Omit<BatchUpdateUserEnteredValueRequestInfo, "type">) {
    return this.batchUpdateUserEnteredValueRequest({ sheetId, row, col, value, type: "string" });
  }

  protected batchUpdateUserEnteredFormulaValueRequest({ sheetId, row, col, value }: Omit<BatchUpdateUserEnteredValueRequestInfo, "type">) {
    return this.batchUpdateUserEnteredValueRequest({ sheetId, row, col, value, type: "formula" });
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

  protected async findCell({ sheetName, searchRange, searchFor, partialMatch }: FindCellInfo) {
    const [start] = searchRange.split(":");
    const { values } = await this.fetchRangeContents({ sheetName, range: searchRange });
    const { col, row } = this.deserializeGSheetsCellAddress(start);
    const [colOffset] = col;
    const [rowOffset] = row;

    const result = this.findIn({ values, searchFor, partialMatch, colOffset, rowOffset }) as FindCellData;
    return result || {} as typeof result;
  }

  protected async findCells({ sheetName, searchRange, searchFor, partialMatch }: FindCellsInfo) {
    const [start] = searchRange.split(":");
    const { values } = await this.fetchRangeContents({ sheetName, range: searchRange });
    const { col, row } = this.deserializeGSheetsCellAddress(start);
    const [colOffset] = col;
    const [rowOffset] = row;

    const result = searchFor.map(v => this.findIn({ values, searchFor: v, partialMatch, colOffset, rowOffset })) as FindCellsData;
    return result;
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
        }
      ]
    };

    await this.batchUpdate({ requestBody });
  }

  protected async clearFilters({ sheetName }: WorkbookResource) {
    const sheetId = await this.fetchWorksheetId({ sheetName });
    const requestBody = {
      requests: [
        {
          clearBasicFilter: { sheetId }
        }
      ]
    };
    await this.batchUpdate({ requestBody });
  }

  protected async insertNote({ sheetName, address, note }: WorkbookResource & { address: string, note: string }) {
    const { col: columnIndex, row: rowIndex } = this.singleCellAddressToIndex(address);
    const sheetId = await this.fetchWorksheetId({ sheetName });
    const requestBody = {
      requests: [
        {
          updateCells: {
            rows: [
              {
                values: [
                  {
                    note
                  }
                ]
              }
            ],
            fields: "note",
            start: {
              sheetId,
              rowIndex,
              columnIndex
            }
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
}
