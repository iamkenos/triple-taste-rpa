import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { Format } from "~/fixtures/utils/date.utils";

import type { DailySales, DailySalesInvoiceData, DepositData } from "~/fixtures/services/gsuite/gsheets/gsheets.types";
import type { DateTime } from "luxon";

export class DailySalesSheetService extends GSheetsService {

  protected spreadsheetId = this.parameters.env.GSHEETS_SI_SALES_TRACKER_ID;

  private getQSheetFor(date: DateTime) {
    return date.toFormat(Format.DATE_SHORT_YQ.replace(" ", "_"));
  }

  async fetchDailyFiguresFor(date: DateTime) {
    const sheetName = this.getQSheetFor(date);
    const searchFor = date.toFormat(Format.DATE_SHORT_DM);
    const totalOf = (breakdown: string) => breakdown.split(" / ").map(i => +i).reduce((a, c) => a + c);

    const searchRange = "K8:AD200";
    const cell = await this.findCell({ sheetName, searchRange, searchFor });

    if (!cell) throw new Error(`Failed to read any data for "${searchFor}" on the daily sales tracker.`);

    const cupsRow = cell.row + 4;
    const cupsRange = this.serializeToGSheetsCellAddress({ col: cell.col, row: cupsRow });
    const { value: cupsBreakdown } = await this.fetchRangeContents({ sheetName, range: cupsRange });

    const dcRow = cell.row + 6;
    const dcRange = this.serializeToGSheetsCellAddress({ col: cell.col, row: dcRow });
    const { value: dcBreakdown } = await this.fetchRangeContents({ sheetName, range: dcRange });

    const totalsRow = cell.row + 7;

    const cohCol = cell.col + 0;
    const cohRange = this.serializeToGSheetsCellAddress({ col: cohCol, row: totalsRow });
    const { value: cohValue } = await this.fetchRangeContents({ sheetName, range: cohRange });

    const gCashCol = cell.col + 1;
    const gCashRange = this.serializeToGSheetsCellAddress({ col: gCashCol, row: totalsRow });
    const { value: gCashValue } = await this.fetchRangeContents({ sheetName, range: gCashRange });

    const grabCol = cell.col + 2;
    const grabRange = this.serializeToGSheetsCellAddress({ col: grabCol, row: totalsRow });
    const { value: grabValue } = await this.fetchRangeContents({ sheetName, range: grabRange });

    const pandaCol = cell.col + 3;
    const pandaRange = this.serializeToGSheetsCellAddress({ col: pandaCol, row: totalsRow });
    const { value: pandaValue } = await this.fetchRangeContents({ sheetName, range: pandaRange });

    const cups = totalOf(cupsBreakdown);
    const discounts = totalOf(dcBreakdown);

    return {
      referenceDate: date.toFormat(Format.DATE_MED),
      qty: cups,
      dcAmount: discounts,
      cohAmount: this.parseFloat(cohValue),
      gCashAmount: this.parseFloat(gCashValue),
      grabAmount: this.parseFloat(grabValue),
      pandaAmount: this.parseFloat(pandaValue)
    } as DailySales;
  }

  async fetchDepositAmountFor(date: DateTime) {
    const sheetName = this.getQSheetFor(date);
    const searchFor = date.toFormat(Format.DATE_SHORT_DM);

    const searchRange = "AI8:AJ200";
    const cell = await this.findCell({ sheetName, searchRange, searchFor, partialMatch: true });

    const amountRange = this.serializeToGSheetsCellAddress({ col: cell.col, row: cell.row + 1 });
    const { value } = await this.fetchRangeContents({ sheetName, range: amountRange });
    return { amount: value.replace("₵", this.ccy), date: cell.value } as DepositData;
  }

  computeDailyInvoiceData() {
    const { figures } = this.parameters.gsheets.sales.daily;
    const adjRate = 0.45;

    const adjQty = Math.floor(figures.qty - (figures.qty * (adjRate + 0.05)));
    const cohAndGCashAmount = figures.cohAmount + figures.gCashAmount;
    const adjAmount = cohAndGCashAmount - (cohAndGCashAmount * adjRate);
    const adjTotal = adjAmount - figures.dcAmount;

    return {
      ...figures,
      adjQty,
      adjAmount,
      adjTotal
    } as DailySalesInvoiceData;
  }
}
