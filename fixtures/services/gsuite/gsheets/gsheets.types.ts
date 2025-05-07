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

export type FindCellInfo = {
  /** the search range; e.g. A1:E21 */
  searchRange: string;
  /** the cell content to search for */
  searchFor: string;
  /** whether to do partial matching on find */
  partialMatch?: boolean;
} & Required<Pick<WorkbookResource, "sheetName">>;

export type FindCellResult = {
  /** the 0-based row index */
  row: number;
  /** the 0-based column index */
  col: number;
  /** the cell address */
  address: string;
  /** the cell value */
  value: string;
};

export type DailySales = {
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

export type ExpenseInfo = {
  /** the expense date */
  date: DateTime;
  /** the expense category */
  category: string;
  /** the expense amount */
  amount: number;
  /** the expense description or comment */
  note: string;
};

export type DailyRemainingInventory = {
  name: string;
  value: string;
};

export type ProductsToOrder = DailyRemainingInventory[];

export type OrderDetails = {
  products: ProductsToOrder;
  orderDate: DateTime;
  deliveryDate: DateTime;
  method: string;
  amount?: string;
  por?: string;
  status?: string;
}
