import path from "path";
import fs from "fs";

import { expect } from "@playwright/test";
import { PageObject, Config } from "@iamkenos/kyoko";

import type { Parameters } from "./base.steps";

export class BasePage extends PageObject<Parameters> {
  protected config: Config = global.world.config;

  url = "";
  title = "";

  // temporary hacks start ----------------------
  protected async poll(condition: (() => Promise<boolean>), action?: (() => Promise<any>)) {
    try {
      await expect.poll(async() => {
        action !== undefined && await action();
        return await condition();
      }, { intervals: [250], timeout: 25000 + 250 }).toBe(true);
    } catch (e) {
      throw new Error(`Polling exception: ${e}`);
    }
  }

  protected async clickUntil(locator: any, condition: (() => Promise<boolean>)) {
    const fn = async() => await locator.click();
    await this.poll(condition, fn);
  }

  protected async navigateUrl(url: string) {
    await this.page.goto(url as string, { waitUntil: "domcontentloaded" });
  }

  protected async downloadFile(trigger: (() => Promise<void>), newFilename?: string) {
    let filename: string, filepath: string;

    try {
      const event = this.page.waitForEvent("download", { timeout: 120000 });
      await trigger();

      const download = await event;
      filename = newFilename || download.suggestedFilename();
      filepath = path.join(this.config.downloadsDir, filename);

      await download.saveAs(filepath);
    } catch (e) {
      throw new Error(`Unable to download file: ${e}`);
    }

    const condition = async () => fs.existsSync(filepath);
    await this.poll(condition);
    return { filename, filepath };
  }
  // temporary hacks end ----------------------
}
