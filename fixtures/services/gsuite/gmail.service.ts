import nodemailer from "nodemailer";
import { BasePage as BaseService } from "~/fixtures/pages/base.page";

export class GMailService extends BaseService {
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

  async sendEmail(args: { to: string; cc: string, subject: string; html: string }) {
    const { connection, from } = this.mail;
    const { to, cc, subject, html } = args;

    await connection.sendMail({ from, to, cc, subject, html });
  }
}
