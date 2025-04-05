import nodemailer from "nodemailer";

import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";

export class GMailService extends GSuiteService {
  url = "";
  title = "";

  private mail = this.connect();

  private connect() {
    const { GMAIL_USER, GMAIL_PASS } = process.env;
    const connection = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });
    return { connection, from: GMAIL_USER };
  }

  async sendEmail(args: { to: string; cc: string, subject: string; html: string, attachments?: any }) {
    const { connection, from } = this.mail;
    const { to, cc, subject, html, attachments } = args;

    await connection.sendMail({ from, to, cc, subject: subject, html, attachments });
  }
}
