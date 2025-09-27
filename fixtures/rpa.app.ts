import { PageObject as ProcessAutomation } from "@iamkenos/kyoko";

import type { Parameters } from "./rpa.steps";

export class RPA extends ProcessAutomation<Parameters> {
  url = "";
  title = "";

  protected ccy = "₱";

  protected format(input: number | string) {
    const value: number = isNaN(input as any) ? this.parseFloat(input as string) : input as number;
    return new Intl.NumberFormat("en-US").format(value);
  }

  parseFloat(input: string) {
    return parseFloat(input.replace(/[^0-9.-]+/g, ""));
  }

  async fulfilled<T>(r: PromiseSettledResult<T>[]) {
    await this.page.expect({ timeout: 1 })
      .setName("Expected all promises to be fulfilled")
      .predicate(() => r.every(v => v.status === "fulfilled")).poll();
    return r.map((v: PromiseFulfilledResult<T>) => v.value);
  }

  async createPDF(content: string, path: string, landscape = false) {
    const pdfWiz = await this.browser.newPage();
    await pdfWiz.setContent(content);
    await pdfWiz.pdf({ path, format: "A4", printBackground: true, landscape });
    await pdfWiz.close();
  }
}
