import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { Format } from "~/fixtures/utils/date.utils";

import type { DateTime } from "luxon";

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

  async fetchListOfItems() {
    const sheetName = this.tabs.master;
    const { values: coldWarehouse } = await this.fetchRangeContents({ sheetName, range: "A18" });
    const { values: dryWarehouse } = await this.fetchRangeContents({ sheetName, range: "A22:A48" });

    const items = [...coldWarehouse, ...dryWarehouse].flat().map(i => i.trim()).filter(Boolean);
    return items;
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
