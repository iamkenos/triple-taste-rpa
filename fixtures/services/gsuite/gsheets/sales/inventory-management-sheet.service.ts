import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { createDate, Format } from "~/fixtures/utils/date.utils";
import { unescapeJsonRestricted } from "~/fixtures/utils/string.utils";

import type { DateTime } from "luxon";
import type { InventoryFetchSheetProductInfo, InventoryOrderInfo, InventorySheetUpdateInfo } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

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

  async updateProductsSheet({ date, sheetName, products, note }: InventorySheetUpdateInfo) {
    const searchForDate = date.toFormat(Format.DATE_SHORT_DMY);
    const searchRangeForDate = this.ranges.dates;
    const sheetId = await this.fetchWorksheetId({ sheetName });
    const { col, row: headerRow } = await this.findCell({ sheetName, searchRange: searchRangeForDate, searchFor: searchForDate });

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
}
