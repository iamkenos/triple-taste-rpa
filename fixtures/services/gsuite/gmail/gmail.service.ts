import path from "path";
import nodemailer from "nodemailer";

import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";
import { readContent } from "~/fixtures/utils/file.utils";

import type { MailSendInfo } from "./gmail.types";

export class GMailService extends GSuiteService {
  url = "smtp.gmail.com";
  title = "";

  private mail = this.connect();
  protected templates = "resources/email-templates/";

  protected frequency = {
    daily: "daily", fortnightly: "fortnightly",
    montly: "monthly", quarterly: "quarterly", yearly: "yearly"
  };

  private connect() {
    const { GMAIL_USER: user, GMAIL_PKEY: pass } = this.parameters.env;
    const connection = nodemailer.createTransport({
      host: this.url,
      port: 587,
      secure: false,
      auth: { user, pass }
    });

    return { connection };
  }

  protected getTemplateMarkers() {
    return {
      addressee: "[[ADDRESSEE]]",
      scopeDate: "[[SCOPE_DATE]]",
      dateShortMY: "[[DATE_SHORT_MY]]",
      dateShortYM: "[[DATE_SHORT_YM]]",
      pdfHeader: "[[PDF_HEADER]]",
      pdfFooter: "[[PDF_FOOTER]]",
      style: "[[STYLE]]",
      sig: "[[SIG]]",
      tblData: "<td colspan=\"5\">[[TBL_DATA]]</td>",
      senderEmail: "[[SENDER_EMAIL]]",
      senderContact: "[[SENDER_CONTACT]]"
    };
  }

  protected buildBaseEmailTemplate({ templatePath }: { templatePath: string }) {
    const { GMAIL_USER, SENDER_EMAIL_CONTACT_NO: ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO } = this.parameters.env;
    const style = readContent(path.join(this.templates, "style.part"));
    const body = readContent(templatePath);
    const pdfHeader = readContent(path.join(this.templates, "header.part"));
    const pdfFooter = readContent(path.join(this.templates, "footer.part"));
    const sig = readContent(path.join(this.templates, "sig.part"));
    const markers = this.getTemplateMarkers();
    return body
      .replaceAll(markers.style, style)
      .replaceAll(markers.sig, sig)
      .replaceAll(markers.pdfHeader, pdfHeader)
      .replaceAll(markers.pdfFooter, pdfFooter)
      .replaceAll(markers.senderEmail, GMAIL_USER)
      .replaceAll(markers.senderContact, ACCTG_EMAIL_REMINDER_SIG_CONTACT_NO);
  }

  async sendEmail({ to, cc, subject, body, attachments }: MailSendInfo) {
    const { GMAIL_USER: from } = this.parameters.env;
    const { connection } = this.mail;
    const prefix = "[TripleTaste] ";

    await connection.sendMail({
      from, to, cc,
      subject: `${prefix}${subject}`,
      html: body, attachments,
      priority: "high"
    });
  }
}
