import { google } from "googleapis";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";

export class GAppsScript extends GSuiteService {
  url = "https://www.googleapis.com/auth/script.projects";
  title = "";

  private scripts = this.connect();

  private connect() {
    const auth = this.auth(["https://www.googleapis.com/auth/spreadsheets"]);
    const connection = google.script({ version: "v1", auth });
    return { auth, connection };
  }

  async runFn(args: { scriptId: string; fnName: string; parameters: any[] }) {
    const { connection } = this.scripts;
    const { scriptId, fnName, parameters } = args;
    const request = {
      scriptId,
      resource: {
        function: fnName,
        parameters: parameters,
        devMode: true
      },
    };
    // TODO: FIX ME
    await connection.scripts.run(request);
  }
}
