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
    nextDeliveryDate: "=F_NEXT_ORDER_DELIVERY_DATE()"
  };
  private ranges = {
    dates: "H2:NU2",
    nodeProducts: "A6:A40",
    masterProductsName: "R_PRODUCTS",
    masterProductsOrdered: "R_PRODUCTS_ORDERED",
    masterOrderDropDate: "R_ORDER_DROP_DATE",
    masterOrderScheduleDate: "R_ORDER_SCHEDULE_DATE",
    masterOrderShippingMethod: "R_ORDER_SHIPPING_METHOD",
    masterOrderCustomerName: "R_ORDER_CUST_NAME",
    dataOrdered: "R_DATA_ORDERED"
  };

  private updateProductNote = (note: string, sign: string) => `${note}\n\nSigned: ${sign}`;

  private async fetchMasterSheetProductsInfo(range: string) {
    const sheetName = this.tabs.master;
    const { values } = await this.fetchRangeContents({ sheetName, range });

    const items = values.flat().map(i => i.trim()).filter(Boolean);
    return items;
  }

  private async fetchNodeSheetProductsInfo({ sheetName, range }: InventoryFetchSheetProductInfo) {
    const { values } = await this.fetchRangeContents({ sheetName, range });

    const items = values.flat().map(i => i.trim()).filter(Boolean);
    return items;
  }

  private async fetchItemsToOrder() {
    const items = await this.fetchListOfProducts();
    const qty = await this.fetchMasterSheetProductsInfo(this.ranges.masterProductsOrdered);

    await this.page.expect({ timeout: 1000 })
      .setName("Number of products matches quantity")
      .equals(items.length, qty.length).poll();

    const result = items.map((item, idx) => ({ name: item, value: qty[idx] }));
    return result;
  }

  private async fetchNextDeliveryDate() {
    const sheetName = this.tabs.master;
    const { value: deliveryDate } = await this.fetchRangeContents({ sheetName, range: this.ranges.masterOrderDropDate });

    const { date: result } = createDate({ from: [deliveryDate, Format.DATE_SHORT_DMC] });
    return result;
  }

  private async fetchShippingMethod() {
    const sheetName = this.tabs.master;
    const { value: method } = await this.fetchRangeContents({ sheetName, range: this.ranges.masterOrderShippingMethod });

    return method;
  }

  private async fetchCustomerName() {
    const sheetName = this.tabs.master;
    const { value: customerName } = await this.fetchRangeContents({ sheetName, range: this.ranges.masterOrderCustomerName });

    return customerName;
  }

  private async findCellFor({ sheetName, date }) {
    const searchForDate = date.toFormat(Format.DATE_SHORT_DMY);
    const searchRangeForDate = this.ranges.dates;
    const cell = await this.findCell({ sheetName, searchRange: searchRangeForDate, searchFor: searchForDate });
    return cell;
  }

  async fetchOrderInfo() {
    const { date: orderDate } = createDate();
    const orderedBy = unescapeJsonRestricted(this.parameters.webhook);
    const details: PromiseSettledResult<any>[] = await Promise.allSettled([
      this.fetchItemsToOrder(),
      this.fetchNextDeliveryDate(),
      this.fetchShippingMethod(),
      this.fetchCustomerName()
    ]);

    const [products, deliveryDate, method, customerName] = await this.fulfilled(details);
    return { products, orderDate, deliveryDate, method, customerName, orderedBy } as InventoryOrderInfo;
  }

  async fetchListOfProducts() {
    const items = await this.fetchMasterSheetProductsInfo(this.ranges.masterProductsName);
    return items;
  }

  async fetchProductSheetInventoryInfoFor(date: DateTime, tab: string) {
    const sheetName = this.tabs[tab];
    const { address } = await this.findCellFor({ sheetName, date });

    const qtyRange = this.ranges.nodeProducts.replaceAll(/[A-Z]/g, address.replaceAll(/[0-9]/g, ""));
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

    const searchRange = this.ranges.nodeProducts;
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
    const items = await this.fetchNodeSheetProductsInfo({ sheetName: this.tabs.ordered, range: this.ranges.nodeProducts });
    const qty = await this.fetchNodeSheetProductsInfo({ sheetName: this.tabs.ordered, range: this.ranges.dataOrdered });
    const products = items.map((item, idx) => ({ name: item, value: qty[idx] }));

    const sheetName = this.tabs.arriving;
    await this.updateProductsSheet({ date, sheetName, products, note });
  }

  async revertMasterSheetFormulas() {
    const sheetName = this.tabs.master;
    const sheetId = await this.fetchWorksheetId({ sheetName });

    const arrivalDateRange = this.singleCellAddressToIndex("D7");
    const arrivalDateRevertRequest = this.batchUpdateUserEnteredFormulaValueRequest(
      { sheetId, row: arrivalDateRange.row, col: arrivalDateRange.col, value: this.functions.nextDeliveryDate }
    );

    const productsStartRow = 11; const productsEndRow = 39;
    const productsRows = Array.from({ length: productsEndRow - productsStartRow + 1 }, (_, i) => i + productsStartRow);
    const productsOrderQtyRange = productsRows.map(v => this.singleCellAddressToIndex(`B${v}`));
    const productsOrderQtyFormulas = productsRows.map(v => `=R${v}`);
    const productsRevertOrderQtyRequests = productsOrderQtyRange
      .map(({ row, col }, idx) => {
        return this.batchUpdateUserEnteredFormulaValueRequest({ sheetId, row, col, value: productsOrderQtyFormulas[idx] });
      });

    const cleanedRevertOrderQtyRequests = productsRevertOrderQtyRequests.slice(0, -2);
    const requests = [arrivalDateRevertRequest, ...cleanedRevertOrderQtyRequests];

    const requestBody = { requests };
    await this.batchUpdate({ requestBody });
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
