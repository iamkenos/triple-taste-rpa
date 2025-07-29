
import path from "path";
import { string } from "@iamkenos/kyoko/common";
import { Ext, MimeType } from "~/fixtures/utils/file.utils";

import { GMailService } from "~/fixtures/services/gsuite/gmail/gmail.service";

import type {
  StaffPayAdviseFile,
  StaffPayAdviseInfo,
  StaffPayReminderInfo,
  StaffShiftRotationInfo
} from "~/fixtures/services/gsuite/gmail/gmail.types";
import type { StaffPayOutInfo } from "~/fixtures/services/gsuite/gsheets/gsheets.types";

export class StaffMailService extends GMailService {

  private staffTemplates = path.join(this.templates, "staff");

  protected getTemplateMarkers() {
    return {
      ...super.getTemplateMarkers(),
      rvQty: "[[RV_QTY]]",
      rvAmount: "[[RV_AMOUNT]]",
      rvDcAmount: "[[RV_DC_AMOUNT]]",
      rvTotalAmount: "[[RV_TOTAL_AMOUNT]]",
      rvGrabQty: "[[RV_GRAB_QTY]]",
      rvGrabAmount: "[[RV_GRAB_AMOUNT]]",
      rvPandaQty: "[[RV_PANDA_QTY]]",
      rvPandaAmount: "[[RV_PANDA_AMOUNT]]",
      paRcpName: "[[PA_RCP_NAME]]",
      paRcpEmail: "[[PA_RCP_EMAIL]]",
      paRcpAddress: "[[PA_RCP_ADDRESS]]",
      paRcpAccount: "[[PA_RCP_ACCOUNT]]",
      paJbiId: "[[PA_JBI_ID]]",
      paJbiPosition: "[[PA_JBI_POSITION]]",
      paJbiRate: "[[PA_JBI_RATE]]",
      paCycId: "[[PA_CYC_ID]]",
      paCycFreq: "[[PA_CYC_FREQ]]",
      paCycPeriod: "[[PA_CYC_PERIOD]]",
      paCycAdj: "[[PA_CYC_ADJ]]",
      paHrsShift: "[[PA_HRS_SHIFT]]",
      paHrsBase: "[[PA_HRS_BASE]]",
      paHrsOt: "[[PA_HRS_OT]]",
      paHrsNight: "[[PA_HRS_NIGHT]]",
      paHrsTotal: "[[PA_HRS_TOTAL]]",
      paAmtYTD: "[[PA_AMT_YTD]]",
      paAmtBase: "[[PA_AMT_BASE]]",
      paAmtOt: "[[PA_AMT_OT]]",
      paAmtNight: "[[PA_AMT_NIGHT]]",
      paAmtTnt: "[[PA_AMT_TNT]]",
      paAmtHoliday: "[[PA_AMT_HOL]]",
      paAmtMisc: "[[PA_AMT_MISC]]",
      paAmtGross: "[[PA_AMT_GRS]]"
    };
  }

