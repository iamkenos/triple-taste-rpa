import { PageObject, Config } from "@iamkenos/kyoko";

import type { Parameters } from "./base.steps";

export class BasePage extends PageObject<Parameters> {
  url = "";
  title = "";

  async createPDF(content: string, path: string, landscape = false) {
    await this.page.setContent(content)
    await this.page.pdf({ path, format: "A4", printBackground: true, landscape });
    await this.page.setContent("")
  }
}
