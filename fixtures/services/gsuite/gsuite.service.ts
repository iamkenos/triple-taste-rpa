import { google } from "googleapis";

import { BasePage as BaseService } from "~/fixtures/pages/base.page";

export class GSuiteService extends BaseService {

  protected auth() {
    const { GDRIVE_CLIENT_EMAIL, GDRIVE_PKEY } = process.env;
    const { JWT } = google.auth;
    return new JWT(GDRIVE_CLIENT_EMAIL, null, GDRIVE_PKEY.replace(/\|/g,"\n"), [this.url]);
  }
}
