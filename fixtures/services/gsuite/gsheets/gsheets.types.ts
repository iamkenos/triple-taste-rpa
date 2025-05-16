import type { DateTime } from "luxon";

export type WorkbookResource = {
  /** the workbook id */
  spreadsheetId?: string;
  /** the worksheet that's existing in the workbook */
  sheetName?: string;
  /** the worksheet id that's existing in the workbook */
  sheetId?: number;
  /** the filter view name that's existing in a worksheet */
  viewName?: string;
  /** the filter view id that's existing in a worksheet */
  viewId?: number;
};

export type WorkbookBatchUpdateInfo = {
  /** the request body metadata */
  requestBody: any;
};

export type WorkbookFetchSheetsFilter = {
  filter?: (resource: Pick<WorkbookResource, "sheetName" | "sheetId">) => boolean;
};

export type UpdateRangeContentInfo = {
  /** the range to udpate; e.g. A1:E21 */
  range: string;
  /** the values to enter in the range provided */
  values: any[];
} & Required<Pick<WorkbookResource, "sheetName">>;

export type FetchRangeContentInfo = {
  /** the range to fetch; e.g. A1:E21 */
  range: string;
  filter?: () => boolean;
} & Required<Pick<WorkbookResource, "sheetName">>;

export type FetchNamedRangeData = {
  /** the starting cell address */
  startAddress: string;
  /** the ending cell address */
  endAddress: string;
  /** the cell address */
  address: string;
} & Required<Pick<WorkbookResource, "sheetName">>;

export type PackRangeInfo = {
  /** the cell address start row; e.g. 1 from A1 */
  startRow: string;
  /** the cell address start col; e.g. A from A1 */
  startCol: string;
  /** the cell address end row; e.g. 21 from A1:E21 */
  endRow?: string;
  /** the cell address end col; e.g. E from A1:E21 */
  endCol?: string;
};

export type UnpackRangeInfo = {
  /** the range to split; e.g. A1:E21 or 'Sheet Name'!A1:E21 */
  range: string;
};

export type UnpackRangeData = PackRangeInfo & FetchNamedRangeData;

export type FindIn = {
  /** the cell content to search for */
  searchFor: string;
  /** whether to do partial matching on find */
  partialMatch?: boolean;
  /** the values to search from */
  values: string[][];
};

export type FindCellInfo = {
  /** the search range; e.g. A1:E21 */
  searchRange: string;
} & Required<Pick<WorkbookResource, "sheetName">>
  & Pick<FindIn, "partialMatch" | "searchFor">;

export type FindCellsInfo = {
  searchFor: string[];
} & Omit<FindCellInfo, "searchFor">;

export type BatchUpdateUserEnteredValueRequestInfo = {
  type: "number" | "formula" | "string";
  /** the value to update */
  value: string | number;
} & Required<Pick<WorkbookResource, "sheetId">>
  & Pick<FindCellData, "row" | "col">;

export type BatchHideColumnsRequestInfo = {
  /** the value to update */
  startIndex: number;
  endIndex: number;
} & Required<Pick<WorkbookResource, "sheetId">>

export type FindCellData = {
  /** the 0-based row index */
  row: number;
  /** the 0-based column index */
  col: number;
  /** the cell address */
  address: string;
  /** the cell value */
  value: string;
};

export type FindCellsData = FindCellData[];

export type DailySales = {
  /** the previous working date */
  date: DateTime;
  /** the previous working day */
  referenceDate: string;
  /** the number of cups sold */
  qty: number;
  /** the discounts provided */
  dcAmount: number;
  /** the amount earned from cash payments */
  cohAmount: number;
  /** the amount earned from gcash payments */
  gCashAmount: number;
  /** the amount earned from grab transations */
  grabAmount: number;
  /** the amount earned from panda transations */
  pandaAmount: number;
};

export type DailySalesInvoiceData = {
  /** the adjusted number of cups */
  adjQty: number;
  /** the adjusted amount */
  adjAmount: number;
  /** the adjusted total */
  adjTotal: number;
} & DailySales;

export type DepositData = {
  /** the expected deposit amount */
  amount: string;
  /** the date of deposit */
  date: string;
};

export type StaffPayOutInfo = {
  /** the sheet name where the information was collected */
  sheetName: string;
  /** the sheet datetime instance when the information was extracted */
  asOf: DateTime;
  /** the basic information for this staff */
  employeeInfo: string[][];
  /** the dates and details for this cycle */
  payCycleInfo: string[][];
  /** the work hours calculated for this cycle */
  workHoursInfo: string[][];
  /** the amounts calculated for this cycle */
  payOutInfo: string[][];
  /** the entire time table for this staff */
  timesheetInfo: string[][];
};

export type ExpenseAndRevenueInfo = {
  /** the date */
  date: DateTime;
  /** the category */
  category: string;
  /** the amount */
  amount: number;
  /** the description or comment */
  note: string;
};

export type InventoryInfo = {
  name: string;
  value: string;
};

export type InventoryFetchSheetProductInfo = {
  range: string;
  sheetName: WorkbookResource["sheetName"];
};

export type InventorySheetUpdateInfo = {
  products: InventoryInfo[];
  date: DateTime;
  sheetName: WorkbookResource["sheetName"];
  note?: string;
};

export type InventoryOrderInfo = {
  products: InventoryInfo[];
  orderDate?: DateTime;
  deliveryDate?: DateTime;
  method?: string;
  customerName?: string;
  orderedBy?: string;
  amount?: string;
  por?: string;
  status?: string;
};