  private buildPayAdvisePDFContentFrom(staff: StaffPayOutInfo) {
    const { asOf, employeeInfo, payCycleInfo, payOutInfo, timesheetInfo, workHoursInfo } = staff;
    const dropTimeSheetIndex = (timesheet: string[][], index: number) => {
      return timesheet.map(innerArray => {
        if (innerArray.length > index) {
          const newInnerArray = [...innerArray];
          newInnerArray.splice(index, 1);
          return newInnerArray;
        } else {
          return innerArray;
        }
      });
    };
    const toTimeSheetStr = (timesheet: string[][]) => {
      const [header, ...data] = timesheet;
      const timesheetStr = `<tr class="row-bordered row-bordered-header">${header.map(i => `<td>${i}</td>`).join("")}</tr>${data
        .map(i => i.map(j => `<td>${j}</td>`).join(""))
        .map(i => i.includes("Sat") || i.includes("Sun")
          ? `<tr class="row-bordered row-bordered-alt">${i}</tr>`
          : `<tr>${i}</tr>`).join("")}`;
      return timesheetStr;
    };

    const jobInfoSection = {
      staffId: employeeInfo[1][2],
      position: employeeInfo[3][2],
      dailyRate: payCycleInfo[3][1]
    };

    const recipientSection = {
      staffName: employeeInfo[2][2],
      emailAddress: employeeInfo[5][2],
      address: employeeInfo[6][2],
      account: `${employeeInfo[7][0].split(":").at(0)} @ ${employeeInfo[7][2]}`,
      driveId: `${payCycleInfo[7][1].split("/").at(-1)}`
    };

    const payCycleSection = {
      frequency: "Fortnightly",
      payCycleId:  `${asOf.year}-${payCycleInfo[0][1]}`,
      period: `${payCycleInfo[1][1]} to ${payCycleInfo[2][1]}`,
      retroAdjustments: payCycleInfo[5][2] ? `${payCycleInfo[5][1]} ▸ ${payCycleInfo[5][2]}` : payCycleInfo[5][1]
    };

    const workHoursSection = {
      baseHours: workHoursInfo[0][1],
      overtimeHours: workHoursInfo[1][1],
      nightHours: workHoursInfo[2][1],
      totalHours: workHoursInfo[3][1],
      shift: workHoursInfo[4][1]
    };

    const earningsSection = {
      ytd: payCycleInfo[6][1],
      basePay: payOutInfo[0][1],
      overtimePay: payOutInfo[1][1],
      nightPay: payOutInfo[2][1],
      tntMonthPay: payOutInfo[3][1],
      holidayPay: payOutInfo[4][1],
      otherAdjustments: payOutInfo[5][1],
      grossPay: payOutInfo[6][1]
    };

    const [timesheetHeaderOne, timesheetHeaderTwo, ...rest] = timesheetInfo;
    const timesheetHeader = timesheetHeaderTwo.map((v, i) => {
      if (i < 5) return timesheetHeaderTwo[i];
      else if ([10, 12, 14, 16, 18].includes(i)) return `${timesheetHeaderOne[i-1]} ${timesheetHeaderTwo[i]}`;
      else return `${timesheetHeaderOne[i]} ${timesheetHeaderTwo[i]}`;
    });
    const timesheetForThisCycle = rest
      .filter((i: string[]) => i[5] === payCycleInfo[0][1])
      .map(i => i.concat(Array(Math.max(timesheetHeader.length - i.length, 0)).fill("")));
    const timesheetData = dropTimeSheetIndex([timesheetHeader, ...timesheetForThisCycle], 5);
    const fullTimeSheet = toTimeSheetStr(timesheetData);
    const staffTimeSheet = toTimeSheetStr(timesheetData
      .map(i => i.map((j, idx) => { if ([0, 1, 2, 3, 4].includes(idx)) return j; }).filter(i => i !== undefined)));

    return {
      asOf, jobInfoSection, recipientSection, payCycleSection,
      workHoursSection, earningsSection, fullTimeSheet, staffTimeSheet
    } as StaffPayAdviseInfo;
  }

  private async buildPayAdvisePDFFrom(content: StaffPayAdviseInfo) {
    const { fortnightly } = this.frequency;

    const staffDir = path.join(this.config.baseDir, this.staffTemplates, fortnightly);
    const templatePath = path.join(staffDir, "pay-advice-pdf.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { kebabCase } = string.changecase;
    const { staffId } = content.jobInfoSection;
    const { driveId } = content.recipientSection;
    const { payCycleId } = content.payCycleSection;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.paRcpName, content.recipientSection.staffName)
      .replaceAll(markers.paRcpEmail, content.recipientSection.emailAddress)
      .replaceAll(markers.paRcpAddress, content.recipientSection.address)
      .replaceAll(markers.paRcpAccount, content.recipientSection.account)
      .replaceAll(markers.paJbiId, staffId)
      .replaceAll(markers.paJbiPosition, content.jobInfoSection.position)
      .replaceAll(markers.paJbiRate, content.jobInfoSection.dailyRate)
      .replaceAll(markers.paCycId, payCycleId)
      .replaceAll(markers.paCycFreq, content.payCycleSection.frequency)
      .replaceAll(markers.paCycPeriod, content.payCycleSection.period)
      .replaceAll(markers.paCycAdj, content.payCycleSection.retroAdjustments)
      .replaceAll(markers.paHrsShift, content.workHoursSection.shift)
      .replaceAll(markers.paHrsBase, content.workHoursSection.baseHours)
      .replaceAll(markers.paHrsOt, content.workHoursSection.overtimeHours)
      .replaceAll(markers.paHrsNight, content.workHoursSection.nightHours)
      .replaceAll(markers.paHrsTotal, content.workHoursSection.totalHours)
      .replaceAll(markers.paAmtYTD, content.earningsSection.ytd)
      .replaceAll(markers.paAmtBase, content.earningsSection.basePay)
      .replaceAll(markers.paAmtOt, content.earningsSection.overtimePay)
      .replaceAll(markers.paAmtNight, content.earningsSection.nightPay)
      .replaceAll(markers.paAmtTnt, content.earningsSection.tntMonthPay)
      .replaceAll(markers.paAmtHoliday, content.earningsSection.holidayPay)
      .replaceAll(markers.paAmtMisc, content.earningsSection.otherAdjustments)
      .replaceAll(markers.paAmtGross, content.earningsSection.grossPay)
      .replaceAll(markers.tblData, content.staffTimeSheet);

    const filename = `${kebabCase(`${payCycleId}-${staffId}`).toUpperCase()}.${Ext.PDF}`;
    const filepath = path.join(this.config.downloadsDir, filename);
    await this.createPDF(body, filepath);
    return { filename, filepath, driveId } as StaffPayAdviseFile;
  }

