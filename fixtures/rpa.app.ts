import { PageObject as ProcessAutomation } from "@iamkenos/kyoko";

import type { Parameters } from "./rpa.steps";

export class RPA extends ProcessAutomation<Parameters> {
  url = "";
  title = "";

  async fullfilled<T>(r: PromiseSettledResult<T>[]) {
    await this.page.expect({ timeout: 1 }).truthy(() => r.every(v => v.status === "fulfilled")).poll();
    return r.map((v: PromiseFulfilledResult<T>) => v.value);
  }

  async createPDF(content: string, path: string, landscape = false) {
    const pdfWiz = await this.context.newPage();
    await pdfWiz.setContent(content);
    await pdfWiz.pdf({ path, format: "A4", printBackground: true, landscape });
    await pdfWiz.close();
  }
}
