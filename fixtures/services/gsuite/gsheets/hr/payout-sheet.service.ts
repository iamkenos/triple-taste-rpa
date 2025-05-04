
import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { createDate, Format } from "~/fixtures/utils/date.utils";

import type { WorkbookResource } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export class PayoutSheetService extends GSheetsService {

  protected spreadsheetId = this.parameters.env.GSHEETS_HR_PAYOUT_TRACKER_ID;

  async fetchStaffSheets() {
    const filter = (r: WorkbookResource) => r.sheetName.startsWith("TTPC");
    const result = await this.fetchWorksheets({ filter });
    return result;
  }

  async fetchPayCycleEndDate() {
    const [sheet] = await this.fetchStaffSheets();
    const { sheetName } = sheet;
    const { value: endDate } = await this.fetchRangeContents({ sheetName, range: "K4" });

    const result = createDate({ from: [endDate, Format.DATE_MED_S] }).date;
    return result;
  }

  async fetchPayOutInfo() {
    const sheets = await this.fetchStaffSheets();
    const payOutInfo = await Promise.allSettled(sheets
      .map(async({ sheetName }) => {
        const { values: employeeInfo } = await this.fetchRangeContents({ sheetName, range: "B2:D9" });
        const { values: payCycleInfo } = await this.fetchRangeContents({ sheetName, range: "J2:K9" });
        const { values: workHoursInfo } = await this.fetchRangeContents({ sheetName, range: "N2:O9" });
        const { values: payOutInfo } = await this.fetchRangeContents({ sheetName, range: "R2:S9" });
        const { values: timesheetInfo } = await this.fetchRangeContents({ sheetName, range: "B11:T410" });
        const { value: now } = await this.fetchRangeContents({ sheetName, range: "D1" });
        const asOf = createDate({ from: [now, Format.DATE_MED_S] }).date;

        return { asOf, sheetName, employeeInfo, payCycleInfo, workHoursInfo, payOutInfo, timesheetInfo };
      }));

    const result = await this.fullfilled(payOutInfo);
    return result;
  }

  async updateToNextPayCycle() {
    const sheets = await this.fetchStaffSheets();
    const payCycle = await Promise.allSettled(sheets
      .map(async({ sheetName }) => {
        const range = "K2";
        const { value: cycle } = await this.fetchRangeContents({ sheetName, range });
        await this.updateRangeContents({ sheetName, range, values: [`${+cycle + 1}`] });
      }));
    await this.fullfilled(payCycle);
  }

  async revertToCurrentPayCycle() {
    const sheets = await this.fetchStaffSheets();
    const payCycle = await Promise.allSettled(sheets
      .map(async({ sheetName }) => {
        const range = "K2";
        await this.updateRangeContents({ sheetName, range, values: ["=F1"] });
      }));
    await this.fullfilled(payCycle);
  }
}
