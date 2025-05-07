import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { createDate, Format } from "~/fixtures/utils/date.utils";

import type { DateTime } from "luxon";
import type { OrderDetails } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

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

  private async fetchProductsInfo(column: string) {
    const sheetName = this.tabs.master;
    const { values: coldWarehouse } = await this.fetchRangeContents({ sheetName, range: `${column}18` });
    const { values: dryWarehouse } = await this.fetchRangeContents({ sheetName, range: `${column}22:${column}50` });

    const items = [...coldWarehouse, ...dryWarehouse].flat().map(i => i.trim()).filter(Boolean);
    return items;
  }

  async fetchListOfItems() {
    const items = await this.fetchProductsInfo("A");
    return items;
  }

  async fetchItemsToOrder() {
    const items = await this.fetchListOfItems();
    const qty = await this.fetchProductsInfo("D");

    await this.page.expect({ timeout: 1000 })
      .setName("Number of products matches quantity")
      .equals(items.length, qty.length).poll();

    const result = items.map((item, idx) => ({ name: item, value: qty[idx] }));
    return result;
  }

  async fetchNextDeliveryDate() {
    const sheetName = this.tabs.master;
    const { value: deliveryDate } = await this.fetchRangeContents({ sheetName, range: "D7" });

    const { date: result } = createDate({ from: [deliveryDate, Format.DATE_SHORT_DMC] });
    return result;
  }

  async fetchOrderDate() {
    const sheetName = this.tabs.master;
    const { value: orderDate } = await this.fetchRangeContents({ sheetName, range: "A2" });

    const { date: result } = createDate({ from: [orderDate, Format.DATE_SHORT_DMYYYY] });
    return result;
  }

  async fetchShippingMethod() {
    const sheetName = this.tabs.master;
    const { value: method } = await this.fetchRangeContents({ sheetName, range: "C3" });

    return method;
  }

  async fetchOrderDetails() {
    const details = await Promise.allSettled([
      this.fetchItemsToOrder(),
      this.fetchOrderDate(),
      this.fetchNextDeliveryDate(),
      this.fetchShippingMethod()
    ]);

    const [products, orderDate, deliveryDate, method] = await this.fullfilled(details as any);
    return { products, orderDate, deliveryDate, method } as OrderDetails;
  }

  async updateRemainingInventoryFor(date: DateTime) {
    const sheetName = this.tabs.remaining;
    const searchFor = date.toFormat(Format.DATE_SHORT_DMY);
    const { col } = await this.findCell({ sheetName, searchRange: "H2:NU2", searchFor });
    const { remaining } = this.parameters.gsheets.inventory;

    const updated = await Promise.allSettled(remaining
      .map(async({ name, value }) => {
        const { row } = await this.findCell({ sheetName, searchRange: "A1:A45", searchFor: name });
        const range = this.serializeToGSheetsCellAddress({ col, row });
        await this.updateRangeContents({ sheetName, range, values: [value] });
        return true;
      }));

    await this.fullfilled(updated);
  }
}
