import os from "os";
import { distance } from "fastest-levenshtein";

import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { createDate, Format } from "~/fixtures/utils/date.utils";
import { EscapeSequence, unescapeJsonRestricted } from "~/fixtures/utils/string.utils";

import type { DateTime } from "luxon";
import type {
  InventoryFetchSheetProductInfo,
  InventoryInfo,
  InventoryOrderInfo,
  InventorySheetUpdateInfo
} from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export class InventoryManagementSheetService extends GSheetsService {

  protected spreadsheetId = this.parameters.env.GSHEETS_SI_INVENTORY_TRACKER_ID;
  private tabs = {
    master: "Master",
    remaining: "Remaining",
    borrowed: "Borrowed",
    arriving: "Arriving",
    ordered: "Ordered",
    usage: "Usage",
    forecast: "Forecast"
  };
  private functions = {
    nextDeliveryDate: "=F_NEXT_ORDER_DELIVERY_DATE(0)"
  };
  private ranges = {
    R_NODE_DATE_RANGE: "R_NODE_DATE_RANGE",
    R_NODE_PRODUCTS: "R_NODE_PRODUCTS",
    R_NODE_DATA_ORDERED: "R_NODE_DATA_ORDERED",
    R_REF_PRODUCTS: "R_REF_PRODUCTS",
    R_REF_PRODUCTS_UNITS_INTERNAL: "R_REF_PRODUCTS_UNITS_INTERNAL",
    R_REF_PRODUCTS_UNITS_PORTAL: "R_REF_PRODUCTS_UNITS_PORTAL",
    R_REF_PRODUCTS_MIN_ORDER: "R_REF_PRODUCTS_MIN_ORDER",
    R_REF_PRODUCTS_UNITS_RATIO: "R_REF_PRODUCTS_UNITS_RATIO",
    R_MASTER_CUST_NAME: "R_MASTER_CUST_NAME",
    R_MASTER_ORDER_SCHEDULE_DATE: "R_MASTER_ORDER_SCHEDULE_DATE",
    R_MASTER_ORDER_DELIVER_DATE: "R_MASTER_ORDER_DELIVER_DATE",
    R_MASTER_ORDER_SHIPPING_METHOD: "R_MASTER_ORDER_SHIPPING_METHOD",
    R_MASTER_ORDER_QTY: "R_MASTER_ORDER_QTY",
    R_MASTER_ORDER_RATIO_ERROR: "R_MASTER_ORDER_RATIO_ERROR",
    R_MASTER_ADHOC_ORDER_PRODUCTS: "R_MASTER_ADHOC_ORDER_PRODUCTS",
    R_MASTER_ADHOC_ORDER_QTY: "R_MASTER_ADHOC_ORDER_QTY",
    R_MASTER_TO_ORDER_QTY_PORTAL: "R_MASTER_TO_ORDER_QTY_PORTAL"
  };

  private updateProductNote = (note: string, sign: string) => `${note}\n\nSigned: ${sign}`;

  private async assertItemsVsQty({ items, qty }: { items: string[], qty: string[], }) {
    await this.page.expect({ timeout: 1000 })
      .setName("Number of products matches quantity")
      .equals(items.length, qty.length).poll();
  }

  private async fetchMasterSheetProductsInfo(range: string) {
    const sheetName = this.tabs.master;
    const { values } = await this.fetchRangeContents({ sheetName, range });

    const items = values?.flat().map(i => i.trim()).filter(Boolean) || [];
    return items;
  }

  private async fetchNodeSheetProductsInfo({ sheetName, range }: InventoryFetchSheetProductInfo) {
    const { values } = await this.fetchRangeContents({ sheetName, range });

    const items = values.flat().map(i => i.trim()).filter(Boolean);
    return items;
  }

  private async fetchFixedItemsToOrder() {
    const items = await this.fetchListOfProducts();
    const qty = await this.fetchMasterSheetProductsInfo(this.ranges.R_MASTER_ORDER_QTY);
    await this.assertItemsVsQty({ items, qty });

    const result = items.map((item, idx) => ({ name: item, value: qty[idx] }));
    return result;
  }

  private async fetchAdhocItemsToOrder() {
    const items = await this.fetchMasterSheetProductsInfo(this.ranges.R_MASTER_ADHOC_ORDER_PRODUCTS);
    const qty = await this.fetchMasterSheetProductsInfo(this.ranges.R_MASTER_ADHOC_ORDER_QTY);
    await this.assertItemsVsQty({ items, qty });

    const result = items.map((item, idx) => ({ name: item, value: qty[idx] }));
    return result;
  }

  private async fetchNextDeliveryDate() {
    const sheetName = this.tabs.master;
    const { value: deliveryDate } = await this.fetchRangeContents({ sheetName, range: this.ranges.R_MASTER_ORDER_DELIVER_DATE });

    const { date: result } = createDate({ from: [deliveryDate, Format.DATE_SHORT_DMC] });
    return result;
  }

  private async fetchShippingMethod() {
    const sheetName = this.tabs.master;
    const { value: method } = await this.fetchRangeContents({ sheetName, range: this.ranges.R_MASTER_ORDER_SHIPPING_METHOD });

    return method;
  }

  private async fetchCustomerName() {
    const sheetName = this.tabs.master;
    const { value: customerName } = await this.fetchRangeContents({ sheetName, range: this.ranges.R_MASTER_CUST_NAME });

    return customerName;
  }

  private async fetchOrderError() {
    const sheetName = this.tabs.master;
    const { values: errors = [[]] } = await this.fetchRangeContents({ sheetName, range: this.ranges.R_MASTER_ORDER_RATIO_ERROR });

    return errors.flat().map(i => i.trim()).filter(Boolean);
  }

  private async findCellFor({ sheetName, date }) {
    const searchForDate = date.toFormat(Format.DATE_SHORT_DMY);
    const { address: range } = await this.fetchNamedRangeInfo({ name: this.ranges.R_NODE_DATE_RANGE });
    const { address: searchRangeForDate } = this.unpackRange({ range });
    const cell = await this.findCell({ sheetName, searchRange: searchRangeForDate, searchFor: searchForDate });
    return cell;
  }

  async fetchOrderInfo() {
    const { date: orderDate } = createDate();
    const orderedBy = unescapeJsonRestricted(this.parameters.webhook) || os.userInfo().username;
    const details: PromiseSettledResult<any>[] = await Promise.allSettled([
      this.fetchFixedItemsToOrder(),
      this.fetchAdhocItemsToOrder(),
      this.fetchNextDeliveryDate(),
      this.fetchShippingMethod(),
      this.fetchCustomerName(),
      this.fetchOrderError()
    ]);

    const [products, adhoc, deliveryDate, method, customerName, errors] = await this.fulfilled(details);
    return { products, adhoc, orderDate, deliveryDate, method, customerName, orderedBy, errors } as InventoryOrderInfo;
  }

  async fetchListOfProducts() {
    const items = await this.fetchMasterSheetProductsInfo(this.ranges.R_REF_PRODUCTS);
    return items;
  }

  async fetchProductSheetInventoryInfoFor(date: DateTime, tab: string) {
    const sheetName = this.tabs[tab];
    const { address: dateAddress } = await this.findCellFor({ sheetName, date });
    const { startCol } = this.unpackRange({ range: dateAddress });

    const { address: range } = await this.fetchNamedRangeInfo({ name: this.ranges.R_NODE_PRODUCTS });
    const { startRow, endRow } = this.unpackRange({ range });

    const qtyRange = this.packRange({ startCol, startRow, endRow });
    const { values: qty } = await this.fetchRangeContents({ sheetName, range: qtyRange });
    const products = await this.fetchListOfProducts();

    const info = products.map((product, idx) => ({ name: product, value: qty[idx][0] }));
    return info;
  }

  async updateProductsSheet({ date, sheetName, products, note }: InventorySheetUpdateInfo) {
    const { col, row: headerRow } = await this.findCellFor({ sheetName, date });
    const sheetId = await this.fetchWorksheetId({ sheetName });

    if (note) {
      const address = this.serializeToGSheetsCellAddress({ col, row: headerRow + 4 });
      await this.insertNote({ sheetName, address, note });
    }

    const { address: searchRange } = await this.fetchNamedRangeInfo({ name: this.ranges.R_NODE_PRODUCTS });
    const searchFor = products.map(v => v.name);
    const searchResult = await this.findCells({ sheetName, searchRange, searchFor });

    const requests = searchResult.filter(Boolean).map(({ row, value: name }) => {
      const value = products.find(product => product.name === name)?.value;
      return this.batchUpdateUserEnteredNumberValueRequest({ sheetId, row, col, value: +value });
    });

    const requestBody = { requests };
    await this.batchUpdate({ requestBody });
  }

  async updateRemainingInventoryFor(date: DateTime) {
    const { remaining: products } = this.parameters.gsheets.inventory;
    const sheetName = this.tabs.remaining;

    await this.updateProductsSheet({ date, sheetName, products });
  }

  async updateOrderedInventoryFor(date: DateTime) {
    const { products, por, orderedBy } = this.parameters.gsheets.inventory.order;
    const note = this.updateProductNote(por, orderedBy);

    const sheetName = this.tabs.ordered;
    await this.updateProductsSheet({ date, sheetName, products, note });
  }

  async updateArrivingInventoryFor(date: DateTime) {
    const { por, orderedBy } = this.parameters.gsheets.inventory.order;
    const note = this.updateProductNote(por, orderedBy);
    const items = await this.fetchNodeSheetProductsInfo({ sheetName: this.tabs.ordered, range: this.ranges.R_NODE_PRODUCTS });
    const qty = await this.fetchNodeSheetProductsInfo({ sheetName: this.tabs.ordered, range: this.ranges.R_NODE_DATA_ORDERED });
    const products = items.map((item, idx) => ({ name: item, value: qty[idx] }));

    const sheetName = this.tabs.arriving;
    await this.updateProductsSheet({ date, sheetName, products, note });
  }

  async hideColumnsUntil(date: DateTime) {
    const { col: endIndex } = await this.findCellFor({ sheetName: this.tabs.remaining, date });
    const { address: range } = await this.fetchNamedRangeInfo({ name: this.ranges.R_NODE_DATE_RANGE });
    const { address } = this.unpackRange({ range });
    const { col } = this.deserializeGSheetsCellAddress(address);
    const [startIndex] = col;

    if (endIndex !== undefined) {
      const sheetNames = Object.values(this.tabs).filter(value => value !== this.tabs.master);
      const sheetIds = await Promise.allSettled(sheetNames
        .map(async(sheetName: string) => {
          return this.fetchWorksheetId({ sheetName });
        }));

      const result = await this.fulfilled(sheetIds);
      const requests = result.map(sheetId => this.batchUpdateHideColumnsRequest({ sheetId, startIndex, endIndex }));

      const requestBody = { requests };
      await this.batchUpdate({ requestBody });
    }
  }

  async revertMasterSheetFormulas() {
    const sheetName = this.tabs.master;
    const sheetId = await this.fetchWorksheetId({ sheetName });
    const { startAddress } = await this.fetchNamedRangeInfo({ name: this. ranges.R_MASTER_ORDER_DELIVER_DATE });

    const arrivalDateRange = this.singleCellAddressToIndex(startAddress);
    const arrivalDateRevertRequest = this.batchUpdateUserEnteredFormulaValueRequest(
      { sheetId, row: arrivalDateRange.row, col: arrivalDateRange.col, value: this.functions.nextDeliveryDate }
    );

    const { address: toOrder } = await this.fetchNamedRangeInfo({ name: this. ranges.R_MASTER_TO_ORDER_QTY_PORTAL });
    const { address: ordered } = await this.fetchNamedRangeInfo({ name: this. ranges.R_MASTER_ORDER_QTY });
    const { startRow, endRow, startCol: colToUpdate } = this.unpackRange({ range: ordered });
    const { startCol: colToRefer } = this.unpackRange({ range: toOrder });

    const productsStartRow = +startRow; const productsEndRow = +endRow;
    const productsRows = Array.from({ length: productsEndRow - productsStartRow + 1 }, (_, i) => i + productsStartRow);
    const productsOrderQtyRange = productsRows.map(v => this.singleCellAddressToIndex(`${colToUpdate}${v}`));
    const productsOrderQtyFormulas = productsRows.map(v => `=${colToRefer}${v}`);
    const productsRevertOrderQtyRequests = productsOrderQtyRange
      .map(({ row, col }, idx) => {
        return this.batchUpdateUserEnteredFormulaValueRequest({ sheetId, row, col, value: productsOrderQtyFormulas[idx] });
      });

    const cleanedRevertOrderQtyRequests = productsRevertOrderQtyRequests.slice(0, -2);
    const requests = [arrivalDateRevertRequest, ...cleanedRevertOrderQtyRequests];

    const requestBody = { requests };
    await this.batchUpdate({ requestBody });
  }

  async clearAdhocItems() {
    const hasAdhocItems = this.parameters.gsheets.inventory.order.adhoc.length > 0;
    if (hasAdhocItems) {
      await this.clearRangeContents({ range: this.ranges.R_MASTER_ADHOC_ORDER_PRODUCTS });
      await this.clearRangeContents({ range: this.ranges.R_MASTER_ADHOC_ORDER_QTY });
    }
  }

  async getRemainingItemsFromWebhook() {
    const input = unescapeJsonRestricted(this.parameters.webhook).split(EscapeSequence.LF[0]);
    const items = this.parameters.gsheets.inventory.products;
    const defaultValue = "0";

    const normalize = (text: string) => text.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const findBestMatch = (name: string, filters: string[]) => {
      const normalizedName = normalize(name);

      // try partial matches first
      for (const filter of filters) {
        const normalizedFilter = normalize(filter);
        if (normalizedName.includes(normalizedFilter) || normalizedFilter.includes(normalizedName)) {
          return filter;
        }
      }

      // fallback: fuzzy match
      for (const filter of filters) {
        const normalizedFilter = normalize(filter);
        const score = distance(normalizedName, normalizedFilter);
        if (score <= 3) {
          return filter;
        }
      }
    };
    const splitProductLine = (line: string) => {
      const lastEqual = line.lastIndexOf("=");
      const lastDash = line.lastIndexOf("-");
      const splitIndex = Math.max(lastEqual, lastDash);

      if (splitIndex === -1) return null; // not a valid product line
      const rawName = line.slice(0, splitIndex).trim();
      const rawValue = line.slice(splitIndex + 1).trim();

      return [rawName, rawValue];
    };
    const buildInventoryData = (input: string[], filters: string[]) => {
      const output: InventoryInfo[] = [];
      for (const line of input) {
        const split = splitProductLine(line);
        if (!split) continue; // skip non-product lines

        const [rawName, rawValue] = split;
        const name = findBestMatch(rawName, filters);

        if (name) {
          const numericMatch = rawValue.match(/\d+/);
          const value = numericMatch ? numericMatch[0] : defaultValue;
          output.push({ name, value });
        }
      }
      return output;
    };

    const remaining = buildInventoryData(input, items);
    const missing = items.filter(v => !remaining.map(({ name }) => name).includes(v))
      .map(name => ({ name, value: defaultValue }));

    await this.page.expect({ timeout: 1 })
      .setName("Expected inventory data to be parsed correctly")
      .truthy(missing.length !== items.length, { missing: items }).poll();
    return { remaining, missing };
  }

}
