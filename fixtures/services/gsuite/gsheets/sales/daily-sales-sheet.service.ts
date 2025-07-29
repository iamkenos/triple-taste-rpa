import { GSheetsService } from "~/fixtures/services/gsuite/gsheets/gsheets.service";
import { createDate, differenceInDays, Format } from "~/fixtures/utils/date.utils";

import type { DailySales, DailySalesInvoiceData, DepositData } from "~/fixtures/services/gsuite/gsheets/gsheets.types";
import type { DateTime } from "luxon";

export class DailySalesSheetService extends GSheetsService {

  protected spreadsheetId = this.parameters.env.GSHEETS_SI_SALES_TRACKER_ID;
  private ranges = {
    R_BREAKDOWN_FOR_DATES: "R_BREAKDOWN_FOR_DATES",
    R_DEPOSIT_FOR_DATES: "R_DEPOSIT_FOR_DATES",
    R_INVOICE_RATES: "R_INVOICE_RATES"
  };

  private getQSheetFor(date: DateTime) {
    return date.toFormat(Format.DATE_Q);
  }

  async fetchDailyFiguresFor(date: DateTime) {
    const sheetName = this.getQSheetFor(date);
    const searchFor = date.toFormat(Format.DATE_SHORT_DM);
    const totalOf = (breakdown: string) => breakdown.split(" / ").map(i => +i).reduce((a, c) => a + c);

    const { address: searchRange } = await this.fetchNamedRangeInfo({ name: this.ranges.R_BREAKDOWN_FOR_DATES });
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
      date,
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

    const { address: searchRange } = await this.fetchNamedRangeInfo({ name: this.ranges.R_DEPOSIT_FOR_DATES });
    const cell = await this.findCell({ sheetName, searchRange, searchFor, partialMatch: true });

    const amountRange = this.serializeToGSheetsCellAddress({ col: cell.col, row: cell.row + 1 });
    const { value } = await this.fetchRangeContents({ sheetName, range: amountRange });
    return { amount: value, date: cell.value } as DepositData;
  }

  async computeDailyInvoiceData() {
    const { figures } = this.parameters.gsheets.sales.daily;
    const { address: range, sheetName } = await this.fetchNamedRangeInfo({ name: this.ranges.R_INVOICE_RATES });

    const { values } = await this.fetchRangeContents({ sheetName, range });
    const { rate } = values
      .map(([date, rate]) => ({ date: createDate({ from: [date, Format.DATE_SHORT_DMYYYY] }).date, rate }))
      .slice().reverse().find(v => differenceInDays(figures.date, v.date) >= 0);

    const adjRate = this.parseFloat(rate);
    const adjQty = Math.floor(figures.qty - (figures.qty * (adjRate + 0.05)));
    const cohAndGCashAmount = figures.cohAmount + figures.gCashAmount;
    const adjAmount = cohAndGCashAmount - (cohAndGCashAmount * adjRate);
    const adjTotal = adjAmount - figures.dcAmount;
    const grabAndPandaQty = figures.qty - adjQty;
    const grabAndPandaAmount = figures.grabAmount + figures.pandaAmount;
    let grabQty = 0, grabRatio = 0, pandaQty = 0, pandaRatio = 0;
    if (figures.grabAmount > 0) {
      grabRatio = figures.grabAmount / grabAndPandaAmount;
      grabQty = Math.floor(grabAndPandaQty * grabRatio);
    }
    if (figures.pandaAmount > 0) {
      pandaRatio = figures.pandaAmount / grabAndPandaAmount;
      pandaQty = Math.floor(grabAndPandaQty * pandaRatio);
    }
    return {
      ...figures,
      adjQty,
      adjAmount,
      adjTotal,
      grabQty,
      pandaQty
    } as DailySalesInvoiceData;
  }
}