  private async buildTimeSheetPDFFrom(content: StaffPayAdviseInfo) {
    const { fortnightly } = this.frequency;

    const staffDir = path.join(this.config.baseDir, this.staffTemplates, fortnightly);
    const templatePath = path.join(staffDir, "pay-timesheet-pdf.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { kebabCase } = string.changecase;
    const { staffId } = content.jobInfoSection;
    const { driveId, staffName } = content.recipientSection;
    const { payCycleId } = content.payCycleSection;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.paJbiId, staffId)
      .replaceAll(markers.paCycId, payCycleId)
      .replaceAll(markers.paRcpName, staffName)
      .replaceAll(markers.paHrsTotal, content.workHoursSection.totalHours)
      .replaceAll(markers.paAmtGross, content.earningsSection.grossPay)
      .replaceAll(markers.tblData, content.fullTimeSheet);

    const filename = `${kebabCase(`${payCycleId}-${staffId}`).toUpperCase()}-timesheet.${Ext.PDF}`;
    const filepath = path.join(this.config.downloadsDir, filename);
    await this.createPDF(body, filepath, true);
    return { filename, filepath, driveId } as StaffPayAdviseFile;
  }

  private buildPayReminderInfoFrom(content: StaffPayAdviseInfo) {
    const { recipientSection, earningsSection, payCycleSection, jobInfoSection } = content;
    const { staffId } = jobInfoSection;
    const { staffName, account, emailAddress } = recipientSection;
    const { payCycleId } = payCycleSection;
    const { grossPay } = earningsSection;

    return { staffName, staffId, grossPay, account, payCycleId, emailAddress } as StaffPayReminderInfo;
  }

  async sendDailyInvoicingEmail() {
    const { daily } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.staffTemplates, daily, "revenue-dly-invoicing.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { invoice } = this.parameters.gsheets.sales.daily;

    const subject = `Daily Revenue Invoicing: ${invoice.referenceDate}`;
    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.scopeDate, invoice.referenceDate)
      .replaceAll(markers.rvQty, `${invoice.adjQty}`)
      .replaceAll(markers.rvAmount, this.format(invoice.adjAmount))
      .replaceAll(markers.rvDcAmount, this.format(invoice.dcAmount))
      .replaceAll(markers.rvTotalAmount, this.format(invoice.adjTotal))
      .replaceAll(markers.rvGrabQty, `${invoice.grabQty}`)
      .replaceAll(markers.rvGrabAmount, this.format(invoice.grabAmount))
      .replaceAll(markers.rvPandaQty, `${invoice.pandaQty}`)
      .replaceAll(markers.rvPandaAmount, this.format(invoice.pandaAmount));

