import path from "path";
import { PageObject } from "@iamkenos/kyoko/core";

import type { Parameters } from "./base.steps";

export class BasePage extends PageObject<Parameters> {
  url = "";
  title = "";

  protected async downloadFile(trigger: () => Promise<void>) {
    let filepath: string;

    try {
      const event = this.page.waitForEvent("download");
      await trigger();

      const download = await event;
      const suggestedFilename = download.suggestedFilename();

      const { downloadsDir } = global.world.config;
      filepath = path.join(downloadsDir, suggestedFilename);

      await download.saveAs(filepath);
    } catch (e) {
      throw new Error(`Unable to download file: ${e}`);
    }

    await this.page.expect().fileExists(filepath).poll();
  }
}
