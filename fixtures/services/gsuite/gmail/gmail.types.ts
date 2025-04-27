import type { DateTime } from "luxon";
import type { SendMailOptions } from "nodemailer";

export type MailSendInfo = {
  body: SendMailOptions["html"];
} & Pick<SendMailOptions, "to" | "cc" | "from" | "subject" | "attachments">;

export type StaffPayAdviseInfo = {
  jobInfoSection: {
    staffId: string;
    position: string;
    dailyRate: string;
  };
  recipientSection: {
    staffName: string;
    emailAddress: string;
    address: string;
    account: string;
    driveId: string;
  };
  payCycleSection: {
    frequency: string;
    payCycleId: string;
    period: string;
    retroAdjustments: string;
  };
  workHoursSection: {
    baseHours: string;
    overtimeHours: string;
    nightHours: string;
    totalHours: string;
    shift: string;
  };
  earningsSection: {
    ytd: string;
    basePay: string;
    overtimePay: string;
    nightPay: string;
    tntMonthPay: string;
    holidayPay: string;
    otherAdjustments: string;
    grossPay: string;
  };
  fullTimeSheet: string;
  staffTimeSheet: string;
  asOf: DateTime;
}

export type StaffPayAdviseFile = {
  filename: string;
  filepath: string;
  driveId: string;
}

export type StaffPayReminderInfo = {
  staffName: string;
  staffId: string;
  grossPay: string;
  account: string;
  payCycleId: string;
  emailAddress: string;
}

export type StaffShiftRotationInfo = {
  period: string;
  staffName: string;
  emailAddress: string;
  shift: string;
  shiftIcon: string;
  shiftIndex: number;
}
