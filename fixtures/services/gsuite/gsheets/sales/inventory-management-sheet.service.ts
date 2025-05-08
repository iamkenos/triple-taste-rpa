import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { createDate, Format } from "~/fixtures/utils/date.utils";

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

  private async fetchMasterSheetProductsInfo(column: string) {
    const sheetName = this.tabs.master;
    const { values: coldWarehouse } = await this.fetchRangeContents({ sheetName, range: `${column}18` });
    const { values: dryWarehouse } = await this.fetchRangeContents({ sheetName, range: `${column}22:${column}50` });

    const items = [...coldWarehouse, ...dryWarehouse].flat().map(i => i.trim()).filter(Boolean);
    return items;
  }

  private async fetchNodeSheetProductsInfo({ sheetName, column }: InventoryFetchSheetProductInfo) {
    const { values: coldWarehouse } = await this.fetchRangeContents({ sheetName, range: `${column}6` });
    const { values: dryWarehouse } = await this.fetchRangeContents({ sheetName, range: `${column}10:${column}45` });

    const items = [...coldWarehouse, ...dryWarehouse].flat().map(i => i.trim()).filter(Boolean);
    return items;
  }

  private async fetchItemsToOrder() {
    const items = await this.fetchListOfProducts();
    const qty = await this.fetchMasterSheetProductsInfo("D");

    await this.page.expect({ timeout: 1000 })
      .setName("Number of products matches quantity")
      .equals(items.length, qty.length).poll();

    const result = items.map((item, idx) => ({ name: item, value: qty[idx] }));
    return result;
  }

  private async fetchNextDeliveryDate() {
    const sheetName = this.tabs.master;
    const { value: deliveryDate } = await this.fetchRangeContents({ sheetName, range: "D7" });

    const { date: result } = createDate({ from: [deliveryDate, Format.DATE_SHORT_DMC] });
    return result;
  }

  private async fetchShippingMethod() {
    const sheetName = this.tabs.master;
    const { value: method } = await this.fetchRangeContents({ sheetName, range: "C3" });

    return method;
  }

  private async fetchCustomerName() {
    const sheetName = this.tabs.master;
    const { value: customerName } = await this.fetchRangeContents({ sheetName, range: "W4" });

    return customerName;
  }

  async fetchOrderInfo() {
    const { date: orderDate } = createDate();
    const details: PromiseSettledResult<any>[] = await Promise.allSettled([
      this.fetchItemsToOrder(),
      this.fetchNextDeliveryDate(),
      this.fetchShippingMethod(),
      this.fetchCustomerName()
    ]);

    const [products, deliveryDate, method, customerName] = await this.fullfilled(details);
    return { products, orderDate, deliveryDate, method, customerName } as InventoryOrderInfo;
  }

  async fetchListOfProducts() {
    const items = await this.fetchMasterSheetProductsInfo("A");
    return items;
  }

  async updateProductsSheet({ date, sheetName, products, note }: InventorySheetUpdateInfo) {
    const searchFor = date.toFormat(Format.DATE_SHORT_DMY);
    const sheetId = await this.fetchWorksheetId({ sheetName });
    const { col, row: headerRow } = await this.findCell({ sheetName, searchRange: "H2:NU2", searchFor });

    if (note) {
      const address = this.serializeToGSheetsCellAddress({ col, row: headerRow + 4 });
      await this.insertNote({ sheetName, address, note });
    }

    const content = await Promise.allSettled(products
      .map(async({ name, value }) => {
        const { row } = await this.findCell({ sheetName, searchRange: "A1:A45", searchFor: name });
        return { columnIndex: col, rowIndex: row, numberValue: +value, sheetId };
      }));

    const result = await this.fullfilled(content);
    const requests = result.map(({ numberValue, rowIndex, columnIndex, sheetId }) => ({
      updateCells: {
        rows: [
          {
            values: [ { userEnteredValue: { numberValue } } ]
          }
        ],
        fields: "userEnteredValue",
        start: {
          sheetId,
          rowIndex,
          columnIndex
        }
      }
    }));

    const requestBody = { requests };
    await this.batchUpdate({ requestBody });
  }

  async updateRemainingInventoryFor(date: DateTime) {
    const { remaining: products } = this.parameters.gsheets.inventory;
    const sheetName = this.tabs.remaining;

    await this.updateProductsSheet({ date, sheetName, products });
  }

  async updateOrderedInventoryFor(date: DateTime) {
    const { products, por: note } = this.parameters.gsheets.inventory.order;
    const sheetName = this.tabs.ordered;

    await this.updateProductsSheet({ date, sheetName, products, note });
  }

  async updateArrivingInventoryFor(date: DateTime) {
    const { por: note } = this.parameters.gsheets.inventory.order;
    const items = await this.fetchNodeSheetProductsInfo({ sheetName: this.tabs.ordered, column: "A" });
    const qty = await this.fetchNodeSheetProductsInfo({ sheetName: this.tabs.ordered, column: "E" });
    const products = items.map((item, idx) => ({ name: item, value: qty[idx] }));

    const sheetName = this.tabs.arriving;
    await this.updateProductsSheet({ date, sheetName, products, note });
  }

  async revertMasterSheetProductsOrderQty() {
    const sheetName = this.tabs.master;
    const sheetId = await this.fetchWorksheetId({ sheetName });

    const startRow = 18; const endRow = 50;
    const rows = Array.from({ length: endRow - startRow + 1 }, (_, i) => i + startRow);
    const rangeToUpdate = rows.map(v => this.singleCellAddressToIndex(`D${v}`));
    const values = rows.map(v => `=S${v}`);

    const cellRequests = rangeToUpdate.map((v, idx) => ({
      updateCells: {
        rows: [
          {
            values: [ { userEnteredValue: { formulaValue: values[idx] } } ]
          }
        ],
        fields: "userEnteredValue",
        start: {
          sheetId,
          rowIndex: v.row,
          columnIndex: v.col
        }
      }
    }));

    const [first,,,, ...rest] = cellRequests;
    const requests = [first, ...rest.slice(0, -2)];

    const requestBody = { requests };
    await this.batchUpdate({ requestBody });
  }
}
