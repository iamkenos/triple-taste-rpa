import { google } from "googleapis";

import { RPA } from "~/fixtures/rpa.app";

export class GSuiteService extends RPA {

  /**
   * Returns a JWT instance for the environment configured service account
   * @param scopes the list of requested scopes on top of the defined service url
   * @returns
   */
  protected auth(scopes: string[] = []) {
    const { GSUITE_USER: email, GSUITE_PKEY: key } = this.parameters.env;
    const { JWT } = google.auth;
    return new JWT(email, null, key.replace(/\|/g, "\n"), [this.url, ...scopes]);
  }
}
