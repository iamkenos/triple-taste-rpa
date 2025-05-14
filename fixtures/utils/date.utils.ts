import { DateTime, DateTimeUnit } from "luxon";

export const Format = {
  DATE_SHORT_DM: "dd-MMM",
  DATE_SHORT_DMY: "dd-MMM-yy",
  DATE_SHORT_MDY: "MM-dd-yyyy",
  DATE_SHORT_DMYYYY: "dd-MMM-yyyy",
  DATE_SHORT_MY: "MMM yyyy",
  DATE_SHORT_DMC: "d-MMM (ccc)",
  DATE_SHORT_QY: "Qq yyyy",
  DATE_SHORT_YM: "yyyyMM",
  DATE_SHORT_YQ: "yyyy Qq",
  DATE_SHORT: "yyyyMMdd",
  DATE_MED: "MMM dd, yyyy",
  DATE_MED_S: "MMM d, yyyy",
  DATE_FULL: "MMMM dd, yyyy",
  DATETIME_FULL: "dd MMM yyyy hh:mm",
  MONTH: "MMMM",
  YEAR: "yyyy"
};

export const Month = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12
};

export const Day = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7
};

export const Unit = {
  DAY: "day" as DateTimeUnit,
  WEEK: "week" as DateTimeUnit,
  MONTH: "month" as DateTimeUnit,
  QUARTER: "quarter" as DateTimeUnit,
  YEAR: "year" as DateTimeUnit
};

type Date = { from?: DateTime | string[]; format?: string; };
export function createDate({ from = DateTime.now(), format = Format.DATETIME_FULL }: Date = {}) {
  const zone = "Asia/Manila";
  const instance = from instanceof DateTime ? from : DateTime.fromFormat(from[0], from[1], { zone });
  const date = instance.setZone(zone);
  const formatted = date.toFormat(format);

  return { date, formatted };
}

export function differenceInDays(reference: DateTime, target: DateTime) {
  return Math.floor(reference.startOf(Unit.DAY).diff(target.startOf(Unit.DAY), "days").days);
}

export function createDateFromNearestWeekday(weekday: number) {
  const { date: today } = createDate();
  const dayOfWeek = today.weekday;
  const daysToAdd = dayOfWeek <= weekday ? weekday - dayOfWeek : 7 - (dayOfWeek - weekday);
  const result = createDate({ from: today.plus({ days: daysToAdd }) });
  return result;
}

export function getPreviousWorkingDateFrom(reference: DateTime) {
  const yesterday = reference.minus({ days: 1 });
  if ([Day.SATURDAY, Day.SUNDAY].includes(yesterday.weekday)) return getPreviousWorkingDateFrom(yesterday);
  return yesterday;
}