    const { STAFF_EMAIL_RECIPIENTS: to, STAFF_EMAIL_RECIPIENTS_CC: cc } = this.parameters.env;
    await this.sendEmail({ to, cc, subject, body });
  }

  async collatePayAdviceData() {
    const { payout } = this.parameters.gsheets.hr;
    const collated = await Promise.allSettled(payout
      .map((v: StaffPayOutInfo) => this.buildPayAdvisePDFContentFrom(v))
      .map(async(v: StaffPayAdviseInfo) => {
        const { asOf: date } = v;
        const payReminderInfo = this.buildPayReminderInfoFrom(v);
        const payAdvisePdf = await this.buildPayAdvisePDFFrom(v);
        const timesheetPdf = await this.buildTimeSheetPDFFrom(v);
        return { payReminderInfo, payAdvisePdf, timesheetPdf, date };
      }));

    const result = await this.fulfilled(collated);
    return result;
  }

  async collateShiftRotationData() {
    const { payout } = this.parameters.gsheets.hr;
    const shifts = { morning: { idx: 0, ico: "🏙️" }, mid: { idx: 1, ico: "🌇" }, night: { idx: 2, ico: "🌃" } };
    const shiftsIcon = (v: string) => shifts[Object.keys(shifts).find(k => v.toLowerCase().startsWith(k))].ico;
    const shiftsIndex = (v: string) => shifts[Object.keys(shifts).find((k ) => v.toLowerCase().startsWith(k))].idx;
    const collated = await Promise.allSettled(payout
      .map((v: StaffPayOutInfo) => this.buildPayAdvisePDFContentFrom(v))
      .map(async(v: StaffPayAdviseInfo) => {
        const { recipientSection, workHoursSection, payCycleSection } = v;
        const staffName = recipientSection.staffName;
        const emailAddress = recipientSection.emailAddress;
        const shift = workHoursSection.shift.replaceAll(":00", "");
        const shiftIcon = shiftsIcon(shift);
        const shiftIndex = shiftsIndex(shift);
        const period = payCycleSection.period;
        return { staffName, emailAddress, shift, shiftIcon, shiftIndex, period } as StaffShiftRotationInfo;
      }));

    const result = await this.fulfilled(collated);
    const sorted = result.sort((a, b) => a.shiftIndex - b.shiftIndex);
    return sorted;
  }

  async sendFortnightlyPayAdviceEmail() {
    const { fortnightly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.staffTemplates, fortnightly, "pay-advice.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { advices } = this.parameters.gmail.staff;
    const emails = await Promise.allSettled(advices
      .map(async({ payReminderInfo, payAdvisePdf }) => {
        const { payCycleId, staffId, staffName, emailAddress } = payReminderInfo;
        const subject = `Pay Advice ${payCycleId} for ${staffId}`;
        const markers = this.getTemplateMarkers();
        const body = template.replaceAll(markers.addressee, staffName);

        const to = emailAddress;
        const attachments = [{ filename: payAdvisePdf.filename, path: payAdvisePdf.filepath, contentType: MimeType.PDF }];
        await this.sendEmail({ to, subject, body, attachments });
      }));
    await this.fulfilled(emails);
  }

  async sendFortnightlyPayReminderEmail() {
    const { fortnightly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.staffTemplates, fortnightly, "pay-reminder.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const { capitalCase } = string.changecase;
    const payReminderInfo = this.parameters.gmail.staff.advices.map(v => v.payReminderInfo);
    const [common] = payReminderInfo;

    // eslint-disable-next-line
    const reminderData = payReminderInfo.map(({ payCycleId, staffId, emailAddress, ...rest }) => ({ ...rest }));
    const subject = `Pay Reminder for ${common.payCycleId}`;
    const payReminderTable = reminderData
      .map(v => `
        <table style="width: 615px; margin-bottom: 16px">
          <colgroup>
            <col style="width: 125px" /><col style="width: 490px" />
          </colgroup>${Object.keys(v).map(k => `
            <tr>
              <th class="row-bordered row-bordered-alt">${capitalCase(k)}:</th>
              <td>${v[k]}</td>
            </tr>`).join("")}
        </table>`)
      .join("");

    const markers = this.getTemplateMarkers();
    const body = template.replaceAll(markers.tblData, payReminderTable);

    const { STAFF_EMAIL_RECIPIENTS_CC: to } = this.parameters.env;
    await this.sendEmail({ to, subject, body });
  }

  async sendFortnightlyShiftRotationEmail() {
    const { fortnightly } = this.frequency;

    const templatePath = path.join(this.config.baseDir, this.staffTemplates, fortnightly, "shift-rotation.html");
    const template = super.buildBaseEmailTemplate({ templatePath });

    const shiftRotationInfo = this.parameters.gmail.staff.rotation;
    const [common] = shiftRotationInfo;

    const to = shiftRotationInfo.map(({ emailAddress }) => emailAddress).join();
    const subject = `Shift Rotation for ${common.period}`;
    const shiftRotationTable = shiftRotationInfo
      .map(v => `
        <tr>
          <td>${v.staffName}</td>
          <td>${v.shift}</td>
        </tr>`)
      .join("");

    const markers = this.getTemplateMarkers();
    const body = template
      .replaceAll(markers.tblData, shiftRotationTable)
      .replaceAll(markers.paCycPeriod, common.period);

    const { STAFF_EMAIL_RECIPIENTS_CC: cc } = this.parameters.env;
    await this.sendEmail({ to, cc, subject, body });
  }
}
