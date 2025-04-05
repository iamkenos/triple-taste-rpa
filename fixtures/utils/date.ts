import { DateTime, DurationLike } from "luxon";

export const MONTHS = {
  // Q1
  JAN: "Jan",
  FEB: "Feb",
  MAR: "Mar",
  // Q2
  APR: "Apr",
  MAY: "May",
  JUN: "Jun",
  // Q3
  JUL: "Jul",
  AUG: "Aug",
  SEP: "Sep",
  // Q4
  OCT: "Oct",
  NOV: "Nov",
  DEC: "Dec",
};

export const FORMATS = {
  MONTH_DAY_YEAR: "MMM dd, yyyy",
  MONTH_YEAR: "MMM yyyy",
  YEAR_MONTH: "yyyyMM",
  YEAR_MONTH_DAY: "yyyyMMdd",
  QUARTER_YEAR: "Qq yyyy",
  YEAR_QUARTER: "yyyy Qq",
  DDMMM: "dd-MMM",
  YYYY: "yyyy",
  MONTH: "MMMM",
  DDMMMYY: "dd-MMM-yy",
};

export function getDate(args?: {
  date?: DateTime;
  format?: string;
  offset?: DurationLike;
  from?: string[];
}) {
  const zone = "Asia/Manila";
  const from = args?.from?.length == 2 ? DateTime.fromFormat(args.from[0], args.from[1], { zone }) : undefined;
  const dt: DateTime = from || args?.date || DateTime.now();
  const datetime = dt.plus(args?.offset || {}).setZone(zone);

  return {
    date: datetime,
    formatted: datetime.toFormat(args?.format || "dd MMM yyyy hh:mm"),
  };
}

export function isSameCalendarDay(a: DateTime, b: DateTime) {
  return a.hasSame(b, "day") && a.hasSame(b, "month") && a.hasSame(b, "year");
}

export function formatOrdinal(n: number) {
  const suffixes = new Map([
    ["one", "st"],
    ["two", "nd"],
    ["few", "rd"],
    ["other", "th"],
  ]);
  const rule = new Intl.PluralRules("en-US", { type: "ordinal" }).select(n);
  const suffix = suffixes.get(rule);
  return `${n}${suffix}`;
}
